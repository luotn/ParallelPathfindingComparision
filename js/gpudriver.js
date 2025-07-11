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

// All texture used by gpu render have to be resized to a square with size TEXTURE_SIZE * TEXTURE_SIZE.
const TEXTURE_SIZE = 256
// Use minimal webgpu requirement of 8192 x 8192
const defaultMaxTextureDimension2D = 8192
let ATLAS_COLS
let ATLAS_ROWS
let textureAtlas
let sampler

const MATERIAL_MAP = [
    { state: STATE.START, img: "emoji-sunglasses-fill" },
    { state: STATE.TARGET, img: "door-closed" },
    { state: STATE.OBSTACLE, img: "x-square-fill" },
]

// Visited Score: any value > 0
let CELLSTATE

async function init() {
    await initGPU(CANVASDOMID)

    const size_x = 8
    const size_y = 6
    CELLSTATE = new Int32Array([
        -1, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, -3, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, -2,
    ])

    if (GPUAVALIABLE == true) {
        await createTextureAtlas();
        GPUDraw(size_x, size_y)
    } else if (GPUAVALIABLE == false) {
        DOMDraw()
    } else {
        alert("Error while initialising render engine!")
    }
}

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
                format: CANVASFORMAT,
                alphaMode: 'premultiplied',
            })
            GPUAVALIABLE = true
        }
    }
}

async function createTextureAtlas() {
    // Load all icons, supports svg, png, etc.
    const materialImages = await Promise.all(
        Object.values(MATERIAL_MAP).map(material =>
            loadSVG(`../icons/${material.img}.svg`)
        )
    )

    // Calculate texture canvas(atlas) columns and rows
    let size1d = TEXTURE_SIZE * materialImages.length

    ATLAS_ROWS = Math.floor(size1d / defaultMaxTextureDimension2D) + 1

    ATLAS_COLS = size1d >= defaultMaxTextureDimension2D ? Math.floor(defaultMaxTextureDimension2D / TEXTURE_SIZE) : materialImages.length

    console.log(`Texture canvas col:${ATLAS_COLS}, row:${ATLAS_ROWS}`)

    const textureCanvas = new OffscreenCanvas(TEXTURE_SIZE * ATLAS_COLS, TEXTURE_SIZE * ATLAS_ROWS);

    // @DEBUG View content of off screen canvas
    // const textureCanvas = document.createElement('canvas')
    // textureCanvas.width = TEXTURE_SIZE * ATLAS_COLS;
    // textureCanvas.height = TEXTURE_SIZE * ATLAS_ROWS;

    const ctx = textureCanvas.getContext('2d')

    // 填充透明背景
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, textureCanvas.width, textureCanvas.height);

    for (let i = 0; i < materialImages.length; i++) {
        const x = i % ATLAS_COLS * TEXTURE_SIZE;
        const y = (Math.floor(i / ATLAS_COLS)) * TEXTURE_SIZE;
        ctx.drawImage(materialImages[i], x, y)
    }

    // @DEBUG Continued: View content of off screen canvas
    // document.body.appendChild(textureCanvas)

    // 转换为ImageBitmap
    const imageBitmap = await createImageBitmap(textureCanvas);

    // 创建WebGPU纹理
    textureAtlas = GPUDEVICE.createTexture({
        size: [textureCanvas.width, textureCanvas.height],
        format: 'rgba8unorm',
        usage: GPUTextureUsage.TEXTURE_BINDING |
            GPUTextureUsage.COPY_DST |
            GPUTextureUsage.RENDER_ATTACHMENT
    });

    // 复制图像数据到纹理
    GPUDEVICE.queue.copyExternalImageToTexture(
        { source: imageBitmap },
        { texture: textureAtlas },
        [textureCanvas.width, textureCanvas.height]
    );

    // 创建采样器
    sampler = GPUDEVICE.createSampler({
        magFilter: 'linear',
        minFilter: 'linear'
    });
}

