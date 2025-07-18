class AStar {
    constructor(grid) {
        this.grid = grid
        this.grid.getStartPos()
        this.grid.getTargetPos()
        this.priorityQueue = []
        this.queueHistory = []
        this.parent = {}
        this.gScore = {}
        this.directions = ["up", "down", "left", "right"]
        this.visitHistory = []
        this.visitedHistory = new Set()
    }

    run() {
        const start = this.grid.start
        const target = this.grid.target

        this.gScore[`${start[0]}, ${start[1]}`] = 0
        const startFScore = this.grid.taxiCabDistanceToTarget(start)
        this.priorityQueue.push({pos: start, fScore: startFScore})
        this.parent[`${start[0]}, ${start[1]}`] = null
        let step = 0

        while (this.priorityQueue.length > 0) {
            // Hard copy queue to avoid further changes
            this.queueHistory[step] = Array.from(this.priorityQueue)

            this.priorityQueue.sort((a, b) => a.fScore - b.fScore)
            const current = this.priorityQueue.shift().pos
            const [currentX, currentY] = current

            const cellName = `${currentX}-${currentY}`
            this.visitHistory[step] = {}
            this.visitHistory[step][cellName] = []

            for (const dir of this.directions) {
                const [cellState, nextPos] = this.grid.getCellAt(current, dir)
                const [nextX, nextY] = nextPos
                const nextKey = `${nextX}, ${nextY}`

                if (cellState === "wall" || (nextX === -1 && nextY === -1)) continue

                // Early exit when finding target
                if (cellState === "target") {
                    this.visitHistory[step][cellName].push(nextPos)
                    this.parent[nextKey] = [currentX, currentY]
                    return [this._constructPath(nextPos), this.visitHistory, this.queueHistory]
                }

                if (cellState === "unvisited" && !this.visitedHistory.has(nextKey)) {
                    this.visitHistory[step][cellName].push(nextPos)
                    this.visitedHistory.add(nextKey)
                }

                const tentativeGScore = this.gScore[`${currentX}, ${currentY}`] + 1
                if (this.gScore[nextKey] === undefined || tentativeGScore < this.gScore[nextKey]) {
                    this.parent[nextKey] = [currentX, currentY]
                    this.gScore[nextKey] = tentativeGScore
                    const fScore = tentativeGScore + this.grid.taxiCabDistanceToTarget(nextPos)
                    this.priorityQueue.push({pos: nextPos, fScore})
                }
            }
            step++
        }
        return []
    }

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