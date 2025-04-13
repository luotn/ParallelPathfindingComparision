class Dijkstra {
    constructor(grid) {
        this.grid = grid
        this.grid.getStartPos()
        this.grid.getTargetPos()
        this.priorityQueue = []  // 优先队列（按实际成本排序）
        this.parent = {}
        this.distances = {}      // 从起点到各节点的最短距离
        this.directions = ["up", "down", "left", "right"]
    }

    run() {
        const start = this.grid.start
        const target = this.grid.target

        // 初始化起点距离
        this.distances[`${start[0]},${start[1]}`] = 0
        this.priorityQueue.push({ pos: start, distance: 0 })
        this.parent[`${start[0]},${start[1]}`] = null

        while (this.priorityQueue.length > 0) {
            // 按距离排序，取最小值
            this.priorityQueue.sort((a, b) => a.distance - b.distance)
            const current = this.priorityQueue.shift()
            const [currentX, currentY] = current.pos

            // 到达目标点
            if (currentX === target[0] && currentY === target[1])
                return this._constructPath([currentX, currentY])

            // 探索四个方向
            for (const dir of this.directions) {
                const [cellState, nextPos] = this.grid.getCellAt([currentX, currentY], dir)
                const [nextX, nextY] = nextPos
                const nextKey = `${nextX},${nextY}`

                // 跳过墙和非法方向
                if (cellState === "wall") continue

                // 计算新路径的距离（当前距离 + 1）
                const tentativeDistance = this.distances[`${currentX},${currentY}`] + 1

                // 如果新路径更优，则更新
                if (this.distances[nextKey] === undefined || tentativeDistance < this.distances[nextKey]) {
                    this.distances[nextKey] = tentativeDistance
                    this.parent[nextKey] = [currentX, currentY]
                    this.priorityQueue.push({ pos: nextPos, distance: tentativeDistance })
                }
            }
        }
        return []
    }

    // 路径回溯（与 BFS/DFS/A* 一致）
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