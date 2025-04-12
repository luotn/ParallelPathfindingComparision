let width = 0;
let height = 0;
let walls = []
let start = [0, 0]
let target = [0, 0]
let holdingCell = null
let lastCellLocation = []
let gridOK = false

let algorithms = []

function createGrid() {
    width = parseInt(document.getElementById("width").value)
    height = parseInt(document.getElementById("height").value)

    // Draw grid
    let result = `<table id="board">\n<tbody>\n`
    for (let y = 0; y < height; y++) {
        result += `<tr id="row ${y}">\n`
        for (let x = 0; x < width; x++) {
            result += `<td id="${x}-${y}" role="cell" class="unvisited"></td>\n`
        }
        result += `</tr>\n`
    }
    result += `</tbody>\n</table>\n`
    document.getElementById("gridPrview").innerHTML = result

    // Caculate default start and target position
    let defaultY = parseInt(height / 2)
    let defaultX = parseInt(width / 2)
    // For most grids
    if (width > 1) {
        start = [defaultX - 1, defaultY]
        target = [defaultX, defaultY]
        // Spcial case for 1 x n grid
    } else if (width == 1) {
        start = [0, defaultY - 1]
        target = [0, defaultY]
    }

    // Update cell for start and target
    document.getElementById(`${start[0]}-${start[1]}`).className = "start"
    document.getElementById(`${target[0]}-${target[1]}`).className = "target"

    gridOK = true
    updateButtons()

    // Add eventlisteners
    document.querySelectorAll('[role="cell"]').forEach(function(cell) {
        cell.addEventListener("mousedown", function(event) {
            if(event.button == 0) {
                switch(cell.getAttribute("class")) {
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
        cell.addEventListener("mouseenter", function() {
            cellClass = cell.getAttribute("class")
            if (holdingCell == "start" || holdingCell == "target") {
                updateCell(cell, holdingCell)
            } else if (holdingCell == "wall" || holdingCell == "unvisited") {
                if (cellClass != "start" && cellClass != "target") {
                    updateCell(cell, holdingCell)
                }
            }
        })

        // When mourse leaves a cell while holding start
        // Update grid to remove start/target in current cell
        // Hold save sction until mouse up
        cell.addEventListener("mouseleave", function() {
            cellClass = cell.getAttribute("class")
            if (cellClass == "start" && holdingCell == "start") {
                updateCell(cell, "unvisited")
            } else if (cellClass == "target" && holdingCell == "target") {
                updateCell(cell, "unvisited")
            }
        })

        // Save the current grid settings to global variable
        cell.addEventListener("mouseup", function(event) {
            if(event.button == 0) {
                holdingCell = null
                try {
                    start = getPosFromID(document.getElementsByClassName("start")[0])
                    target = getPosFromID(document.getElementsByClassName("target")[0])

                    try {
                        wallElements = document.getElementsByClassName("wall")
                        walls = []
                        for(let i = 0; i < wallElements.length; i++) {
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
    });
}

function getPosFromID(element) {
    return element.getAttribute("id").split("-").map(function(pos) {
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
    if (element == "width") {
        width = data
    } else if (element == "height") {
        height = data
    }
    gridOK = false
    updateButtons()
}

function changeAlgorithm(algorithm) {
    let index = algorithms.indexOf(algorithm)
    if(index == -1) {
        algorithms.push(algorithm)
    } else {
        algorithms.splice(index, 1)
    }
    updateButtons()
}

function updateButtons() {
    if (width != 0 && height != 0 && width * height > 1) {
        document.getElementById("createGrid").disabled = false
    } else {
        document.getElementById("createGrid").disabled = true
    }

    if(gridOK && algorithms.length > 0) {
        document.getElementById("simulate").disabled = false
    } else {
        document.getElementById("simulate").disabled = true
    }
}

function simulate() {
    // Save simulation settings to session storage
    let grid = new Grid(width, height)
    grid.setCell(start, "start")
    grid.setCell(target, "target")
    walls.forEach(function(wall) {
        grid.setCell(wall, "wall")
    })
    sessionStorage.setItem("grid", JSON.stringify(grid))
    sessionStorage.setItem("algorithms", algorithms)
    grid.print()
}