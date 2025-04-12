class Grid {
    constructor(width, height) {
        this.width = width
        this.height = height
        this.data = []
        for(let i = 0; i < width * height; i++) {
            this.data[i] = 0.0
        }
    }

    setCell(row, col, value) {
        this.data[row * (col * this.width) + col] = value
    }

    print() {
        
    }
}