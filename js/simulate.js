let Speed = 0.2
let Grid = new GRID()
let Algorithms = []
let StepHistory = {}
let QueueHistory = []
let Benchmark
let BenchmarkResult = {}
const Warmups = 3
const BenchmarkTimes = 1000
let MaxStep = 0
let CurrentStep = 0
let PlayBackID
let CellReferences
let LastRenderedStep = 0
let ValidResult = true
const ControlIcons = ["stepBackIcon", "stepForwardIcon", "rewindIcon", "playBackIcon", "forwardIcon"]
const CompressMap = {
    'start': 's',
    'target': 't',
    'wall': 'w',
    'unvisited': 'u'
}
const DecompressMap = {
    's': 'start',
    't': 'target',
    'w': 'wall',
    'u': 'unvisited'
}
let PositionViewer
let PositionText

// luotn's github pages host
let domain = "https://luotn.github.io/ParallelPathfindingComparision"
// host locally
// let domain = "http://127.0.0.1:5500"

let renderEngine
const GRIDDOMROOT = "gridPreview"

let lastMousePos = [0, 0]

async function init() {
    let urlQuery = window.location.search.substring(1)
    let gridString
    let algorithmString
    // Load share link if found, otherwise load session storage
    if (urlQuery.length > 0) {
        try {
            let queries = urlQuery.split("&")
            for (var i = 0; i < queries.length; i++) {
                var keyValuePair = queries[i].split('=')
                switch (keyValuePair[0]) {
                    case "g":
                        gridString = JSON.stringify(decompressGrid(decodeURI(keyValuePair[1])))
                        sessionStorage.setItem("grid", gridString)
                        break
                    case "a":
                        algorithmString = decodeURI(keyValuePair[1])
                        sessionStorage.setItem("algorithms", algorithmString)
                        break
                    case "b":
                        Benchmark = decodeURI(keyValuePair[1])
                        sessionStorage.setItem("benchmark", Benchmark)
                        break
                }
            }
            history.replaceState(null, "Algorithm Finder - Simulate", "?")
        } catch (err) {
            alert("Grid data incorrect!\nResetting all data.\nRedirecting to index page...")
            sessionStorage.clear()
            window.location.replace("./index.html")
            return
        }
    } else {
        gridString = sessionStorage.getItem("grid")
        algorithmString = sessionStorage.getItem("algorithms")
        Benchmark = JSON.parse(sessionStorage.getItem("benchmark"))
    }

    // Redirect to index if missing setting(s)
    if (gridString == undefined || algorithmString == undefined || Benchmark == undefined) {
        alert("Simulation data missing!\nRedirecting to index page...")
        window.location.replace("./index.html")
        return
    }

    // Reconstruct grid from session storage
    plainObj = JSON.parse(gridString)
    Grid.height = plainObj.height
    Grid.width = plainObj.width
    Grid.data = plainObj.data

    // Reconstuct algorithms from session storage
    Algorithms = JSON.parse(algorithmString)

    try {
        runAlgorithms()
    } catch (err) {
        alert(err + "\nRedirecting to index page...")
        window.location.replace("./index.html")
        return
    }

    if (Benchmark) {
        runBenchmark()
        let result = `
                    <li class="list-group-item" id="benchmarkResult">
                        Benchmark Result<br>
                    </li>`
        for (let algorithm of Algorithms) {
            result += `<li class="list-group-item">`
            if (BenchmarkResult[algorithm].avgTime != -1) {
                result += `<a class="settingsPrompt">${algorithm}: ${StepHistory[algorithm].history.length} steps; length ${StepHistory[algorithm].steps.length - 1}; ${BenchmarkResult[algorithm].avgTime}μs</a>`
            } else {
                result += `${algorithm}: Did not find a path`
            }
            result += `</li>`
        }
        document.getElementById("benchmarks").innerHTML = result
    }

    renderEngine = new GPUDriver(Grid, Algorithms, StepHistory, QueueHistory, GRIDDOMROOT)
    if (!await renderEngine.getGPUAvaliablity()) {
        renderEngine = new DOMDriver(Grid, Algorithms, StepHistory, QueueHistory, GRIDDOMROOT)
    } else {
        await renderEngine.init()
    }
    renderEngine.drawGrid()

    // Find largest steps
    for (const algorithm of Algorithms) {
        const algorithmStep = StepHistory[algorithm].history.length
        MaxStep = algorithmStep > MaxStep ? algorithmStep : MaxStep
    }

    updateProgressBar()

    PositionViewer = bootstrap.Toast.getOrCreateInstance(document.getElementById('positionViewer'))
    PositionViewer.show()
    PositionText = document.getElementById("positionText")

    addEventListeners()
}

