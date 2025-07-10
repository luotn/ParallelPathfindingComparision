let GPUAVALIABLE
let GPUDEVICE
let CANVASCONTEXT
let CANVASFORMAT
const CANVASDOMID = "grid-canvas"
const BACKGROUNDCOLOR = { r: 0.9, g: 0.9, b: 0.9, a: 1 }
const CELLCOLOR = `0.5, 0.5, 0.5, 1` //Red, Green, Blue, Alpha
const STATE = {
    EMPTY: 0,
    START: -1,
    TARGET: -2,
    OBSTACLE: -3
}

// Example is 8 * 6 grid
// Visited Score: any value > 0
let CELLSTATE = new Int32Array([
    -1, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, -3, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, -2,
])

async function initGPU(canvasDomID) {
    if (!navigator.gpu) {
        alert("WebGPU not supported in this browser!\nPerformance will be drastically reduced!\nPlease use Chrome/Edge 113+, Safari Technology Preview, Opera 99+, Chrome for Android 138+, Samsung Internet 24+, Opera Mobile 80+ or enable WebGPU flag on Safari or Firefox.\nUsing default DOM rendering...")
        GPUAVALIABLE = false
    } else {
        const adapter = await navigator.gpu.requestAdapter()
        if (!adapter) {
            alert("Your GPU does not support the full functionality of WebGPU!\nPerformance will be drastically reduced!\nUsing default DOM rendering...")
        } else {
            GPUDEVICE = await adapter.requestDevice()
            CANVASCONTEXT = document.getElementById(canvasDomID).getContext("webgpu")
            CANVASFORMAT = navigator.gpu.getPreferredCanvasFormat()
            CANVASCONTEXT.configure({
                device: GPUDEVICE,
                format: CANVASFORMAT
            })
            GPUAVALIABLE = true
        }
    }
}

async function init() {
    await initGPU(CANVASDOMID)

    const size_x = 8
    const size_y = 6

    if (GPUAVALIABLE == true) {
        GPUDraw(size_x, size_y)
    } else if (GPUAVALIABLE == false) {
        DOMDraw()
    } else {
        alert("Error while initialising render engine!")
    }
}

function GPUDraw(size_x, size_y) {
    console.log("Using GPU render...")

    // 1. Create arrays and format data for buffers
    const totalCells = size_x * size_y

    const cellVertices = new Float32Array([
        //   X,    Y,
        -0.8, -0.8, // Triangle 1 (Top left)
        0.8, -0.8,
        0.8, 0.8,

        -0.8, -0.8, // Triangle 2 (Bottom right)
        0.8, 0.8,
        -0.8, 0.8,
    ])

    const cellPositionArray = new Float32Array([size_x, size_y])

    // 2. Create buffers and buffer layouts
    const cellVertexBuffer = GPUDEVICE.createBuffer({
        label: "Cell vertices",
        size: cellVertices.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    })

    const cellVertexBufferLayout = {
        arrayStride: 8,
        attributes: [{
            format: "float32x2",
            offset: 0,
            shaderLocation: 0, // Position, see vertex shader
        }],
    }

    const cellPositionBuffer = GPUDEVICE.createBuffer({
        label: "Grid Uniforms",
        size: cellPositionArray.byteLength,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })

    const stateBuffer = GPUDEVICE.createBuffer({
        label: "Cell states buffer",
        size: CELLSTATE.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    })

    // 3. Write to buffers
    GPUDEVICE.queue.writeBuffer(cellVertexBuffer, /*bufferOffset=*/0, cellVertices)

    GPUDEVICE.queue.writeBuffer(cellPositionBuffer, 0, cellPositionArray)

    GPUDEVICE.queue.writeBuffer(stateBuffer, 0, CELLSTATE)

    // 4. Create shader module
    const cellShaderModule = GPUDEVICE.createShaderModule({
        label: "Cell shader",
        code: `
            @group(0) @binding(0) var<uniform> grid: vec2f;
            @group(0) @binding(1) var<storage, read> cellStates: array<i32>;
            
            struct VertexOutput {
                @builtin(position) position: vec4f,
                // Google Chrome enforces: @interpolate(flat)
                @location(0) @interpolate(flat) instanceIndex: u32,
            }
            
            @vertex
            fn vertexMain(
                @location(0) pos: vec2f,
                @builtin(instance_index) instance: u32
            ) -> VertexOutput {
                let i = f32(instance);
                let cell = vec2f(i % grid.x, floor(i / grid.x));
                let cellOffset = cell / grid * 2;
                let gridPos = (pos + 1) / grid - 1 + cellOffset;
                
                var output: VertexOutput;
                output.position = vec4f(gridPos, 0, 1);
                output.instanceIndex = instance;
                return output;
            }
            
            fn stateToColor(state: i32) -> vec4f {
                if (state == ${STATE.START}) {
                    return vec4f(1.0, 0.0, 0.0, 1.0);
                }
                else if (state == ${STATE.TARGET}) {
                    return vec4f(0.0, 1.0, 0.0, 1.0);
                }
                else if (state == ${STATE.OBSTACLE}) {
                    return vec4f(0.0, 0.0, 0.0, 1.0);
                }
                else if (state == ${STATE.EMPTY}) {
                    return vec4f(0.5, 0.5, 0.5, 1.0);
                }
                return vec4f(0.5, 0.0, 0.5, 1.0);
            }
            
            @fragment
            fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
                let state = cellStates[input.instanceIndex];
                return stateToColor(state);
            }
        `
    })

    // 5. Create pipeline
    const cellPipeline = GPUDEVICE.createRenderPipeline({
        label: "Cell pipeline",
        layout: "auto",
        vertex: {
            module: cellShaderModule,
            entryPoint: "vertexMain",
            buffers: [cellVertexBufferLayout]
        },
        fragment: {
            module: cellShaderModule,
            entryPoint: "fragmentMain",
            targets: [{
                format: CANVASFORMAT
            }]
        }
    })

    // 6. Assign bind groups
    const cellPosBindGroup = GPUDEVICE.createBindGroup({
        label: "Cell renderer bind group",
        layout: cellPipeline.getBindGroupLayout(0),
        entries: [{
            binding: 0,
            resource: {buffer: cellPositionBuffer}
        },
        {
            binding: 1,
            resource: {buffer: stateBuffer}
        }],
    })

    // 7. Create encoder and set encoder parameters
    const encoder = GPUDEVICE.createCommandEncoder()
    const pass = encoder.beginRenderPass({
        colorAttachments: [{
            view: CANVASCONTEXT.getCurrentTexture().createView(),
            loadOp: "clear",
            clearValue: BACKGROUNDCOLOR,
            storeOp: "store",
        }]
    })

    pass.setPipeline(cellPipeline)
    pass.setVertexBuffer(0, cellVertexBuffer)
    pass.setBindGroup(0, cellPosBindGroup)
    pass.draw(cellVertices.length / 2, size_x * size_y)

    pass.end()

    const commandBuffer = encoder.finish()

    // 8. Submit render command
    GPUDEVICE.queue.submit([commandBuffer])
}

function DOMDraw() {
    console.log("Using CPU render!!!")
}

function updateCellState(index, newState) {
    CELLSTATE = new Int32Array([newState])
    GPUDEVICE.queue.writeBuffer(stateBuffer, index * Int32Array.BYTES_PER_ELEMENT, CELLSTATE)
}