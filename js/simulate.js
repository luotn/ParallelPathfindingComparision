let Speed = 0.2
let Grid = new GRID()
let Algorithms = []
let StepHistory = {}
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

function init() {
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
        } catch(err) {
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
    } catch(err) {
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

    constructVisuals()
    updateProgressBar()
    preLoadImages()

    PositionViewer = bootstrap.Toast.getOrCreateInstance(document.getElementById('positionViewer'))
    PositionText = document.getElementById("positionText")

    addEventListeners()
}

function preLoadImages() {
    var image = new Image();
    image.src = "./icons/arrow-down-square-fill.svg"
    image.src = "./icons/arrow-up-square-fill.svg"
    image.src = "./icons/arrow-left-square-fill.svg"
    image.src = "./icons/door-open-fill.svg"
}

// Add window event listener
function addEventListeners() {
    if (ValidResult) {
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

        let gridPreview = document.getElementById("gridPreview")
        gridPreview.addEventListener("mouseenter", function () {
            PositionViewer.show()
        })
        gridPreview.addEventListener("mouseleave", function () {
            PositionViewer.hide()
        })

        // Add listener for each algorithm
        for (let algorithm of Algorithms) {
            let algorithmGrid = document.getElementsByClassName(algorithm)[0]
            algorithmGrid.querySelectorAll('[role="cell"]').forEach(function (cell) {
                cell.addEventListener("mouseenter", function () {
                    PositionText.innerHTML = getCellPosText(algorithm, cell)
                })
                cell.addEventListener("click", function () {
                    document.getElementById("cellDataViewerTitle").innerHTML = `${getCellPosText(algorithm, cell)} Information`
                    bodyText = ""
                    switch(cell.className) {
                        case "start":
                            bodyText = `This is the starting cell of the grid.<br>The ${algorithm} algorithm will always take this cell as step 0.`
                            break
                        case "target":
                        case "targetReached":
                            bodyText = `The ${algorithm} algorithm is trying to reach this cell.`
                            break
                        case "wall":
                            bodyText = "This is a wall in the grid.<br>Path cannot pass through this cell."
                            break
                        case "unvisited":
                            bodyText = `This is currently an empty cell in the grid.<br>`
                            break
                        case "pathUp":
                        case "pathDown":
                        case "pathLeft":
                        case "pathRight":
                            bodyText = `This is a cell on the path ${algorithm} algorithm chose to take.<br>`
                            break
                        case "visited":
                            bodyText = `The ${algorithm} algorithm have evaluated or is evaluating this cell.<br>`
                    }

                    if(["visited", "unvisited", "pathUp", "pathDown", "pathLeft", "pathRight"].indexOf(cell.className) != -1) {
                        const cellPos = getPosFromID(cell)
                        console.log(`pos: ${[cellPos[0], cellPos[1]]}`)
                        for(let i = 0; i < StepHistory[algorithm].steps.length; i++) {
                            let step = StepHistory[algorithm].steps[i]
                            if(step[0] == cellPos[0] && step[1] == cellPos[1]) {
                                bodyText += `The ${algorithm} algorithm paths through this cell on step ${i}.`
                            }
                        }
                    }

                    document.getElementById("cellDataViewerBody").innerHTML = bodyText
                    const cellDataViewer = new bootstrap.Modal('#cellDataViewer', null)
                    cellDataViewer.show()
                })
            })
        }
    } else {
        console.log("Locking controls")
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
}

function handleRewind() {
    CurrentStep = 0
    updateEverything()
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
    updateVisuals()
    updateProgressBar()
}

// Update algorithm results
function updateVisuals() {
    for (const algorithm of Algorithms) {
        const {history, steps, directions} = StepHistory[algorithm]
        const algorithmSteps = history.length
        
        // Calculate render range
        const startStep = LastRenderedStep
        const endStep = CurrentStep
        const isForward = endStep > startStep

        CellReferences[algorithm].forEach(cell => cell.removeAttribute("style"))

        // Show which cell is being searched
        const searchingStep = CurrentStep <= algorithmSteps ? CurrentStep : -1
        if (searchingStep != -1 && CurrentStep < algorithmSteps) {
            const [searchingX, searchingY] = Object.keys(history[searchingStep])[0].split("-").map(function(item) {
                return parseInt(item);
            })
            
            // Set searching cell to #FFFF00, filter generated by from: https://codepen.io/sosuke/pen/Pjoqqp
            CellReferences[algorithm][searchingY * Grid.width + searchingX].setAttribute("style", "filter: invert(33%) sepia(71%) saturate(4592%) hue-rotate(6deg) brightness(106%) contrast(106%);")
        }

        // Reverse
        if (!isForward) {
            for (let step = startStep; step >= endStep; step--) {
                if (step >= algorithmSteps) continue
                const cells = Object.values(history[step]).flat()
                cells.forEach(([x, y]) => {
                    const index = y * Grid.width + x
                    if (CellReferences[algorithm][index].className !== "start" && 
                        CellReferences[algorithm][index].className !== "target") {
                        CellReferences[algorithm][index].className = "unvisited"
                    }
                })
            }
        // Forward
        } else {
            for (let step = startStep; step < endStep; step++) {
                if (step >= algorithmSteps) continue
                const cells = Object.values(history[step]).flat()
                cells.forEach(([x, y]) => {
                    const index = y * Grid.width + x
                    if (CellReferences[algorithm][index].className !== "start" && 
                        CellReferences[algorithm][index].className !== "target") {
                        CellReferences[algorithm][index].className = "visited"
                    }
                })
            }
        }

        // Draw and un-draw path
        const isFinalStep = CurrentStep >= algorithmSteps
        const wasFinalStep = LastRenderedStep >= algorithmSteps
        
        if (wasFinalStep && !isFinalStep) {
            drawPath(algorithm, false)
        }
        
        if (isFinalStep && steps.length > 0) {
            drawPath(algorithm, true)
        }
    }
    
    LastRenderedStep = CurrentStep
}

function drawPath(algorithm, draw) {
    const {steps, directions} = StepHistory[algorithm]
    for (let pathStep = 1; pathStep < StepHistory[algorithm].steps.length; pathStep++) {
        const [x, y] = steps[pathStep]
        if (draw) {
            CellReferences[algorithm][y * Grid.width + x].className = directions[pathStep]
        } else {
            CellReferences[algorithm][y * Grid.width + x].className = CurrentStep == 0 ? "unvisited" : "visited"
        }
    }
    // Update target cell
    const [targetX, targetY] = Grid.getTargetPos()
    CellReferences[algorithm][targetY * Grid.width + targetX].className = draw ? "targetReached" : "target"
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

// Visualise result
function constructVisuals() {
    // Find largest steps
    for (const algorithm of Algorithms) {
        const algorithmStep = StepHistory[algorithm].history.length
        MaxStep = algorithmStep > MaxStep ? algorithmStep : MaxStep
    }
    let visualResult = ""

    // Add visual for each algorithm
    for (const algorithm of Algorithms) {
        // Statistics
        if (ValidResult) {
            visualResult += `${algorithm}: ${StepHistory[algorithm].history.length} steps found path with length ${StepHistory[algorithm].steps.length - 1} in ${Math.round(StepHistory[algorithm].time)}ms.`
        } else {
            visualResult += `${algorithm}: Did NOT find path in ${Math.round(StepHistory[algorithm].time)}ms.`
            document.getElementById("controlPrompt").innerHTML = "Controls Disabled!"
        }

        // Draw initial grid
        visualResult += `<table class="board ${algorithm}">\n<tbody>\n`
        for (let y = 0; y < Grid.height; y++) {
            visualResult += `<tr id="row ${y}">\n`
            for (let x = 0; x < Grid.width; x++) {
                let style = ""
                if (Grid.getCell([x, y]) === "start")
                    style += " style='filter: invert(33%) sepia(71%) saturate(4592%) hue-rotate(6deg) brightness(106%) contrast(106%);'"

                visualResult += `<td id="${x}-${y}" role="cell" class="${Grid.getCell([x, y])}"${style}></td>\n`
            }
            visualResult += `</tr>\n`
        }
        visualResult += `</tbody>\n</table>\n`
    }

    document.getElementById("gridPreview").innerHTML = visualResult

    saveReferences()
}

// Save cell references
function saveReferences() {
    CellReferences = {}
    for (const algorithm of Algorithms) {
        CellReferences[algorithm] = []
        const table = document.querySelector(`table.board.${algorithm}`)
        for (let y = 0; y < Grid.height; y++) {
            const row = table.rows[y]
            for (let x = 0; x < Grid.width; x++) {
                CellReferences[algorithm][y * Grid.width + x] = row.cells[x]
            }
        }
    }
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
            BenchmarkResult[algorithm] = { avgTime: Math.round(1.0 * (totalTime / BenchmarkTimes) * 1e3) }
        } else {
            BenchmarkResult[algorithm] = { avgTime: -1 }
        }
    }
}

function runAlgorithms() {
    // Run algorithm and save step history to stepHistory
    for (let algorithm of Algorithms) {
        // Prepare to run algorithm
        StepHistory[algorithm] = { time: 0, steps: [], directions: [] }
        let newGrid = cloneGrid(Grid)

        // RUN IT!
        const startTime = performance.now()

        let result = runAlgorithm(algorithm, newGrid)

        const endTime = performance.now()

        let path = result[0]
        let history = result[1]

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

    return { "width": width, "height": height, "data": data }
}