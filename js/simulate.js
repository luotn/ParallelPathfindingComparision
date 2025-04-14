let speed = 0.5
let grid = new GRID()
let algorithms = []
let stepHistory = {}
let benchmark = null
let benchmarkResult = {}
const warmups = 3
const benchmarkTimes = 1000
let maxStep = 0
let currentStep = 0
let playBackID
let cellReferences
let lastRenderedStep = 0
let validResult = true
const controlIcons = ["stepBackIcon", "stepForwardIcon", "rewindIcon", "playBackIcon", "forwardIcon"]

// luotn's github pages host
// let domain = "https://luotn.github.io/ParallelPathfindingComparision"

// host locally
let domain = "http://127.0.0.1:5500"

function init() {
    let urlQuery = window.location.search.substring(1)
    let gridString
    let algorithmString
    // Load share link if found, otherwise load session storage
    if (urlQuery.length > 0) {
        let queries = urlQuery.split("&")
        for (var i = 0; i < queries.length; i++) {
            var keyValuePair = queries[i].split('=')
            switch (keyValuePair[0]) {
                case "grid":
                    gridString = decodeURI(keyValuePair[1])
                    sessionStorage.setItem("grid", gridString)
                    break
                case "algorithms":
                    algorithmString = decodeURI(keyValuePair[1])
                    sessionStorage.setItem("algorithms", algorithmString)
                    break
                case "benchmark":
                    benchmark = decodeURI(keyValuePair[1])
                    sessionStorage.setItem("benchmark", benchmark)
                    break
            }
        }
        history.replaceState(null, "Algorithm Finder - Simulate", "?");
    } else {
        gridString = sessionStorage.getItem("grid")
        algorithmString = sessionStorage.getItem("algorithms")
        benchmark = sessionStorage.getItem("benchmark")
    }

    // Redirect to index if missing setting(s)
    if (gridString == undefined || algorithmString == undefined || benchmark == null) {
        alert("Simulation data not missing!\nRedirecting to index page...")
        window.location.replace("./index.html")
    }

    // Reconstruct grid from session storage
    plainObj = JSON.parse(gridString)
    grid.height = plainObj.height
    grid.width = plainObj.width
    grid.data = plainObj.data

    // Reconstuct algorithms from session storage
    algorithms = JSON.parse(algorithmString)

    runAlgorithms()

    if (benchmark) {
        runBenchmark()
        let result = `
                    <li class="list-group-item" id="benchmarkResult">
                        Benchmark Result<br>
                    </li>`
        for (let algorithm of algorithms) {
            result += `<li class="list-group-item">`
            if(benchmarkResult[algorithm].avgTime != -1) {
                result += `${algorithm}: ${stepHistory[algorithm].steps.length - 1} steps in ${benchmarkResult[algorithm].avgTime}μs`
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
    if (validResult) {
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
                    if (playBackID === null) {
                        startPlayback()
                    } else {
                        stopPlayback()
                    }
                    break
                case "r":
                    hardReset()
                    break
            }

        })
    } else {
        console.log("Locking controls")
        disableControls()
        window.addEventListener("keydown", function (event) {
            if(event.key == "r") {
                hardReset()
            }
        })
    }
}

function hardReset() {
    this.sessionStorage.clear()
    window.location.replace("./index.html")
}

function disableControls() {
    document.getElementById("speed").disabled = true
    for(let icon of controlIcons) {
        let control = document.getElementById(icon)
        control.classList += " disabled"
        control.removeAttribute("onclick")
    }
}

function startPlayback() {
    document.getElementById("playBackIcon").src = "./icons/pause-fill.svg"
    document.getElementById("playBackIcon").setAttribute("onclick", "stopPlayback()")
    document.getElementById("playBackText").innerHTML = `Rewind(S) &nbsp;&nbsp; Pause(Q) &nbsp;&nbsp; Foward(W)`
    if (!playBackID) {
        playBackID = setInterval(handleStepForward, 1000 * speed)
    }
}

function stopPlayback() {
    clearInterval(playBackID)
    playBackID = null
    document.getElementById("playBackIcon").src = "./icons/play-fill.svg"
    document.getElementById("playBackIcon").setAttribute("onclick", "startPlayback()")
    document.getElementById("playBackText").innerHTML = `Rewind(S) &nbsp;&nbsp; Start(Q) &nbsp;&nbsp; Foward(W)`
}

function handleForward() {
    currentStep = maxStep
    updateEverything()
}

function handleRewind() {
    currentStep = 0
    updateEverything()
}

function handleStepForward() {
    if (currentStep + 1 <= maxStep) {
        currentStep++
        updateEverything()
    } else {
        stopPlayback()
    }
}

function handleStepBack() {
    if (currentStep - 1 >= 0) {
        currentStep--
        updateEverything()
    }
}

function updateEverything() {
    updateVisuals()
    updateProgressBar()
}

