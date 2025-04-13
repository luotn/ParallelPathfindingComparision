class DFS {
    constructor(grid) {
        this.grid = grid
        this.grid.getStartPos()
        this.grid.getTargetPos()
        this.stack = []
        this.parent = {}
        this.directions = ["up", "down", "left", "right"]
    }

    run() {
        const start = this.grid.start
        const target = this.grid.target

        // Init stack and parent cell
        this.stack.push(start)
        this.parent[`${start[0]}, ${start[1]}`] = null

        while (this.stack.length > 0) {
            const current = this.stack.pop()
            const [currentX, currentY] = current

            // Arrived
            if (currentX === target[0] && currentY === target[1]) {
                return this._constructPath(current)
            }

            // Explore 4 directions
            for (const dir of this.directions) {
                const [cellState, nextPos] = this.grid.getCell(current, dir)
                const [nextX, nextY] = nextPos

                // Check if new cell is unvisited
                if (cellState === "unvisited" || cellState === "target") {
                    this.grid.setCell(nextPos, "visited")
                    this.stack.push(nextPos)
                    this.parent[`${nextX}, ${nextY}`] = [currentX, currentY]
                }
            }
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