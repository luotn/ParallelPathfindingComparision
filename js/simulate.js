let speed = 0.2
let grid = new GRID()
let algorithms = []
let stepHistory = {}
let benchmark
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
const compressMap = {
    'start': 's',
    'target': 't',
    'wall': 'w',
    'unvisited': 'u'
}
const decompressMap = {
    's': 'start',
    't': 'target',
    'w': 'wall',
    'u': 'unvisited'
}
let positionViewer
let positionText

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
                        benchmark = decodeURI(keyValuePair[1])
                        sessionStorage.setItem("benchmark", benchmark)
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
        benchmark = JSON.parse(sessionStorage.getItem("benchmark"))
    }

    // Redirect to index if missing setting(s)
    if (gridString == undefined || algorithmString == undefined || benchmark == undefined) {
        alert("Simulation data missing!\nRedirecting to index page...")
        window.location.replace("./index.html")
        return
    }

    // Reconstruct grid from session storage
    plainObj = JSON.parse(gridString)
    grid.height = plainObj.height
    grid.width = plainObj.width
    grid.data = plainObj.data

    // Reconstuct algorithms from session storage
    algorithms = JSON.parse(algorithmString)

    try {
        runAlgorithms()
    } catch(err) {
        alert(err + "\nRedirecting to index page...")
        window.location.replace("./index.html")
        return
    }
    
    if (benchmark) {
        runBenchmark()
        let result = `
                    <li class="list-group-item" id="benchmarkResult">
                        Benchmark Result<br>
                    </li>`
        for (let algorithm of algorithms) {
            result += `<li class="list-group-item">`
            if (benchmarkResult[algorithm].avgTime != -1) {
                result += `<a class="settingsPrompt">${algorithm}: ${stepHistory[algorithm].history.length} steps; length ${stepHistory[algorithm].steps.length - 1}; ${benchmarkResult[algorithm].avgTime}μs</a>`
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

    positionViewer = bootstrap.Toast.getOrCreateInstance(document.getElementById('positionViewer'))
    positionText = document.getElementById("positionText")

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
                case "e":
                    editGrid()
            }

        })

        let gridPreview = document.getElementById("gridPreview")
        gridPreview.addEventListener("mouseenter", function () {
            positionViewer.show()
        })
        gridPreview.addEventListener("mouseleave", function () {
            positionViewer.hide()
        })

        // Add listener for each algorithm
        for (let algorithm of algorithms) {
            let algorithmGrid = document.getElementsByClassName(algorithm)[0]
            algorithmGrid.querySelectorAll('[role="cell"]').forEach(function (cell) {
                cell.addEventListener("mouseenter", function () {
                    updatePositionViewer(algorithm, cell)
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

function updatePositionViewer(algorithm, cell) {
    let cellPosition = getPosFromID(cell)
    positionText.innerHTML = `${algorithm}: [${cellPosition[0]}, ${cellPosition[1]}]`
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
    for (let icon of controlIcons) {
        let control = document.getElementById(icon)
        control.classList += " disabled"
        control.removeAttribute("onclick")
    }
}

function startPlayback() {
    document.getElementById("playBackIcon").src = "./icons/pause-fill.svg"
    document.getElementById("playBackIcon").setAttribute("onclick", "stopPlayback()")
    document.getElementById("playBackText").innerHTML = `Pause(Q)`
    if (!playBackID) {
        playBackID = setInterval(handleStepForward, 1000 * speed)
    }
}

function stopPlayback() {
    clearInterval(playBackID)
    playBackID = null
    document.getElementById("playBackIcon").src = "./icons/play-fill.svg"
    document.getElementById("playBackIcon").setAttribute("onclick", "startPlayback()")
    document.getElementById("playBackText").innerHTML = `Start(Q)`
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
    for (const algorithm of algorithms) {
        const {history, steps, directions} = stepHistory[algorithm]
        const algorithmSteps = history.length
        
        // Calculate render range
        const startStep = lastRenderedStep
        const endStep = currentStep
        const isForward = endStep > startStep

        cellReferences[algorithm].forEach(cell => cell.removeAttribute("style"))

        // Show which cell is being searched
        const searchingStep = currentStep <= algorithmSteps ? currentStep : -1
        if (searchingStep != -1 && currentStep < algorithmSteps) {
            const [searchingX, searchingY] = Object.keys(history[searchingStep])[0].split("-").map(function(item) {
                return parseInt(item);
            })
            
            // Set searching cell to #FFFF00, filter generated by from: https://codepen.io/sosuke/pen/Pjoqqp
            cellReferences[algorithm][searchingY * grid.width + searchingX].setAttribute("style", "filter: invert(33%) sepia(71%) saturate(4592%) hue-rotate(6deg) brightness(106%) contrast(106%);")
        }

        // Reverse
        if (!isForward) {
            for (let step = startStep; step >= endStep; step--) {
                if (step >= algorithmSteps) continue
                const cells = Object.values(history[step]).flat()
                cells.forEach(([x, y]) => {
                    const index = y * grid.width + x
                    if (cellReferences[algorithm][index].className !== "start" && 
                        cellReferences[algorithm][index].className !== "target") {
                        cellReferences[algorithm][index].className = "unvisited"
                    }
                })
            }
        // Forward
        } else {
            for (let step = startStep; step < endStep; step++) {
                if (step >= algorithmSteps) continue
                const cells = Object.values(history[step]).flat()
                cells.forEach(([x, y]) => {
                    const index = y * grid.width + x
                    if (cellReferences[algorithm][index].className !== "start" && 
                        cellReferences[algorithm][index].className !== "target") {
                        cellReferences[algorithm][index].className = "visited"
                    }
                })
            }
        }

        // Draw and un-draw path
        const isFinalStep = currentStep >= algorithmSteps
        const wasFinalStep = lastRenderedStep >= algorithmSteps
        
        if (wasFinalStep && !isFinalStep) {
            drawPath(algorithm, false)
        }
        
        if (isFinalStep && steps.length > 0) {
            drawPath(algorithm, true)
        }
    }
    
    lastRenderedStep = currentStep
}

function drawPath(algorithm, draw) {
    const {steps, directions} = stepHistory[algorithm]
    for (let pathStep = 1; pathStep < stepHistory[algorithm].steps.length; pathStep++) {
        const [x, y] = steps[pathStep]
        if (draw) {
            cellReferences[algorithm][y * grid.width + x].className = directions[pathStep]
        } else {
            cellReferences[algorithm][y * grid.width + x].className = currentStep == 0 ? "unvisited" : "visited"
        }
    }
    // Update target cell
    const [targetX, targetY] = grid.getTargetPos()
    cellReferences[algorithm][targetY * grid.width + targetX].className = draw ? "targetReached" : "target"
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
    document.getElementById("stepProgressBG").setAttribute("aria-valuenow", `${currentStep}`)
    document.getElementById("stepProgress").setAttribute("style", `width: ${currentStep / maxStep * 100}%`)
    document.getElementById("progressBarText").innerHTML = `Step ${currentStep}/${maxStep}`
}

// Visualise result
function constructVisuals() {
    // Find largest steps
    for (const algorithm of algorithms) {
        const algorithmStep = stepHistory[algorithm].history.length
        maxStep = algorithmStep > maxStep ? algorithmStep : maxStep
    }
    let visualResult = ""

    // Add visual for each algorithm
    for (const algorithm of algorithms) {
        // Statistics
        if (validResult) {
            visualResult += `${algorithm}: ${stepHistory[algorithm].history.length} steps found path with length ${stepHistory[algorithm].steps.length - 1} in ${Math.round(stepHistory[algorithm].time)}ms.`
        } else {
            visualResult += `${algorithm}: Did NOT find path in ${Math.round(stepHistory[algorithm].time)}ms.`
            document.getElementById("controlPrompt").innerHTML = "Controls Disabled!"
        }

        // Draw initial grid
        visualResult += `<table class="board ${algorithm}">\n<tbody>\n`
        for (let y = 0; y < grid.height; y++) {
            visualResult += `<tr id="row ${y}">\n`
            for (let x = 0; x < grid.width; x++) {
                let style = ""
                if (grid.getCell([x, y]) === "start")
                    style += " style='filter: invert(33%) sepia(71%) saturate(4592%) hue-rotate(6deg) brightness(106%) contrast(106%);'"

                visualResult += `<td id="${x}-${y}" role="cell" class="${grid.getCell([x, y])}"${style}></td>\n`
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
        if (stepHistory[algorithm].steps.length != 0) {
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
        } else {
            benchmarkResult[algorithm] = { avgTime: -1 }
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
        stepHistory[algorithm].time = endTime - startTime
        stepHistory[algorithm].steps = path
        stepHistory[algorithm].directions = directions
        stepHistory[algorithm].history = history
        if (validResult) {
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
    speed = Math.round(1.0 * 100 - speedRaw * 100) / 100
    document.getElementById("speedPrompt").innerHTML = `Step Interval: ${speed}s`
}

function share() {
    let resultURL = `${domain}/simulate.html?g=${compressGrid()}&a=${sessionStorage.getItem("algorithms")}&b=${sessionStorage.getItem("benchmark")}`
    navigator.clipboard.writeText(resultURL)
    document.getElementById("share").innerHTML = `<img src="./icons/clipboard-check.svg" alt="Start" width="23" height="23" class="svgs" style="align-self: last baseline;">&nbsp;&nbsp;Copied!`
}

function compressGrid() {
    let compressed = grid.data.map(cell => compressMap[cell]).join('')
    return `${grid.width}_${grid.height}_${compressed}`
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
        let state = decompressMap[char];
        if (!state) throw new Error(`Invalid character: ${char}`)
        data.push(state)
    }

    return { "width": width, "height": height, "data": data }
}