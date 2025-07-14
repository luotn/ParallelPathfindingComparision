class GRID {
    constructor(width, height) {
        this.width = width
        this.height = height
        this.data = []
        for(let i = 0; i < width * height; i++) {
            this.data[i] = "unvisited"
        }
        this.start = []
        this.target = []
        this.visitHistory = {}
    }

    getTargetPos() {
        for (let y = 0; y < this.height; y++) {
            for(let x = 0; x < this.width; x++) {
                let currentCell = this.data[y * this.width + x]
                if (currentCell == "target") {
                    this.target = [x, y]
                    return [x, y]
                }
            }
        }
    }

    getStartPos() {
        for (let y = 0; y < this.height; y++) {
            for(let x = 0; x < this.width; x++) {
                let currentCell = this.data[y * this.width + x]
                if (currentCell == "start") {
                    this.start = [x, y]
                    return [x, y]
                }
            }
        }
    }

    setCell(pos, value) {
        this.data[pos[1] * this.width + pos[0]] = value
    }

    getCell(pos) { 
        return this.data[pos[1] * this.width + pos[0]]
    }

    getCellAt(pos, direction) {
        let col = pos[0]
        let row = pos[1]
        let currentIndex = row * this.width + col
        let cellState = "wall"
        let nextPos = [-1, -1]
        switch(direction) {
            case "up":
                if(row - 1 >= 0) {
                    cellState = this.data[currentIndex - this.width]
                    nextPos = [col, row - 1]
                }
                break
            case "down":
                if(row + 1 < this.height) {
                    cellState = this.data[currentIndex + this.width]
                    nextPos = [col, row + 1]
                }
                break
            case "left":
                if(col - 1 >= 0) {
                    cellState = this.data[currentIndex - 1]
                    nextPos = [col - 1, row]
                }
                break
            case "right":
                if(col + 1 < this.width) {
                    cellState = this.data[currentIndex + 1]
                    nextPos = [col + 1, row]
                }
                break
        }
        return [cellState, nextPos]
    }

    isOutOfBounds(pos) {
        return pos[0] < 0 || pos[0] > this.width || pos[1] < 0 || pos[1] > this.height
    }

    taxiCabDistanceToTarget(pos) {
        return Math.abs(pos[0] - this.target[0]) + Math.abs(pos[1] - this.target[1]) - 1
    }

    print() {
        let result = "---Grid---\n" + 
            "key:\n" + 
            "- = unvisited\n" + 
            "0 = visited\n" + 
            "s = start\n" +
            "t = target\n" + 
            "x = wall\n\n"
        for(let y = 0; y < this.height; y++) {
            for(let x = 0; x < this.width; x++) {
                let cell = ""
                switch (this.data[this.width * y + x]) {
                    case "unvisited":
                        cell = "-"
                        break
                    case "visited":
                        cell = "0"
                        break
                    case "start":
                        cell = "s"
                        break
                    case "target":
                        cell = "t"
                        break
                    case "wall":
                        cell = "x"
                        break
                    default:
                        cell = "?"
                }
                result += `${cell} `
            }
            result += `\n`
        }
        console.log(result)
    }

    toCellState() {
        let result = []
        // Reverse rows for gpu
        for(let y = this.height - 1; y >= 0 ; y--) {
            for(let x = 0; x < this.width; x++) {
                switch (this.data[this.width * y + x]) {
                    case "unvisited":
                        result.push(0)
                        break
                    case "visited":
                        result.push(0)
                        break
                    case "start":
                        result.push(-1)
                        break
                    case "target":
                        result.push(-2)
                        break
                    case "wall":
                        result.push(-3)
                        break
                    default:
                        result.push(-10)
                }
            }
        }
        return new Int32Array(result)
    }
}