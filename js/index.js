let width = 0
let height = 0
let walls = []
let start = [0, 0]
let target = [0, 0]
let holdingCell = null
let lastCellLocation = []
let gridOK = false
let positionViewer
let positionText
let algorithms = []

function init() {
    let gridString = sessionStorage.getItem("grid")
    let algorithmString = sessionStorage.getItem("algorithms")
    let benchmark = JSON.parse(sessionStorage.getItem("benchmark"))
    if (gridString != undefined && algorithmString != undefined && benchmark != null) {
        console.log("Reloading grid...")
        // Reconstruct grid object
        plainObj = JSON.parse(gridString)
        height = plainObj.height
        width = plainObj.width

        // Reconstuct algorithms
        algorithms = JSON.parse(algorithmString)

        // Put grid setting back
        document.getElementById("width").value = width
        document.getElementById("height").value = height
        document.getElementById("benchmark").checked = benchmark

        // Put grid data back
        let result = `<table class="board">\n<tbody>\n`
        for (let y = 0; y < height; y++) {
            result += `<tr id="row ${y}">\n`
            for (let x = 0; x < width; x++) {
                let cellData = plainObj.data[y * width + x]
                result += `<td id="${x}-${y}" role="cell" class="${cellData}"></td>\n`

                switch (cellData) {
                    case "start":
                        start = [x, y]
                        break
                    case "target":
                        target = [x, y]
                        break
                    case "wall":
                        walls.push([x, y])
                        break
                }
            }
            result += `</tr>\n`
        }
        result += `</tbody>\n</table>\n`
        document.getElementById("gridPreview").innerHTML = result

        // Put algorithms settings back
        for (let algorithm of algorithms) {
            document.getElementById(algorithm).checked = true
        }
        addEventListeners()
        gridOK = true
        updateButtons()
    }

    positionViewer = bootstrap.Toast.getOrCreateInstance(document.getElementById('positionViewer'))
    positionText = document.getElementById("positionText")
}

function clearWalls() {
    for (let i = 0; i < walls.length; i++) {
        let cell = walls[i]
        document.getElementById(`${cell[0]}-${cell[1]}`).className = "unvisited"
    }
    walls = []
    updateButtons()
}

function createGrid() {
    width = parseInt(document.getElementById("width").value)
    height = parseInt(document.getElementById("height").value)

    // Draw grid
    let result = `<table class="board">\n<tbody>\n`
    for (let y = 0; y < height; y++) {
        result += `<tr id="row ${y}">\n`
        for (let x = 0; x < width; x++) {
            result += `<td id="${x}-${y}" role="cell" class="unvisited"></td>\n`
        }
        result += `</tr>\n`
    }
    result += `</tbody>\n</table>\n`
    document.getElementById("gridPreview").innerHTML = result

    // For most grids
    if (width > 1) {
        start = [0, 0]
        target = [1, 0]
        // Spcial case for 1 x n grid
    } else if (width == 1) {
        start = [0, 0]
        target = [0, 1]
    }

    // Update cell for start and target
    document.getElementById(`${start[0]}-${start[1]}`).className = "start"
    document.getElementById(`${target[0]}-${target[1]}`).className = "target"

    gridOK = true
    walls = []
    updateButtons()

    addEventListeners()
}

