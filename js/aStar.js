class AStar {
    constructor(grid) {
        this.grid = grid
        this.grid.getStartPos()
        this.grid.getTargetPos()
        this.priorityQueue = []
        this.parent = {}
        this.gScore = {}
        this.directions = ["up", "down", "left", "right"]
    }

    run() {
        const start = this.grid.start
        const target = this.grid.target

        // Init start point score
        this.gScore[`${start[0]},${start[1]}`] = 0
        const startFScore = this.grid.taxiCabDistanceToTarget(start)
        this.priorityQueue.push({ pos: start, fScore: startFScore })

        this.parent[`${start[0]},${start[1]}`] = null

        while (this.priorityQueue.length > 0) {
            // Sort by total score, use min
            this.priorityQueue.sort((a, b) => a.fScore - b.fScore)
            const current = this.priorityQueue.shift().pos
            const [currentX, currentY] = current

            // Arrived
            if (currentX === target[0] && currentY === target[1])
                return this._constructPath(current)

            // Explore 4 directions
            for (const dir of this.directions) {
                const [cellState, nextPos] = this.grid.getCellAt(current, dir)
                const [nextX, nextY] = nextPos
                const nextKey = `${nextX},${nextY}`

                // Skip walls
                if (cellState === "wall") continue

                // Calculate score of new cell (step + 1)
                const tentativeGScore = this.gScore[`${currentX},${currentY}`] + 1

                // Update if new route has lower score
                if (this.gScore[nextKey] === undefined || tentativeGScore < this.gScore[nextKey]) {
                    this.parent[nextKey] = [currentX, currentY]
                    this.gScore[nextKey] = tentativeGScore
                    const fScore = tentativeGScore + this.grid.taxiCabDistanceToTarget(nextPos)

                    // Avoid duplications
                    if (!this.priorityQueue.some(item => item.pos[0] === nextX && item.pos[1] === nextY))
                        this.priorityQueue.push({ pos: nextPos, fScore })
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
            const key = `${node[0]},${node[1]}`
            node = this.parent[key]
        }
        return path
    }
}