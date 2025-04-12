function init() {

}

function createGrid() {
    width = parseInt(document.getElementById("width").value)
    height = parseInt(document.getElementById("height").value)
    if (Number.isNaN(width) || Number.isNaN(height) || width == 0 || height == 0) {
        alert("Grid size must be integer and larger than 0!")
    }
    if (width * height < 2) {
        alert("Grid size must be larger than 2!")
    } else {
        console.log(`Creating ${width} x ${height} grid...`)
        let result = `<table id="board">\n<tbody>\n`
        for(let y = 0; y < height; y++) {
            result += `<tr id="row ${y}">\n`
            for (let x = 0; x < width; x++) {
                result += `<td id="${x}-${y}" class="unvisited"></td>\n`
            }
            result += `</tr>\n`
        }
        result += `</tbody>\n</table>\n`
        document.getElementById("gridPrview").innerHTML = result
    }
}

function checkElementIsInt(element) {
    data = parseInt(document.getElementById(element).value)
    if (Number.isNaN(data) || data == 0) {
        document.getElementById(element + "Group").className = "list-group-item list-group-item-danger"
    } else {
        document.getElementById(element + "Group").className = "list-group-item"
    }
}