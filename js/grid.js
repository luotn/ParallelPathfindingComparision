class Grid {
    constructor(width, height) {
        this.width = width
        this.height = height
        this.data = []
        for(let i = 0; i < width * height; i++) {
            this.data[i] = "unvisited"
        }
    }

    setCell(pos, value) {
        let col = pos[0]
        let row = pos[1]
        this.data[row * this.width + col] = value
    }

    print() {
        console.log(this.data)
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