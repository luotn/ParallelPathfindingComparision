class BFS {
    constructor(grid) {
        this.grid = grid
        this.grid.getStartPos()
        this.grid.getTargetPos()
        this.queue = []
        this.parent = {}
        this.directions = ["up", "down", "left", "right"]
    }

    run() {
        const start = this.grid.start
        const target = this.grid.target

        // Init queue, visted cells and parent cell
        this.queue.push(start)
        this.parent[`${start[0]}, ${start[1]}`] = null


        while (this.queue.length > 0) {
            const current = this.queue.shift()
            const [currentX, currentY] = current

            // Arrived
            if (currentX === target[0] && currentY === target[1]) {
                return this._constructPath(current)
            }

            // Explore 4 directions
            for (const dir of this.directions) {
                // Check if new cell is unvisited
                const [cellState, nextPos] = this.grid.getCell(current, dir)
                if (cellState == "unvisited" || cellState == "target") {
                    this.grid.setCell(nextPos, "visited")
                    this.queue.push(nextPos)
                    this.parent[`${nextPos[0]}, ${nextPos[1]}`] = [currentX, currentY]
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