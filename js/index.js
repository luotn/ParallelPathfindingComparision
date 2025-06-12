let Width = 0
let Height = 0
let Walls = []
let Start = [0, 0]
let Target = [0, 0]
let HoldingCell = null
let LastCellLocation = []
let GridOK = false
let PositionViewer
let PositionText
let Algorithms = []

function init() {
    let gridString = sessionStorage.getItem("grid")
    let algorithmString = sessionStorage.getItem("algorithms")
    let benchmark = JSON.parse(sessionStorage.getItem("benchmark"))
    if (gridString != undefined && algorithmString != undefined && benchmark != null) {
        console.log("Reloading grid...")
        // Reconstruct grid object
        plainObj = JSON.parse(gridString)
        Height = plainObj.height
        Width = plainObj.width

        // Reconstuct algorithms
        Algorithms = JSON.parse(algorithmString)

        // Put grid setting back
        document.getElementById("width").value = Width
        document.getElementById("height").value = Height
        document.getElementById("benchmark").checked = benchmark

        // Put grid data back
        let result = `<table class="board">\n<tbody>\n`
        for (let y = 0; y < Height; y++) {
            result += `<tr id="row ${y}">\n`
            for (let x = 0; x < Width; x++) {
                let cellData = plainObj.data[y * Width + x]
                result += `<td id="${x}-${y}" role="cell" class="${cellData}"></td>\n`

                switch (cellData) {
                    case "start":
                        Start = [x, y]
                        break
                    case "target":
                        Target = [x, y]
                        break
                    case "wall":
                        Walls.push([x, y])
                        break
                }
            }
            result += `</tr>\n`
        }
        result += `</tbody>\n</table>\n`
        document.getElementById("gridPreview").innerHTML = result

        // Put algorithms settings back
        for (let algorithm of Algorithms) {
            document.getElementById(algorithm).checked = true
        }
        addEventListeners()
        GridOK = true
        updateButtons()
    }

    PositionViewer = bootstrap.Toast.getOrCreateInstance(document.getElementById('positionViewer'))
    PositionText = document.getElementById("positionText")
}

function clearWalls() {
    for (let i = 0; i < Walls.length; i++) {
        let cell = Walls[i]
        document.getElementById(`${cell[0]}-${cell[1]}`).className = "unvisited"
    }
    Walls = []
    updateButtons()
}

function createGrid() {
    Width = parseInt(document.getElementById("width").value)
    Height = parseInt(document.getElementById("height").value)

    // Draw grid
    let result = `<table class="board">\n<tbody>\n`
    for (let y = 0; y < Height; y++) {
        result += `<tr id="row ${y}">\n`
        for (let x = 0; x < Width; x++) {
            result += `<td id="${x}-${y}" role="cell" class="unvisited"></td>\n`
        }
        result += `</tr>\n`
    }
    result += `</tbody>\n</table>\n`
    document.getElementById("gridPreview").innerHTML = result

    // For most grids
    if (Width > 1) {
        Start = [0, 0]
        Target = [1, 0]
        // Spcial case for 1 x n grid
    } else if (Width == 1) {
        Start = [0, 0]
        Target = [0, 1]
    }

    // Update cell for start and target
    document.getElementById(`${Start[0]}-${Start[1]}`).className = "start"
    document.getElementById(`${Target[0]}-${Target[1]}`).className = "target"

    GridOK = true
    Walls = []
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
                        HoldingCell = "start"
                        break
                    case "target":
                        HoldingCell = "target"
                        break
                    case "unvisited":
                        HoldingCell = "wall"
                        cell.className = "wall"
                        break
                    case "wall":
                        HoldingCell = "unvisited"
                        cell.className = "unvisited"
                }
                GridOK = false
                updateButtons()
            }
        })

        // When mouse enter a empty cell while holding start/target/wall
        // Update grid to reflect new start/target/wall position
        // Hold save action until mouse up
        cell.addEventListener("mouseenter", function () {
            updatePositionViewer(cell)
            cellClass = cell.getAttribute("class")
            if (HoldingCell == "start" || HoldingCell == "target") {
                if (cellClass == "unvisited")
                    updateCell(cell, HoldingCell)
            }
            else if (HoldingCell == "wall" || HoldingCell == "unvisited") {
                if (cellClass != "start" && cellClass != "target")
                    updateCell(cell, HoldingCell)
            }
        })

        // When mourse leaves a cell while holding start
        // Update grid to remove start/target in current cell
        // Hold save sction until mouse up
        cell.addEventListener("mouseleave", function () {
            cellClass = cell.getAttribute("class")
            if (cellClass == "start" && HoldingCell == "start")
                updateCell(cell, "unvisited")
            else if (cellClass == "target" && HoldingCell == "target")
                updateCell(cell, "unvisited")
        })

        // Save the current grid settings to global variable
        cell.addEventListener("mouseup", function (event) {
            if (event.button == 0) {
                HoldingCell = null
                try {
                    Start = getPosFromID(document.getElementsByClassName("start")[0])
                    Target = getPosFromID(document.getElementsByClassName("target")[0])

                    try {
                        wallElements = document.getElementsByClassName("wall")
                        Walls = []
                        for (let i = 0; i < wallElements.length; i++) {
                            Walls[i] = getPosFromID(wallElements[i])
                        }
                    } catch (error) {
                        Walls = []
                    }
                    GridOK = true
                    updateButtons()
                } catch (error) {
                    alert(`Grid is missing start and/or target cell, click "Create Grid" to start over.`)
                    GridOK = false
                    updateButtons()
                }
            }
        })
    })

    let gridPreview = document.getElementById("gridPreview")
    gridPreview.addEventListener("mouseenter", function () {
        PositionViewer.show()
    })
    gridPreview.addEventListener("mouseleave", function () {
        PositionViewer.hide() 
    })
}

function updatePositionViewer(cell) {
    let cellPosition = getPosFromID(cell)
    PositionText.innerHTML = `[${cellPosition[0]}, ${cellPosition[1]}]`
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
        Width = data
    else if (element == "height")
        Height = data

    GridOK = false
    updateButtons()
}

function changeAlgorithm(algorithm) {
    let index = Algorithms.indexOf(algorithm)
    if (index == -1)
        Algorithms.push(algorithm)
    else
        Algorithms.splice(index, 1)
    updateButtons()
}

function updateButtons() {
    if (Width != 0 && Height != 0 && Width * Height > 1) {
        document.getElementById("createGrid").disabled = false
    } else {
        document.getElementById("createGrid").disabled = true
    }
    if (GridOK && Walls.length > 0)
        document.getElementById("clearWalls").disabled = false
    else
        document.getElementById("clearWalls").disabled = true

    if (GridOK && Algorithms.length > 0)
        document.getElementById("simulate").disabled = false
    else
        document.getElementById("simulate").disabled = true
}

function simulate() {
    // Save simulation settings to session storage
    let grid = new GRID(Width, Height)
    grid.setCell(Start, "start")
    grid.setCell(Target, "target")
    Walls.forEach(wall => {
        grid.setCell(wall, "wall")
    })
    sessionStorage.setItem("grid", JSON.stringify(grid))
    sessionStorage.setItem("algorithms", JSON.stringify(Algorithms))

    // Save benchmark settings to sessionStorage
    if (document.getElementById("benchmark").checked)
        sessionStorage.setItem("benchmark", true)
    else
        sessionStorage.setItem("benchmark", false)
    console.log(`Simulation settings saved to session storage, proceeding to simulate...`)
    window.location.href = "./simulate.html"
}