function addEventListeners() {
    // Add eventlisteners
    document.querySelectorAll('[role="cell"]').forEach(function (cell) {
        cell.addEventListener("mousedown", function (event) {
            if (event.button == 0) {
                switch (cell.getAttribute("class")) {
                    case "start":
                        holdingCell = "start"
                        break
                    case "target":
                        holdingCell = "target"
                        break
                    case "unvisited":
                        holdingCell = "wall"
                        cell.className = "wall"
                        break
                    case "wall":
                        holdingCell = "unvisited"
                        cell.className = "unvisited"
                }
                gridOK = false
                updateButtons()
            }
        })

        // When mouse enter a empty cell while holding start/target/wall
        // Update grid to reflect new start/target/wall position
        // Hold save action until mouse up
        cell.addEventListener("mouseenter", function () {
            updatePositionViewer(cell)
            cellClass = cell.getAttribute("class")
            if (holdingCell == "start" || holdingCell == "target") {
                if (cellClass == "unvisited")
                    updateCell(cell, holdingCell)
            }
            else if (holdingCell == "wall" || holdingCell == "unvisited") {
                if (cellClass != "start" && cellClass != "target")
                    updateCell(cell, holdingCell)
            }
        })

        // When mourse leaves a cell while holding start
        // Update grid to remove start/target in current cell
        // Hold save sction until mouse up
        cell.addEventListener("mouseleave", function () {
            cellClass = cell.getAttribute("class")
            if (cellClass == "start" && holdingCell == "start")
                updateCell(cell, "unvisited")
            else if (cellClass == "target" && holdingCell == "target")
                updateCell(cell, "unvisited")
        })

        // Save the current grid settings to global variable
        cell.addEventListener("mouseup", function (event) {
            if (event.button == 0) {
                holdingCell = null
                try {
                    start = getPosFromID(document.getElementsByClassName("start")[0])
                    target = getPosFromID(document.getElementsByClassName("target")[0])

                    try {
                        wallElements = document.getElementsByClassName("wall")
                        walls = []
                        for (let i = 0; i < wallElements.length; i++) {
                            walls[i] = getPosFromID(wallElements[i])
                        }
                    } catch (error) {
                        walls = []
                    }
                    gridOK = true
                    updateButtons()
                } catch (error) {
                    alert(`Grid is missing start and/or target cell, click "Create Grid" to start over.`)
                    gridOK = false
                    updateButtons()
                }
            }
        })
    })

    let gridPreview = document.getElementById("gridPreview")
    gridPreview.addEventListener("mouseenter", function () {
        positionViewer.show()
    })
    gridPreview.addEventListener("mouseleave", function () {
        positionViewer.hide() 
    })
}

function updatePositionViewer(cell) {
    let cellPosition = getPosFromID(cell)
    positionText.innerHTML = `[${cellPosition[0]}, ${cellPosition[1]}]`
}

function getPosFromID(element) {
    return element.getAttribute("id").split("-").map(function (pos) {
        return parseInt(pos)
    })
}

function updateCell(cell, state) {
    cell.className = state
}

function checkElementIsInt(element) {
    data = parseInt(document.getElementById(element).value)
    if (Number.isNaN(data) || data < 1) {
        document.getElementById(element + "Group").className = "list-group-item list-group-item-danger"
        data = 0
    } else {
        document.getElementById(element + "Group").className = "list-group-item"
    }
    if (element == "width")
        width = data
    else if (element == "height")
        height = data

    gridOK = false
    updateButtons()
}

function changeAlgorithm(algorithm) {
    let index = algorithms.indexOf(algorithm)
    if (index == -1)
        algorithms.push(algorithm)
    else
        algorithms.splice(index, 1)
    updateButtons()
}

function updateButtons() {
    if (width != 0 && height != 0 && width * height > 1) {
        document.getElementById("createGrid").disabled = false
    } else {
        document.getElementById("createGrid").disabled = true
    }
    if (gridOK && walls.length > 0)
        document.getElementById("clearWalls").disabled = false
    else
        document.getElementById("clearWalls").disabled = true

    if (gridOK && algorithms.length > 0)
        document.getElementById("simulate").disabled = false
    else
        document.getElementById("simulate").disabled = true
}

function simulate() {
    // Save simulation settings to session storage
    let grid = new GRID(width, height)
    grid.setCell(start, "start")
    grid.setCell(target, "target")
    walls.forEach(wall => {
        grid.setCell(wall, "wall")
    })
    sessionStorage.setItem("grid", JSON.stringify(grid))
    sessionStorage.setItem("algorithms", JSON.stringify(algorithms))

    // Save benchmark settings to sessionStorage
    if (document.getElementById("benchmark").checked)
        sessionStorage.setItem("benchmark", true)
    else
        sessionStorage.setItem("benchmark", false)
    console.log(`Simulation settings saved to session storage, proceeding to simulate...`)
    window.location.href = "./simulate.html"
}