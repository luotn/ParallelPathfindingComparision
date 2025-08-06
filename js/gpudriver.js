class GPUDriver {
    constructor(grid, algorithms, stepHistory, queueHistory, targetDOMElement) {
        this.Grid = grid
        this.Algorithms = algorithms
        this.StepHistory = stepHistory
        this.DOMElementRoot = targetDOMElement
        this.QueueHistory = queueHistory

        this.GPUDEVICE
        this.CANVASFORMAT
        this.CellPipeline
        this.CellVertexBuffer
        this.BACKGROUNDCOLOR = {r: 0.9, g: 0.9, b: 0.9, a: 1}
        this.CELLCOLOR = `0.5, 0.5, 0.5, 1` //Red, Green, Blue, Alpha
        this.STATE = {
            EMPTY: 0,
            START: 1,
            TARGET: 2,
            OBSTACLE: 3,
            PATH_UP: 4,
            PATH_DOWN: 5,
            PATH_LEFT: 6,
            PATH_RIGHT: 7,
            VISITED: 8,
            TARGET_REACHED: 9,
            IN_QUEUE: 10,
            SEARCHING: 11,
        }
        this.CELLSTATES = this.Grid.toCellState(this.STATE)
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
            {state: this.STATE.PATH_UP, img: "arrow-up-square-fill"},
            {state: this.STATE.PATH_DOWN, img: "arrow-down-square-fill"},
            {state: this.STATE.PATH_LEFT, img: "arrow-left-square-fill"},
            {state: this.STATE.PATH_RIGHT, img: "arrow-right-square-fill"},
            {state: this.STATE.VISITED, img: "square-fill"},
            {state: this.STATE.TARGET_REACHED, img: "door-open-fill"},
            {state: this.STATE.IN_QUEUE, img: "square-fill"},
            {state: this.STATE.SEARCHING, img: "square-fill-orange"},
            {state: 0, img: "0"},
            {state: 1, img: "1"},
            {state: 2, img: "2"},
            {state: 3, img: "3"},
            {state: 4, img: "4"},
            {state: 5, img: "5"},
            {state: 6, img: "6"},
            {state: 7, img: "7"},
            {state: 8, img: "8"},
            {state: 9, img: "9"},
        ]
        this.cellSize = 30

        // Caculate canvas size
        this.canvaswidth = this.Grid.width * this.cellSize
        // Safe distance to right edge defaults to 20
        let canvasDOMWidth = document.getElementById(this.DOMElementRoot).offsetWidth - 10
        // @TODO Add grid size limit to editor: webgpu default draw limit 8192 / smallest cell size 10 = 819 which is 670,761 cells
        if (this.canvaswidth > canvasDOMWidth) {
            this.cellSize = Math.floor(canvasDOMWidth / this.Grid.width)
            // 10 is a reasonable size to still make out the icons,
            // on a 1080p display it shows 158 cells without introducing scrolling.
            this.cellSize = this.cellSize < 10 ? 10 : this.cellSize
            this.canvaswidth = this.Grid.width * this.cellSize
        }
        this.canvasheight = this.Grid.height * this.cellSize
        this.CanvasSize = [
            this.canvaswidth,
            this.canvasheight,
        ]
        this.CANVASRESOURCES = {}
        for (const algorithm of this.Algorithms)
            this.CANVASRESOURCES[algorithm] = new CanvasResource(this.Grid.toCellState(this.STATE))
    }

    // This init is for async methods
    async init() {
        // Prepare dom elements
        let visualResult = `Using WebGPU to render maze...<br><br>`

        // Add dom elements for algorithms
        for (const algorithm of this.Algorithms) {
            // Statistics
            visualResult += `${algorithm}: ${this.StepHistory[algorithm].history.length} steps found path with length ${this.StepHistory[algorithm].steps.length - 1} in ${Math.round(this.StepHistory[algorithm].time)}ms.<br>`

            // Add grid canvases and init gpu drivers
            visualResult += `<canvas id="${algorithm}-canvas" width="${this.CanvasSize[0]}" height="${this.CanvasSize[1]}"></canvas><br><br>`
        }

        document.getElementById(this.DOMElementRoot).innerHTML = visualResult

        // Save canvas contexts
        for (const algorithm of this.Algorithms)
            this.CANVASRESOURCES[algorithm].CANVASCONTEXT = document.getElementById(`${algorithm}-canvas`).getContext("webgpu")

        // Init gpu
        if (navigator.gpu) {
            const adapter = await navigator.gpu.requestAdapter()
            if (adapter) {
                this.GPUDEVICE = await adapter.requestDevice()
                this.CANVASFORMAT = navigator.gpu.getPreferredCanvasFormat()

                for (const algorithm of this.Algorithms) {
                    this.CANVASRESOURCES[algorithm].CANVASCONTEXT.configure({
                        device: this.GPUDEVICE,
                        format: this.CANVASFORMAT,
                        alphaMode: 'premultiplied',
                    })
                }
            }
        }

        await this.createTextureAtlas()
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
        // textureCanvas.width = this.TEXTURE_SIZE * this.ATLAS_COLS
        // textureCanvas.height = this.TEXTURE_SIZE * this.ATLAS_ROWS

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
            minFilter: 'linear',
            addressModeU: 'clamp-to-edge',
            addressModeV: 'clamp-to-edge',
        })
    }

    // Draws grid in initial state
    drawGrid() {
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

        const cellPositionArray = new Float32Array([this.Grid.width, this.Grid.height])

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

        // 2. Create buffers and buffer layouts
        // Vertex buffer
        this.CellVertexBuffer = this.GPUDEVICE.createBuffer({
            label: "Cell vertices",
            size: cellVertices.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        })

        this.GPUDEVICE.queue.writeBuffer(this.CellVertexBuffer, 0, cellVertices)


        // Grid uniform buffer
        const cellPositionBuffer = this.GPUDEVICE.createBuffer({
            label: "Grid Uniforms",
            size: cellPositionArray.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        })

        this.GPUDEVICE.queue.writeBuffer(cellPositionBuffer, 0, cellPositionArray)

        // Cell state buffers and score buffers
        for (const algorithm of this.Algorithms) {
            this.CANVASRESOURCES[algorithm].CELLSTATEBUFFER = this.GPUDEVICE.createBuffer({
                label: `${algorithm} cell states buffer`,
                size: this.CANVASRESOURCES[algorithm].CELLSTATE.byteLength,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            })
            this.GPUDEVICE.queue.writeBuffer(this.CANVASRESOURCES[algorithm].CELLSTATEBUFFER, 0, this.CANVASRESOURCES[algorithm].CELLSTATE)

            this.CANVASRESOURCES[algorithm].SCOREBUFFER = this.GPUDEVICE.createBuffer({
                label: `${algorithm} score buffer`,
                size: this.CANVASRESOURCES[algorithm].SCORE.byteLength,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            })
            this.GPUDEVICE.queue.writeBuffer(this.CANVASRESOURCES[algorithm].SCOREBUFFER, 0, this.CANVASRESOURCES[algorithm].SCORE)
        }

        // 3. Create shader module
        const cellShaderModule = this.GPUDEVICE.createShaderModule({
            label: "Cell shader",
            code: `
                @group(0) @binding(0) var<uniform> grid: vec2f;
                @group(0) @binding(1) var<storage, read> cellStates: array<i32>;
                @group(0) @binding(2) var texSampler: sampler;
                @group(0) @binding(3) var textureAtlas: texture_2d<f32>;
                @group(0) @binding(4) var<storage, read> scores: array<i32>;
                
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
                    else if (state == ${this.STATE.PATH_UP}) {index = 3u;}
                    else if (state == ${this.STATE.PATH_DOWN}) {index = 4u;}
                    else if (state == ${this.STATE.PATH_LEFT}) {index = 5u;}
                    else if (state == ${this.STATE.PATH_RIGHT}) {index = 6u;}
                    else if (state == ${this.STATE.VISITED}) {index = 7u;}
                    else if (state == ${this.STATE.TARGET_REACHED}) {index = 8u;}
                    else if (state == ${this.STATE.IN_QUEUE}) {index = 9u;}
                    else if (state == ${this.STATE.SEARCHING}) {index = 10u;}
                    else {return vec2f(-1);}
                    
                    // Calculate texture position (range: 0 - 1)
                    let atlasSize = vec2f(${this.TEXTURE_SIZE * this.ATLAS_COLS}.0, ${this.TEXTURE_SIZE * this.ATLAS_ROWS}.0);
                    let iconSize = vec2f(${this.TEXTURE_SIZE}.0);
                    
                    let col = index % ${this.ATLAS_COLS}u;
                    let row = index / ${this.ATLAS_COLS}u;
                    
                    // UV offest
                    return vec2f(f32(col) * iconSize.x / atlasSize.x, f32(row) * iconSize.y / atlasSize.y);
                }

                fn drawDigit(digit: i32) -> vec2f {
                    if (digit < 0 || digit > 9) {return vec2f(-1);}
                    
                    // Calculate digit texture position in atlas
                    let digitIndex = 11u + u32(digit);
                    // Calculate texture position
                    let atlasSize = vec2f(${this.TEXTURE_SIZE * this.ATLAS_COLS}.0, ${this.TEXTURE_SIZE * this.ATLAS_ROWS}.0);
                    let iconSize = vec2f(${this.TEXTURE_SIZE}.0);
                    
                    let col = digitIndex % ${this.ATLAS_COLS}u;
                    let row = digitIndex / ${this.ATLAS_COLS}u;
                    
                    return vec2f(f32(col) * iconSize.x / atlasSize.x, f32(row) * iconSize.y / atlasSize.y);
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

                    // Draw score
                    if (state == ${this.STATE.IN_QUEUE} || state == ${this.STATE.SEARCHING}) {
                        let score = scores[input.instanceIndex];
                        // 1. Calculate number of digits
                        var numDigits = 1;
                        var temp = score;
                        if (temp > 0) {
                            numDigits = 0;
                            while (temp > 0) {
                                numDigits += 1;
                                temp /= 10;
                            }
                        }
                        
                        // 2. Calculate digit of current fragment
                        let digitWidth = 1.0 / f32(numDigits);
                        var digitIndex = i32(floor(input.texCoord.x / digitWidth));
                        digitIndex = clamp(digitIndex, 0, numDigits - 1);
                        
                        // 3. Caculate actual digit order (from left/high to right/low)
                        let digitPos = numDigits - 1 - digitIndex;
                        
                        // 4. Get digit of this position
                        var power = 1;
                        for (var i = 0; i < digitPos; i++) {
                            power *= 10;
                        }
                        let digit = (score / power) % 10;
                        
                        // 5. Calculate the internal UV of current digit
                        let segmentStart = f32(digitIndex) * digitWidth;
                        let localX = (input.texCoord.x - segmentStart) / digitWidth;
                        
                        // 6. Get the texture uv of digit
                        let digitUV = drawDigit(digit);
                        
                        // 7. Mix background color with digit color
                        let digitIconUV = vec2f(
                            digitUV.x + localX / ${this.ATLAS_COLS}.0,
                            digitUV.y + (1.0 - input.texCoord.y) / ${this.ATLAS_ROWS}.0
                        );
                        let digitColor = textureSampleLevel(textureAtlas, texSampler, digitIconUV, 0.0);
                        return mix(sampledColor, digitColor, digitColor.a);
                    }

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

        // 4. Create pipeline
        this.CellPipeline = this.GPUDEVICE.createRenderPipeline({
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

        // 5. Create bind groups
        for (const algorithm of this.Algorithms) {
            this.CANVASRESOURCES[algorithm].BINDGROUP = this.GPUDEVICE.createBindGroup({
                label: `${algorithm} cell renderer bind group`,
                layout: this.CellPipeline.getBindGroupLayout(0),
                entries: [
                    {binding: 0, resource: {buffer: cellPositionBuffer}},
                    {binding: 1, resource: {buffer: this.CANVASRESOURCES[algorithm].CELLSTATEBUFFER}},
                    {binding: 2, resource: this.sampler},
                    {binding: 3, resource: this.textureAtlas.createView()},
                    {binding: 4, resource: {buffer: this.CANVASRESOURCES[algorithm].SCOREBUFFER}}
                ]
            })
        }

        // 7. Create and set encoder then submit encoder to draw
        this.renderGrid()
    }

    // Update canvas
    renderGrid() {
        const encoder = this.GPUDEVICE.createCommandEncoder()
        for (const algorithm of this.Algorithms) {
            const pass = encoder.beginRenderPass({
                colorAttachments: [{
                    view: this.CANVASRESOURCES[algorithm].CANVASCONTEXT.getCurrentTexture().createView(),
                    loadOp: "clear",
                    clearValue: this.BACKGROUNDCOLOR,
                    storeOp: "store",
                }]
            })

            pass.setPipeline(this.CellPipeline)
            pass.setVertexBuffer(0, this.CellVertexBuffer)
            pass.setBindGroup(0, this.CANVASRESOURCES[algorithm].BINDGROUP)
            pass.draw(6, this.Grid.width * this.Grid.height)

            pass.end()
        }

        const commandBuffer = encoder.finish()

        this.GPUDEVICE.queue.submit([commandBuffer])
    }

    // @NOTE When directly calling createImageBitmap right after img.decode:
    // Safari does NOT correctly size the image, so additional canvas is required.
    async loadSVG(url) {
        const img = new Image()
        img.src = url
        await img.decode()

        const canvas = new OffscreenCanvas(this.TEXTURE_SIZE, this.TEXTURE_SIZE)
        const ctx = canvas.getContext('2d')

        ctx.drawImage(img, 0, 0, this.TEXTURE_SIZE, this.TEXTURE_SIZE)

        return await createImageBitmap(canvas)
    }

    async getGPUAvaliablity() {
        if (navigator.gpu) {
            if (await navigator.gpu.requestAdapter())
                return true
        }
        return false
    }

    getMousePosition(mouseX, mouseY) {
        return [Math.floor(mouseX / this.cellSize), Math.floor(mouseY / this.cellSize)]
    }

    // Render the current step
    updateVisuals(currentStep, lastRenderedStep) {
        this.updateCellState(currentStep, lastRenderedStep)

        // Write cell states to cell state buffers
        for (const algorithm of this.Algorithms) {
            this.GPUDEVICE.queue.writeBuffer(
                this.CANVASRESOURCES[algorithm].CELLSTATEBUFFER,
                0,
                this.CANVASRESOURCES[algorithm].CELLSTATE
            )

            this.GPUDEVICE.queue.writeBuffer(
                this.CANVASRESOURCES[algorithm].SCOREBUFFER,
                0,
                this.CANVASRESOURCES[algorithm].SCORE
            )
        }

        this.renderGrid()
        return currentStep
    }

    // Update cell state from history objects
    updateCellState(currentStep, lastRenderedStep) {
        for (const algorithm of this.Algorithms) {
            const {history, steps, directions} = this.StepHistory[algorithm]
            const algorithmSteps = history.length

            // Show which cell is being searched and which cells are in the queue/stack
            // searchingStep of -1 will skip the update
            const searchingStep = currentStep <= algorithmSteps ? currentStep : -1
            if (searchingStep != -1 && currentStep < algorithmSteps) {
                // Reset cell state to initial state
                this.CANVASRESOURCES[algorithm].CELLSTATE = this.Grid.toCellState(this.STATE)

                // Calculate and update searching cell in cell state
                const [searchingX, searchingY] = Object.keys(history[searchingStep])[0].split("-").map(function (item) {
                    return parseInt(item)
                })

                // Calculate and update cells algorithm checked
                let cells = []
                for (let i = 0; i < searchingStep; i++) {
                    cells.push(Object.values(history[i]).flat())
                }
                cells = cells.flat()
                for (let i = 0; i < cells.length; i++) {
                    this.CANVASRESOURCES[algorithm].CELLSTATE[this.toCellStateIndex(cells[i][0], cells[i][1])] = this.STATE.VISITED
                }

                // Update score
                // Reset score stored
                this.CANVASRESOURCES[algorithm].SCORE = new Int32Array(this.Grid.data.length).fill(-1)

                const currentStepQueue = this.QueueHistory[algorithm][searchingStep]
                const formattedCurrentStepQueue = []

                // Queue might be array or objects, convert array into objects and rename different markings to score
                if (Array.isArray(currentStepQueue[0])) {
                    currentStepQueue.forEach(queueItem => {
                        formattedCurrentStepQueue.push({pos: queueItem, score: 0})
                    })
                } else {
                    const scoreKey = Object.keys(currentStepQueue[0])[1]
                    currentStepQueue.forEach(queueItem => {
                        formattedCurrentStepQueue.push({pos: queueItem.pos, score: queueItem[scoreKey]})
                    })
                }

                // Update score and cell state
                formattedCurrentStepQueue.forEach(queueCell => {
                    const [x, y] = queueCell.pos
                    const index = this.toCellStateIndex(x, y)
                    this.CANVASRESOURCES[algorithm].SCORE[index] = queueCell.score
                    if (this.CANVASRESOURCES[algorithm].CELLSTATE[index] != this.STATE.START)
                        this.CANVASRESOURCES[algorithm].CELLSTATE[index] = this.STATE.IN_QUEUE
                })

                if (this.CANVASRESOURCES[algorithm].CELLSTATE[this.toCellStateIndex(searchingX, searchingY)] != this.STATE.START)
                    this.CANVASRESOURCES[algorithm].CELLSTATE[this.toCellStateIndex(searchingX, searchingY)] = this.STATE.SEARCHING
            }

            // Add path to cell state when:
            // current step is higher than the steps algorithm took
            // and the path is not already in cell state
            if (currentStep >= algorithmSteps && lastRenderedStep < algorithmSteps) {
                // Draw all visited cells
                let cells = []
                for (let i = 0; i < history.length; i++) {
                    cells.push(Object.values(history[i]).flat())
                }
                cells = cells.flat()
                for (let i = 0; i < cells.length; i++) {
                    if (this.CANVASRESOURCES[algorithm].CELLSTATE[this.toCellStateIndex(cells[i][0], cells[i][1])] != this.STATE.TARGET)
                        this.CANVASRESOURCES[algorithm].CELLSTATE[this.toCellStateIndex(cells[i][0], cells[i][1])] = this.STATE.VISITED
                }

                // Draw directions
                const directionInCellState = this.directionsToCellState(directions)
                for (let pathStep = 1; pathStep < steps.length; pathStep++) {
                    let stepIndex = this.toCellStateIndex(steps[pathStep][0], steps[pathStep][1])
                    if (this.CANVASRESOURCES[algorithm].CELLSTATE[stepIndex] != this.STATE.TARGET)
                        this.CANVASRESOURCES[algorithm].CELLSTATE[stepIndex] = directionInCellState[pathStep]
                    else
                        this.CANVASRESOURCES[algorithm].CELLSTATE[stepIndex] = this.STATE.TARGET_REACHED
                }
            }
        }
    }

    toCellStateIndex(x, y) {
        return x + ((this.Grid.height - y - 1) * this.Grid.height)
    }

    // Convert direction to cell state
    directionsToCellState(directions) {
        let result = []
        directions.forEach(pathStepDirection => {
            switch (pathStepDirection) {
                case 'pathUp':
                    result.push(this.STATE.PATH_UP)
                    break
                case 'pathDown':
                    result.push(this.STATE.PATH_DOWN)
                    break
                case 'pathLeft':
                    result.push(this.STATE.PATH_LEFT)
                    break
                case 'pathRight':
                    result.push(this.STATE.PATH_RIGHT)
                    break
            }
        })
        return result
    }
}

class CanvasResource {
    constructor(initialCellState) {
        this.CELLSTATE = initialCellState
        this.CELLSTATEBUFFER
        this.CANVASCONTEXT
        this.BINDGROUP
        this.SCORE = new Int32Array(initialCellState.length).fill(-1)
        this.SCOREBUFFER
    }
}