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
let playBackID;

function init() {
    let gridString = sessionStorage.getItem("grid")
    let algorithmString = sessionStorage.getItem("algorithms")
    benchmark = sessionStorage.getItem("benchmark")
    // Redirect to index if missing setting(s)
    if (gridString == undefined || algorithmString == undefined || benchmark == null) {
        alert("Simulation data not missing!\nRedirecting to index page...")
        window.location.replace("./index.html");
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
            result += `
                    <li class="list-group-item">
                        ${algorithm} ${benchmarkResult[algorithm].avgTime}μs
                    </li>
            `
        }
        document.getElementById("benchmarks").innerHTML = result
    }

    constructVisuals()
    addEventListeners()
}

// Add window event listener
function addEventListeners() {
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
                location.reload()
                break
        }

    })
}

function startPlayback() {
    document.getElementById("playBackIcon").src = "./icons/pause-fill.svg"
    document.getElementById("playBackIcon").setAttribute("onclick", "stopPlayback()")
    document.getElementById("playBackText").innerHTML = `Rewind(S) &nbsp;&nbsp; Pause(Q) &nbsp;&nbsp; Foward(W)`
    if(!playBackID) {
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
    // Reset visuals
    constructVisuals()
    updateVisuals()
    updateProgressBar()
}

// Update algorithm results
function updateVisuals() {
    for (let algorithm of algorithms) {
        let algorithmSteps = stepHistory[algorithm].steps.length
        // Get step to render, last step if current step exceeds algorithm total steps
        let renderStep = currentStep < algorithmSteps - 1 ? currentStep : algorithmSteps - 1
        // Render all steps before target step
        for (let step = 1; step <= renderStep; step++) {
            let currentCell = stepHistory[algorithm].steps[step]
            let nextCell = stepHistory[algorithm].steps[step + 1]
            if (nextCell !== undefined) {
                let direction = findDirection(currentCell, nextCell)
                document.querySelector(`table.board.${algorithm} td[id="${currentCell[0]}-${currentCell[1]}"]`).setAttribute("class", direction)
                try {
                    document.querySelector(`table.board.${algorithm} td[class="targetReached"]`).setAttribute("class", "target")
                } catch (error) {

                }
            } else {
                document.querySelector(`table.board.${algorithm} td[class="target"]`).setAttribute("class", "targetReached")
            }
        }
    }
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
    document.getElementById("stepProgress").innerHTML = `Step ${currentStep}/${maxStep}`
}

// Visualise result
function constructVisuals() {
    // Find largest steps
    for (const algorithm of algorithms) {
        const algorithmStep = stepHistory[algorithm].steps.length - 1
        maxStep = algorithmStep > maxStep ? algorithmStep : maxStep
    }
    let visualResult = `
                <div class="progress" role="progressbar" aria-label="Step Progress" aria-valuenow="0" aria-valuemin="0" aria-valuemax="${maxStep}" id="stepProgressBG">
                    <div class="progress-bar progress-bar-striped progress-bar-animated" style="width: 0%" id="stepProgress">Step 0/${maxStep}</div>
                </div>\n`

    // Add visual for each algorithm
    for (const algorithm of algorithms) {
        // Statistics
        visualResult += `${algorithm}: ${stepHistory[algorithm].steps.length - 1} steps in ${Math.round(stepHistory[algorithm].time)}ms.`

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
}

function runBenchmark() {
    // Run benchmark and save times to benchmarkResult
    for (let algorithm of algorithms) {
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
        benchmarkResult[algorithm] = { avgTime: Math.round(1.0 * (totalTime / benchmarkTimes) * 1e3) }
    }
}

function runAlgorithms() {
    // Run algorithm and save step history to stepHistory
    for (let algorithm of algorithms) {
        // Prepare to run algorithm
        stepHistory[algorithm] = { time: 0, steps: [] }
        let newGrid = cloneGrid(grid)

        // RUN IT!
        const startTime = performance.now()

        path = runAlgorithm(algorithm, newGrid)

        const endTime = performance.now()

        // Save execuation time and path
        // Unit: ms - miliseconds
        stepHistory[algorithm].time = endTime - startTime
        stepHistory[algorithm].steps = path
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
    const grid = new GRID(original.width, original.height);

    grid.data = structuredClone(original.data)
    grid.start = structuredClone(original.start)
    grid.target = structuredClone(original.target)

    return grid;
}

function updateSpeed() {
    let speedRaw = document.getElementById("speed").value
    // Deal with flot precision problem
    speed = Math.round(1.0 * 100 - speedRaw * 100) / 100
    document.getElementById("speedPrompt").innerHTML = `Step Interval: ${speed}s`
}