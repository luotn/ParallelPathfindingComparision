class DFS {
    constructor(grid) {
        this.grid = grid
        this.grid.getStartPos()
        this.grid.getTargetPos()
        this.stack = []
        this.stackHistory = []
        this.parent = {}
        this.directions = ["up", "down", "left", "right"]
        this.visitHistory = []
        this.visited = new Set()
    }

    //  Order: right → left → down → up
    run() {
        const start = this.grid.start
        const target = this.grid.target

        // Init stack and parent cell
        this.stack.push(start)
        this.parent[`${start[0]}, ${start[1]}`] = null
        let step = 0

        while (this.stack.length > 0) {
            // Hard copy queue to avoid further changes
            this.stackHistory[step] = Array.from(this.stack)
            
            const current = this.stack.pop()
            const [currentX, currentY] = current

            const cellName = `${currentX}-${currentY}`
            this.visitHistory[step] = {}
            this.visitHistory[step][cellName] = []

            // Explore 4 directions
            for (const dir of this.directions) {
                const [cellState, nextPos] = this.grid.getCellAt(current, dir)
                const nextCellName = `${nextPos[0]}-${nextPos[1]}`

                if (cellState === "wall" || this.grid.isOutOfBounds(nextPos) || this.visited.has(nextCellName)) {
                    continue
                }

                // Check if next cell is the target
                if (cellState === "target") {
                    this.visitHistory[step][cellName].push(nextPos)
                    this.parent[`${nextPos[0]}, ${nextPos[1]}`] = [currentX, currentY]
                    const path = this._constructPath(nextPos)
                    return [path, this.visitHistory, this.stackHistory]
                }

                if (cellState === "unvisited") {
                    this.visitHistory[step][cellName].push(nextPos)
                    this.grid.setCell(nextPos, "visited")
                    this.stack.push(nextPos)
                    this.parent[`${nextPos[0]}, ${nextPos[1]}`] = [currentX, currentY]
                }
            }
            step++
        }
        return []
    }

    // Reconstruct backtrace path
    _constructPath(end) {
        const path = []
        let node = end
        while (node !== null) {
            path.unshift(node)
            const key = `${node[0]}, ${node[1]}`
            node = this.parent[key]
        }
        return path
    }
}