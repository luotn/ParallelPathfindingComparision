let speed = 0.5
let grid = new GRID()
let algorithms = []
let stepHistory = {}
let benchmark = null
let benchmarkResult = {}
const warmups = 3
const benchmarkTimes = 1000

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
    grid.print()

    // Reconstuct algorithms from session storage
    algorithms = JSON.parse(algorithmString)

    runAlgorithms()

    if (benchmark) {
        runBenchmark()
        let result = `
                    <li class="list-group-item" id="benchmarkResult">
                        Benchmark Result<br>
                    </li>`
        for (let i = 0; i < algorithms.length; i++) {
            let algorithm = algorithms[i]
            result += `
                    <li class="list-group-item">
                        ${algorithm} ${benchmarkResult[algorithm].avgTime}μs
                    </li>
            `
        }
        document.getElementById("benchmarks").innerHTML = result
    }

    console.log(stepHistory)
    
    constructVisuals()

    // Add window event listener
    window.addEventListener("keydown", function (event) {
        switch (event.key) {
            case "a":
                console.log("Stepping back...")
                break
            case "d":
                console.log("Stepping forward...")
                break
            case "w":
                console.log("Rewinding...")
                break
            case "s":
                console.log("Fast Forwarding...")
                break
            case "q":
                console.log("Starting interval...")
                break
            case "r":
                console.log("Performing hard reset...")
                break
        }
    })
}

// Visualise result
function constructVisuals() {
    // Find largest steps
    let maxStep = 0
    for (const algorithm of algorithms) {
        const algorithmStep = stepHistory[algorithm].steps.length
        maxStep = algorithmStep > maxStep ? algorithmStep : maxStep
    }
    let visualResult = `
                <div class="progress" role="progressbar" aria-label="Animated striped example" aria-valuenow="0" aria-valuemin="0" aria-valuemax="${maxStep}" id="stepProgress">
                    <div class="progress-bar progress-bar-striped progress-bar-animated" style="width: 0%">Step 0/${maxStep}</div>
                </div>\n`

    // Add visual for each algorithm
    for (const algorithm of algorithms) {
        // Statistics
        visualResult += `${algorithm}: ${stepHistory[algorithm].steps.length} steps in ${stepHistory[algorithm].time}ms.`

        // Draw initial grid
        visualResult += `<table id="${algorithm}" class="board">\n<tbody>\n`
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
    for (let i = 0; i < algorithms.length; i++) {
        let algorithm = algorithms[i]
        let totalTime = 0

        // Warmup
        for (let i = 0; i < warmups; i++) {
            let newGrid = cloneGrid(grid)
            runAlgorithm(algorithm, newGrid)
        }

        // Run benchmark
        for (let i = 0; i < benchmarkTimes; i++) {
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
    for (let i = 0; i < algorithms.length; i++) {
        let algorithm = algorithms[i]

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
        case "A*":
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
    if (simulator != null) {
        return simulator.run()
    }
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