// Update algorithm results
function updateVisuals() {
    for (let algorithm of algorithms) {
        let algorithmSteps = stepHistory[algorithm].steps.length
        // Get step to render, last step if current step exceeds algorithm total steps
        let renderStep = currentStep < algorithmSteps - 1 ? currentStep : algorithmSteps - 1
        const { steps, directions } = stepHistory[algorithm]

        // Calculate steps to render
        const startStep = Math.min(lastRenderedStep, renderStep)
        let endStep = Math.max(lastRenderedStep, renderStep)
        const forwarding = renderStep - lastRenderedStep - 1 >= 0

        // Cap endStep at algorithmSteps - 1
        endStep = Math.min(endStep, algorithmSteps - 1)

        for (let step = startStep + 1; step <= endStep; step++) {
            const [x, y] = steps[step]
            if (forwarding) {
                cellReferences[algorithm][y * grid.width + x].className = directions[step]
            } else {
                cellReferences[algorithm][y * grid.width + x].className = "unvisited"
            }
        }

        // Update target cell
        const [targetX, targetY] = grid.getTargetPos()
        const targetCell = cellReferences[algorithm][targetY * grid.width + targetX]
        targetCell.className = renderStep == algorithmSteps - 1 ? "targetReached" : "target"
    }
    lastRenderedStep = currentStep
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
        alert("Error in path!!!")
}

// Update progress bar
function updateProgressBar() {
    document.getElementById("stepProgressBG").setAttribute("aria-valuenow", `${currentStep}`)
    document.getElementById("stepProgress").setAttribute("style", `width: ${currentStep / maxStep * 100}%`)
    document.getElementById("progressBarText").innerHTML = `Step ${currentStep}/${maxStep}`
}

// Visualise result
function constructVisuals() {
    // Find largest steps
    for (const algorithm of algorithms) {
        const algorithmStep = stepHistory[algorithm].steps.length - 1
        maxStep = algorithmStep > maxStep ? algorithmStep : maxStep
    }
    let visualResult = ""

    // Add visual for each algorithm
    for (const algorithm of algorithms) {
        // Statistics
        if(validResult) {
            visualResult += `${algorithm}: ${stepHistory[algorithm].steps.length - 1} steps in ${Math.round(stepHistory[algorithm].time)}ms.`
        } else {
            visualResult += `${algorithm}: Did NOT find path in ${Math.round(stepHistory[algorithm].time)}ms.`
            document.getElementById("controlPrompt").innerHTML = "Controls Disabled!"
        }

        // Draw initial grid
        visualResult += `<table class="board ${algorithm}">\n<tbody>\n`
        for (let y = 0; y < grid.height; y++) {
            visualResult += `<tr id="row ${y}">\n`
            for (let x = 0; x < grid.width; x++) {
                visualResult += `<td id="${x}-${y}" role="cell" class="${grid.getCell([x, y])}"></td>\n`
            }
            visualResult += `</tr>\n`
        }
        visualResult += `</tbody>\n</table>\n`
    }

    document.getElementById("gridPrview").innerHTML = visualResult

    saveReferences()
}

// Save cell references
function saveReferences() {
    cellReferences = {}
    for (const algorithm of algorithms) {
        cellReferences[algorithm] = []
        const table = document.querySelector(`table.board.${algorithm}`)
        for (let y = 0; y < grid.height; y++) {
            const row = table.rows[y]
            for (let x = 0; x < grid.width; x++) {
                cellReferences[algorithm][y * grid.width + x] = row.cells[x]
            }
        }
    }
}

function runBenchmark() {
    // Run benchmark and save times to benchmarkResult
    for (let algorithm of algorithms) {
        if(stepHistory[algorithm].steps.length != 0) {
            let totalTime = 0

            // Warmup
            for (let i = 0; i < warmups; i++) {
                let newGrid = cloneGrid(grid)
                runAlgorithm(algorithm, newGrid)
            }

            // Run benchmark
            for (let j = 0; j < benchmarkTimes; j++) {
                let newGrid = cloneGrid(grid)
                const startTime = performance.now()
                runAlgorithm(algorithm, newGrid)
                const endTime = performance.now()
                totalTime += endTime - startTime
            }

            // Unit: μs
            benchmarkResult[algorithm] = {avgTime: Math.round(1.0 * (totalTime / benchmarkTimes) * 1e3)}
        } else {
            benchmarkResult[algorithm] = {avgTime: -1}
        }
    }
}

function runAlgorithms() {
    // Run algorithm and save step history to stepHistory
    for (let algorithm of algorithms) {
        // Prepare to run algorithm
        stepHistory[algorithm] = { time: 0, steps: [], directions: [] }
        let newGrid = cloneGrid(grid)

        // RUN IT!
        const startTime = performance.now()

        path = runAlgorithm(algorithm, newGrid)

        const endTime = performance.now()

        // Caculate cell directions
        const directions = [];
        for (let i = 0; i < path.length - 1; i++) {
            directions.push(findDirection(path[i], path[i + 1]));
        }

        // Save execuation time, path and directions
        // Unit: ms - miliseconds
        stepHistory[algorithm].time = endTime - startTime
        stepHistory[algorithm].steps = path
        stepHistory[algorithm].directions = directions;
        if(validResult) {
            validResult = stepHistory[algorithm].steps.length != 0
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
    if (simulator != null)
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
    speed = Math.round(1.0 * 100 - speedRaw * 100) / 100
    document.getElementById("speedPrompt").innerHTML = `Step Interval: ${speed}s`
}

function share() {
    let resultURL = `${domain}/simulate.html?grid=${sessionStorage.getItem("grid")}&algorithms=${sessionStorage.getItem("algorithms")}&benchmark=${sessionStorage.getItem("benchmark")}`
    navigator.clipboard.writeText(resultURL)
    document.getElementById("share").innerHTML = `<img src="./icons/clipboard-check.svg" alt="Start" width="23" height="23" class="svgs" style="align-self: last baseline;">&nbsp;&nbsp;Copied!`
}