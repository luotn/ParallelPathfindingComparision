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
        let col = pos[0]
        let row = pos[1]
        this.data[row * this.width + col] = value
    }

    getCell(pos, direction) {
        let col = pos[0]
        let row = pos[1]
        let currentIndex = row * this.width + col
        let cellState = "wall"
        let nextPos = [col, row]
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

    taxiCabDistanceToTarget(pos) {
        let col = pos[0]
        let row = pos[1]
        return Math.abs(col - this.target[0]) + Math.abs(row - this.target[1])
    }

    print() {
        let result = "---Grid---\n" + 
            "key:\n" + 
            "- = unvisited\n" + 
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
}