// Add window event listener
function addEventListeners() {
    if (ValidResult) {
        // Keyboard controls
        window.addEventListener("keydown", function (event) {
            switch (event.key) {
                case "a":
                    handleStepBack()
                    break
                case "d":
                    handleStepForward()
                    break
                case "s":
                    handleRewind()
                    break
                case "w":
                    handleForward()
                    break
                case "q":
                    if (PlayBackID === null) {
                        startPlayback()
                    } else {
                        stopPlayback()
                    }
                    break
                case "r":
                    hardReset()
                    break
                case "e":
                    editGrid()
            }

        })

        // Show mouse position in PositionViewer
        // For CPU render
        if (renderEngine instanceof DOMDriver) {
            for (let algorithm of Algorithms) {
                let algorithmGrid = document.getElementsByClassName(algorithm)[0]
                algorithmGrid.querySelectorAll('[role="cell"]').forEach(function (cell) {
                    cell.addEventListener("mouseenter", function () {
                        PositionText.innerHTML = getCellPosText(algorithm, cell)
                    })
                })
            }
            // For WebGPU render
        } else {
            for (let algorithm of Algorithms) {
                let algorithmCanvas = document.getElementById(`${algorithm}-canvas`)
                algorithmCanvas.addEventListener('mousemove', function (e) {
                    var rect = algorithmCanvas.getBoundingClientRect()
                    let mouseX = e.clientX - rect.left
                    let mouseY = e.clientY - rect.top
                    let cellPos = renderEngine.getMousePosition(mouseX, mouseY)
                    if (cellPos[0] != lastMousePos[0] || cellPos[1] != lastMousePos[1]) {
                        PositionText.innerHTML = `${algorithm}: [${cellPos[0]}, ${cellPos[1]}]`
                        lastMousePos = cellPos
                    }
                })
            }
        }

    } else {
        disableControls()
        window.addEventListener("keydown", function (event) {
            if (event.key == "r") {
                hardReset()
            }
        })
    }
}

function getCellPosText(algorithm, cell) {
    let cellPosition = getPosFromID(cell)
    return `${algorithm}: [${cellPosition[0]}, ${cellPosition[1]}]`
}

function getPosFromID(element) {
    return element.getAttribute("id").split("-").map(function (pos) {
        return parseInt(pos)
    })
}

function hardReset() {
    this.sessionStorage.clear()
    window.location.replace("./index.html")
}

function editGrid() {
    window.location.replace("./index.html")
}

function disableControls() {
    document.getElementById("speed").disabled = true
    for (let icon of ControlIcons) {
        let control = document.getElementById(icon)
        control.classList += " disabled"
        control.removeAttribute("onclick")
    }
}

function startPlayback() {
    document.getElementById("playBackIcon").src = "./icons/pause-fill.svg"
    document.getElementById("playBackIcon").setAttribute("onclick", "stopPlayback()")
    document.getElementById("playBackText").innerHTML = `Pause(Q)`
    if (!PlayBackID) {
        PlayBackID = setInterval(handleStepForward, 1000 * Speed)
        console.log(PlayBackID)
    }
}

function stopPlayback() {
    clearInterval(PlayBackID)
    PlayBackID = null
    document.getElementById("playBackIcon").src = "./icons/play-fill.svg"
    document.getElementById("playBackIcon").setAttribute("onclick", "startPlayback()")
    document.getElementById("playBackText").innerHTML = `Start(Q)`
}

function handleForward() {
    CurrentStep = MaxStep
    updateEverything()
    stopPlayback()
}

function handleRewind() {
    CurrentStep = 0
    updateEverything()
    stopPlayback()
}

function handleStepForward() {
    if (CurrentStep + 1 <= MaxStep) {
        CurrentStep++
        updateEverything()
    } else {
        stopPlayback()
    }
}

function handleStepBack() {
    if (CurrentStep - 1 >= 0) {
        CurrentStep--
        updateEverything()
    }
}

function updateEverything() {
    LastRenderedStep = renderEngine.updateVisuals(CurrentStep, LastRenderedStep)
    updateProgressBar()
}

// Find which direction the path icon should face
function findDirection(currentCell, nextCell) {
    if (currentCell[0] < nextCell[0])
        return "pathRight"
    else if (currentCell[0] > nextCell[0])
        return "pathLeft"
    else if (currentCell[1] < nextCell[1])
        return "pathDown"
    else if (currentCell[1] > nextCell[1])
        return "pathUp"
    else
        throw new Error("Path direction incorrect!")
}

