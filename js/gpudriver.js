class GPUDriver {
    constructor(targetDOMElement) {
        this.GPUAVALIABLE = false
        this.GPUDEVICE
        this.CANVASCONTEXT
        this.CANVASFORMAT
        this.targetDOMElement = targetDOMElement
        this.BACKGROUNDCOLOR = {r: 0.9, g: 0.9, b: 0.9, a: 1}
        this.CELLCOLOR = `0.5, 0.5, 0.5, 1` //Red, Green, Blue, Alpha
        this.STATE = {
            EMPTY: 0,
            START: -1,
            TARGET: -2,
            OBSTACLE: -3
        }
        // Visited Score: any value > 0
        this.CELLSTATE
        // All texture used by gpu render have to be resized to a square with size TEXTURE_SIZE * TEXTURE_SIZE.
        this.TEXTURE_SIZE = 256
        // Use minimal webgpu requirement of 8192 x 8192
        this.defaultMaxTextureDimension2D = 8192
        this.ATLAS_COLS
        this.ATLAS_ROWS
        this.textureAtlas
        this.sampler
        this.MATERIAL_MAP = [
            {state: this.STATE.START, img: "emoji-sunglasses-fill"},
            {state: this.STATE.TARGET, img: "door-closed"},
            {state: this.STATE.OBSTACLE, img: "x-square"},
        ]
    }

    async init() {
        if (navigator.gpu) {
            const adapter = await navigator.gpu.requestAdapter()
            if (adapter) {
                this.GPUDEVICE = await adapter.requestDevice()
                this.CANVASCONTEXT = document.getElementById(this.targetDOMElement).getContext("webgpu")
                this.CANVASFORMAT = navigator.gpu.getPreferredCanvasFormat()
                this.CANVASCONTEXT.configure({
                    device: this.GPUDEVICE,
                    format: this.CANVASFORMAT,
                    alphaMode: 'premultiplied',
                })
                this.GPUAVALIABLE = true
            }
        }
    }

    // This implementation uses atlas/tile map to save texture
    async createTextureAtlas() {
        // Load all icons, supports svg, png, etc.
        const materialImages = await Promise.all(
            Object.values(this.MATERIAL_MAP).map(material =>
                this.loadSVG(`./icons/${material.img}.svg`)
            )
        )

        // Calculate texture canvas(atlas) columns and rows
        let size1d = this.TEXTURE_SIZE * materialImages.length

        this.ATLAS_ROWS = Math.floor(size1d / this.defaultMaxTextureDimension2D) + 1

        this.ATLAS_COLS = size1d >= this.defaultMaxTextureDimension2D ? Math.floor(this.defaultMaxTextureDimension2D / this.TEXTURE_SIZE) : materialImages.length

        const textureCanvas = new OffscreenCanvas(this.TEXTURE_SIZE * this.ATLAS_COLS, this.TEXTURE_SIZE * this.ATLAS_ROWS)

        // @DEBUG View content of off screen canvas
        // const textureCanvas = document.createElement('canvas')
        // textureCanvas.width = this.TEXTURE_SIZE * this.ATLAS_COLS;
        // textureCanvas.height = this.TEXTURE_SIZE * this.ATLAS_ROWS;

        const ctx = textureCanvas.getContext('2d')

        // Fill tranparent background
        ctx.fillStyle = 'rgba(0,0,0,0)'
        ctx.fillRect(0, 0, textureCanvas.width, textureCanvas.height)

        for (let i = 0; i < materialImages.length; i++) {
            const x = i % this.ATLAS_COLS * this.TEXTURE_SIZE
            const y = (Math.floor(i / this.ATLAS_COLS)) * this.TEXTURE_SIZE
            ctx.drawImage(materialImages[i], x, y)
        }

        // @DEBUG Continued: View content of off screen canvas
        // document.body.appendChild(textureCanvas)

        // Convert canvas to bitmap
        const imageBitmap = await createImageBitmap(textureCanvas)

        // Create GPU texture
        this.textureAtlas = this.GPUDEVICE.createTexture({
            size: [textureCanvas.width, textureCanvas.height],
            format: 'rgba8unorm',
            usage: GPUTextureUsage.TEXTURE_BINDING |
                GPUTextureUsage.COPY_DST |
                GPUTextureUsage.RENDER_ATTACHMENT
        })

        // Copy bitmap to texture buffer on gpu
        this.GPUDEVICE.queue.copyExternalImageToTexture(
            {source: imageBitmap},
            {texture: this.textureAtlas},
            [textureCanvas.width, textureCanvas.height]
        )

        // Create sampler
        this.sampler = this.GPUDEVICE.createSampler({
            magFilter: 'linear',
            minFilter: 'linear'
        })
    }

    GPUDraw(size_x, size_y) {
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
        const cellVertexBuffer = this.GPUDEVICE.createBuffer({
            label: "Cell vertices",
            size: cellVertices.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        })

        const cellVertexBufferLayout = {
            arrayStride: 16, // 4 floats, 4 byte/float
            attributes: [
                {
                    format: "float32x2",
                    offset: 0,
                    shaderLocation: 0 // position
                },
                {
                    format: "float32x2",
                    offset: 8,
                    shaderLocation: 1 // Texture uv
                }
            ]
        }

        const cellPositionBuffer = this.GPUDEVICE.createBuffer({
            label: "Grid Uniforms",
            size: cellPositionArray.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        })

        const stateBuffer = this.GPUDEVICE.createBuffer({
            label: "Cell states buffer",
            size: CELLSTATE.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        })

        // 3. Write to buffers
        this.GPUDEVICE.queue.writeBuffer(cellVertexBuffer, 0, cellVertices)

        this.GPUDEVICE.queue.writeBuffer(cellPositionBuffer, 0, cellPositionArray)

        this.GPUDEVICE.queue.writeBuffer(stateBuffer, 0, CELLSTATE)

        // 4. Create shader module
        const cellShaderModule = this.GPUDEVICE.createShaderModule({
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
            // Project state to uv positions
            var index = 0u;
            if (state == ${this.STATE.START}) {index = 0u;}
            else if (state == ${this.STATE.TARGET}) {index = 1u;}
            else if (state == ${this.STATE.OBSTACLE}) {index = 2u;}
            // Return invalid position if not using texture
            else {return vec2f(-1);} 
            
            // Calculate texture position (range: 0 - 1)
            let atlasSize = vec2f(${this.TEXTURE_SIZE * this.ATLAS_COLS}.0, ${this.TEXTURE_SIZE * this.ATLAS_ROWS}.0);
            let iconSize = vec2f(${this.TEXTURE_SIZE}.0);
            
            let col = index % ${this.ATLAS_COLS}u;
            let row = index / ${this.ATLAS_COLS}u;
            
            let uvOffset = vec2f(f32(col) * iconSize.x / atlasSize.x,
                                f32(row) * iconSize.y / atlasSize.y);
            
            return uvOffset;
        }
        
        @fragment
        fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
            let state = cellStates[input.instanceIndex];
            
            // Use texture if cell in special state, not empty
            let atlasUV = stateToAtlasUV(state);
            
            // Always sample texture, ignore result if empty
            let iconUV = vec2f(
                atlasUV.x + input.texCoord.x / ${this.ATLAS_COLS}.0,
                atlasUV.y + (1.0 - input.texCoord.y) / ${this.ATLAS_ROWS}.0
            );
            let sampledColor = textureSample(textureAtlas, texSampler, iconUV);
            
            if (atlasUV.x >= 0.0) {
                return sampledColor;
            }
            
            // Use full color if empty
            if (state == ${this.STATE.EMPTY}) {
                return vec4f(0.5, 0.5, 0.5, 1.0);
            }
            
            // Use purple as fallback
            return vec4f(0.5, 0.0, 0.5, 1.0);
        }
        `
        })

        // 5. Create pipeline
        const cellPipeline = this.GPUDEVICE.createRenderPipeline({
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
                    format: this.CANVASFORMAT
                }]
            }
        })

        // 6. Assign bind groups
        const cellPosBindGroup = this.GPUDEVICE.createBindGroup({
            label: "Cell renderer bind group",
            layout: cellPipeline.getBindGroupLayout(0),
            entries: [
                {binding: 0, resource: {buffer: cellPositionBuffer}},
                {binding: 1, resource: {buffer: stateBuffer}},
                {binding: 2, resource: this.sampler},
                {binding: 3, resource: this.textureAtlas.createView()}
            ]
        })

        // 7. Create encoder and set encoder parameters
        const encoder = this.GPUDEVICE.createCommandEncoder()
        const pass = encoder.beginRenderPass({
            colorAttachments: [{
                view: this.CANVASCONTEXT.getCurrentTexture().createView(),
                loadOp: "clear",
                clearValue: this.BACKGROUNDCOLOR,
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
        this.GPUDEVICE.queue.submit([commandBuffer])
    }

    updateCellState(index, newState) {
        this.CELLSTATE[index] = newState;
        this.GPUDEVICE.queue.writeBuffer(
            stateBuffer,
            index * Int32Array.BYTES_PER_ELEMENT,
            new Int32Array([newState])
        )
    }

    async loadSVG(url) {
        const img = new Image()
        img.src = url
        await img.decode()
        return createImageBitmap(img)
    }
}

async function initWebGPU() {
    let gpuDriver = new GPUDriver("grid-canvas")
    await gpuDriver.init()

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

    if (gpuDriver.GPUAVALIABLE == true) {
        await gpuDriver.createTextureAtlas()
        gpuDriver.GPUDraw(size_x, size_y)
    } else if (gpuDriver.GPUAVALIABLE == false) {
        console.log("Using CPU render!!!")
    } else {
        alert("Error while initialising render engine!")
    }
}