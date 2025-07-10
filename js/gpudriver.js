let GPUAVALIABLE
let GPUDEVICE
let CANVASCONTEXT
let CANVASFORMAT
const SIZE_X = 8
const SIZE_Y = 6
const BACKGROUNDCOLOR = {r: 0.8, g: 0.8, b: 0.8, a: 1}

async function initGPU() {
    if (!navigator.gpu) {
        alert("WebGPU not supported in this browser!\nPerformance will be drastically reduced!\nPlease use Chrome/Edge 113+, Safari Technology Preview, Opera 99+, Chrome for Android 138+, Samsung Internet 24+, Opera Mobile 80+ or enable WebGPU flag on Safari or Firefox.\nUsing default DOM rendering...")
        GPUAVALIABLE = false
    } else {
        const adapter = await navigator.gpu.requestAdapter()
        if (!adapter) {
            alert("Your GPU does not support the full functionality of WebGPU!\nPerformance will be drastically reduced!\nUsing default DOM rendering...")
        } else {
            GPUDEVICE = await adapter.requestDevice()
            const canvas = document.getElementById("grid-canvas")
            CANVASCONTEXT = canvas.getContext("webgpu")
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
    await initGPU()

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

    // Create square
    const vertices = new Float32Array([
        //   X,    Y,
        -0.8, -0.8, // Triangle 1 (Blue)
        0.8, -0.8,
        0.8, 0.8,

        -0.8, -0.8, // Triangle 2 (Red)
        0.8, 0.8,
        -0.8, 0.8,
    ])

    const vertexBuffer = GPUDEVICE.createBuffer({
        label: "Cell vertices",
        size: vertices.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    })

    GPUDEVICE.queue.writeBuffer(vertexBuffer, /*bufferOffset=*/0, vertices)

    const vertexBufferLayout = {
        arrayStride: 8,
        attributes: [{
            format: "float32x2",
            offset: 0,
            shaderLocation: 0, // Position, see vertex shader
        }],
    }

    const cellShaderModule = GPUDEVICE.createShaderModule({
        label: "Cell shader",
        code: `
            @group(0) @binding(0) var<uniform> grid: vec2f;

            @vertex
            fn vertexMain(@location(0) pos: vec2f,
                        @builtin(instance_index) instance: u32) ->
                        @builtin(position) vec4f {

                let i = f32(instance);
                // Compute the cell coordinate from the instance_index
                let cell = vec2f(i % grid.x, floor(i / grid.x));

                let cellOffset = cell / grid * 2;
                let gridPos = (pos + 1) / grid - 1 + cellOffset;

                return vec4f(gridPos, 0, 1);
            }

            @fragment
            fn fragmentMain() -> @location(0) vec4f {
                return vec4f(1, 0, 0, 1);
            }
        `
    })

    const cellPipeline = GPUDEVICE.createRenderPipeline({
        label: "Cell pipeline",
        layout: "auto",
        vertex: {
            module: cellShaderModule,
            entryPoint: "vertexMain",
            buffers: [vertexBufferLayout]
        },
        fragment: {
            module: cellShaderModule,
            entryPoint: "fragmentMain",
            targets: [{
                format: CANVASFORMAT
            }]
        }
    })

    // Create group of squares
    const uniformArray = new Float32Array([size_x, size_y])
    const uniformBuffer = GPUDEVICE.createBuffer({
        label: "Grid Uniforms",
        size: uniformArray.byteLength,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })
    GPUDEVICE.queue.writeBuffer(uniformBuffer, 0, uniformArray)

    const bindGroup = GPUDEVICE.createBindGroup({
        label: "Cell renderer bind group",
        layout: cellPipeline.getBindGroupLayout(0),
        entries: [{
            binding: 0,
            resource: { buffer: uniformBuffer }
        }],
    })

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
    pass.setVertexBuffer(0, vertexBuffer)
    pass.setBindGroup(0, bindGroup)
    pass.draw(vertices.length / 2, size_x * size_y)

    pass.end()

    const commandBuffer = encoder.finish()

    GPUDEVICE.queue.submit([commandBuffer])
}

function DOMDraw() {
    console.log("Using CPU render!!!")
}