// Update progress bar
function updateProgressBar() {
    document.getElementById("stepProgressBG").setAttribute("aria-valuenow", `${CurrentStep}`)
    document.getElementById("stepProgress").setAttribute("style", `width: ${CurrentStep / MaxStep * 100}%`)
    document.getElementById("progressBarText").innerHTML = `Step ${CurrentStep}/${MaxStep}`
}

function runBenchmark() {
    // Run benchmark and save times to benchmarkResult
    for (let algorithm of Algorithms) {
        if (StepHistory[algorithm].steps.length != 0) {
            let totalTime = 0

            // Warmup
            for (let i = 0; i < Warmups; i++) {
                let newGrid = cloneGrid(Grid)
                runAlgorithm(algorithm, newGrid)
            }

            // Run benchmark
            for (let j = 0; j < BenchmarkTimes; j++) {
                let newGrid = cloneGrid(Grid)
                const startTime = performance.now()
                runAlgorithm(algorithm, newGrid)
                const endTime = performance.now()
                totalTime += endTime - startTime
            }

            // Unit: μs
            BenchmarkResult[algorithm] = {avgTime: Math.round(1.0 * (totalTime / BenchmarkTimes) * 1e3)}
        } else {
            BenchmarkResult[algorithm] = {avgTime: -1}
        }
    }
}

function runAlgorithms() {
    // Run algorithm and save step history to stepHistory
    for (let algorithm of Algorithms) {
        // Prepare to run algorithm
        StepHistory[algorithm] = {time: 0, steps: [], directions: []}
        let newGrid = cloneGrid(Grid)

        // RUN IT!
        const startTime = performance.now()

        let result = runAlgorithm(algorithm, newGrid)

        const endTime = performance.now()

        let path = result[0]
        let history = result[1]
        QueueHistory[algorithm] = result[2]

        // Caculate cell directions
        const directions = [];
        for (let i = 0; i < path.length - 1; i++) {
            directions.push(findDirection(path[i], path[i + 1]));
        }

        // Save execuation time, path and directions
        // Unit: ms - miliseconds
        StepHistory[algorithm].time = endTime - startTime
        StepHistory[algorithm].steps = path
        StepHistory[algorithm].directions = directions
        StepHistory[algorithm].history = history
        if (ValidResult) {
            ValidResult = StepHistory[algorithm].steps.length != 0
        }
    }
}

function runAlgorithm(algorithm, newGrid) {
    let simulator = null
    switch (algorithm) {
        case "AStar":
            simulator = new AStar(newGrid)
            break
        case "Dijkstra":
            simulator = new Dijkstra(newGrid)
            break
        case "BFS":
            simulator = new BFS(newGrid)
            break
        case "DFS":
            simulator = new DFS(newGrid)
            break
    }
    if (simulator)
        return simulator.run()
}

// Deep copy grid
function cloneGrid(original) {
    const grid = new GRID(original.width, original.height)

    grid.data = structuredClone(original.data)
    grid.start = structuredClone(original.start)
    grid.target = structuredClone(original.target)

    return grid
}

function updateSpeed() {
    let speedRaw = document.getElementById("speed").value
    // Deal with flot precision problem
    Speed = Math.round(1.0 * 100 - speedRaw * 100) / 100
    document.getElementById("speedPrompt").innerHTML = `Step Interval: ${Speed}s`
}

function share() {
    let resultURL = `${domain}/simulate.html?g=${compressGrid()}&a=${sessionStorage.getItem("algorithms")}&b=${sessionStorage.getItem("benchmark")}`
    navigator.clipboard.writeText(resultURL)
    document.getElementById("share").innerHTML = `<img src="./icons/clipboard-check.svg" alt="Start" width="23" height="23" class="svgs" style="align-self: last baseline;">&nbsp;&nbsp;Copied!`
}

function compressGrid() {
    let compressed = Grid.data.map(cell => CompressMap[cell]).join('')
    return `${Grid.width}_${Grid.height}_${compressed}`
}

function decompressGrid(compressedStr) {
    const [widthStr, heightStr, dataStr] = compressedStr.split('_')
    let width = parseInt(widthStr)
    let height = parseInt(heightStr)

    if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
        throw new Error('Invalid grid dimensions')
    }

    let expectedLength = width * height;
    if (dataStr.length !== expectedLength) {
        throw new Error('Data length does not match grid size')
    }

    let data = []
    for (let char of dataStr) {
        let state = DecompressMap[char];
        if (!state) throw new Error(`Invalid character: ${char}`)
        data.push(state)
    }

    return {"width": width, "height": height, "data": data}
}