function GPUDraw(size_x, size_y) {
    console.log("Using GPU render...")

    // 1. Create arrays and format data for buffers
    const cellVertices = new Float32Array([
        // X,    Y,    U,   V
        -0.8, -0.8, 0.0, 0.0,
        0.8, -0.8, 1.0, 0.0,
        0.8, 0.8, 1.0, 1.0,

        -0.8, -0.8, 0.0, 0.0,
        0.8, 0.8, 1.0, 1.0,
        -0.8, 0.8, 0.0, 1.0
    ])

    const cellPositionArray = new Float32Array([size_x, size_y])

    // 2. Create buffers and buffer layouts
    const cellVertexBuffer = GPUDEVICE.createBuffer({
        label: "Cell vertices",
        size: cellVertices.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    })

    const cellVertexBufferLayout = {
        arrayStride: 16, // 4个float * 4字节
        attributes: [
            {
                format: "float32x2",
                offset: 0,
                shaderLocation: 0 // 位置
            },
            {
                format: "float32x2",
                offset: 8,
                shaderLocation: 1 // 纹理坐标
            }
        ]
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
        @group(0) @binding(2) var texSampler: sampler;
        @group(0) @binding(3) var textureAtlas: texture_2d<f32>;
        
        struct VertexOutput {
            @builtin(position) position: vec4f,
            @location(0) @interpolate(flat) instanceIndex: u32,
            @location(1) texCoord: vec2f
        }
        
        @vertex
        fn vertexMain(
            @location(0) pos: vec2f,
            @location(1) uv: vec2f,
            @builtin(instance_index) instance: u32
        ) -> VertexOutput {
            let i = f32(instance);
            let cell = vec2f(i % grid.x, floor(i / grid.x));
            let cellOffset = cell / grid * 2;
            let gridPos = (pos + 1) / grid - 1 + cellOffset;
            
            var output: VertexOutput;
            output.position = vec4f(gridPos, 0, 1);
            output.instanceIndex = instance;
            output.texCoord = uv;
            return output;
        }
        
        fn stateToAtlasUV(state: i32) -> vec2f {
            // 映射状态到图集位置
            var index = 0u;
            if (state == ${STATE.START}) { index = 0u; }
            else if (state == ${STATE.TARGET}) { index = 1u; }
            else if (state == ${STATE.OBSTACLE}) { index = 2u; }
            else { return vec2f(-1); } // 非特殊状态返回无效坐标
            
            // 计算纹理坐标 (0-1范围)
            let atlasSize = vec2f(${TEXTURE_SIZE * ATLAS_COLS}.0, ${TEXTURE_SIZE * ATLAS_ROWS}.0);
            let iconSize = vec2f(${TEXTURE_SIZE}.0);
            
            let col = index % ${ATLAS_COLS}u;
            let row = index / ${ATLAS_COLS}u;
            
            let uvOffset = vec2f(f32(col) * iconSize.x / atlasSize.x,
                                f32(row) * iconSize.y / atlasSize.y);
            
            return uvOffset;
        }
        
        @fragment
        fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
            let state = cellStates[input.instanceIndex];
            
            // 特殊状态：使用纹理
            let atlasUV = stateToAtlasUV(state);
            
            // 总是进行纹理采样，但在非特殊状态时忽略结果
            let iconUV = vec2f(
                atlasUV.x + input.texCoord.x / ${ATLAS_COLS}.0,
                atlasUV.y + (1.0 - input.texCoord.y) / ${ATLAS_ROWS}.0
            );
            let sampledColor = textureSample(textureAtlas, texSampler, iconUV);
            
            // 现在可以安全地使用条件分支
            if (atlasUV.x >= 0.0) {
                return sampledColor;
            }
            
            // 普通状态：使用纯色
            if (state == ${STATE.EMPTY}) {
                return vec4f(0.5, 0.5, 0.5, 1.0);
            }
            return vec4f(0.5, 0.0, 0.5, 1.0); // 未知状态
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
        entries: [
            { binding: 0, resource: { buffer: cellPositionBuffer } },
            { binding: 1, resource: { buffer: stateBuffer } },
            { binding: 2, resource: sampler },
            { binding: 3, resource: textureAtlas.createView() }
        ]
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
    pass.draw(6, size_x * size_y)

    pass.end()

    const commandBuffer = encoder.finish()

    // 8. Submit render command
    GPUDEVICE.queue.submit([commandBuffer])
}

function DOMDraw() {
    console.log("Using CPU render!!!")
}

async function updateCellState(index, newState) {
    CELLSTATE[index] = newState;
    GPUDEVICE.queue.writeBuffer(
        stateBuffer,
        index * Int32Array.BYTES_PER_ELEMENT,
        new Int32Array([newState])
    )
}

async function loadSVG(url) {
    const img = new Image()
    img.src = url
    await img.decode()
    return createImageBitmap(img)
}