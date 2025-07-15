class DOMDriver {
    constructor(grid, algorithms, stepHistory, queueHistory, targetDOMElement) {
        this.Grid = grid
        this.Algorithms = algorithms
        this.StepHistory = stepHistory
        this.QueueHistory = queueHistory
        this.DOMElementRoot = targetDOMElement
        this.CellReferences = {}
        this.preLoadImages()
    }

    // Visualise result
    drawGrid() {
        let visualResult = `<a style="color: orange">WARNING: WebGPU or the full functionality of WebGPU is not supported in this browser!</a><br>Performance will be drastically reduced!<br>Please use Chrome/Edge 113+, Safari Technology Preview, Opera 99+, Chrome for Android 138+, Samsung Internet 24+, Opera Mobile 80+ <br>Or enable WebGPU flag on Safari or Firefox.<br><br>`

        // Add visual for each algorithm
        for (const algorithm of this.Algorithms) {
            // Statistics
            visualResult += `${algorithm}: ${this.StepHistory[algorithm].history.length} steps found path with length ${this.StepHistory[algorithm].steps.length - 1} in ${Math.round(this.StepHistory[algorithm].time)}ms.`

            // Draw initial grid
            visualResult += `<table class="board ${algorithm}">\n<tbody>\n`
            for (let y = 0; y < this.Grid.height; y++) {
                visualResult += `<tr id="row ${y}">\n`
                for (let x = 0; x < this.Grid.width; x++) {
                    let style = ""
                    if (this.Grid.getCell([x, y]) === "start")
                        style += " style='filter: invert(33%) sepia(71%) saturate(4592%) hue-rotate(6deg) brightness(106%) contrast(106%);'"

                    visualResult += `<td id="${x}-${y}" role="cell" class="${this.Grid.getCell([x, y])}"${style}></td>\n`
                }
                visualResult += `</tr>\n`
            }
            visualResult += `</tbody>\n</table>\n`
        }

        document.getElementById(this.DOMElementRoot).innerHTML = visualResult

        this.saveReferences()
    }

    preLoadImages() {
        var image = new Image()
        image.src = "./icons/arrow-up-square-fill.svg"
        image.src = "./icons/arrow-down-square-fill.svg"
        image.src = "./icons/arrow-left-square-fill.svg"
        image.src = "./icons/arrow-right-square-fill.svg"
        image.src = "./icons/door-open-fill.svg"
        image.src = "./icons/door-closed.svg"
        image.src = "./icons/emoji-sunglasses-fill.svg"
        image.src = "./icons/emoji-sunglasses-fill.svg"
        image.src = "./icons/square-fill.svg"
        image.src = "./icons/square.svg"
        image.src = "./icons/x-square.svg"
    }

    // Save cell references
    saveReferences() {
        for (const algorithm of this.Algorithms) {
            this.CellReferences[algorithm] = []
            const table = document.querySelector(`table.board.${algorithm}`)
            for (let y = 0; y < this.Grid.height; y++) {
                const row = table.rows[y]
                for (let x = 0; x < this.Grid.width; x++) {
                    this.CellReferences[algorithm][y * this.Grid.width + x] = row.cells[x]
                }
            }
        }
    }

    // Update algorithm results
    updateVisuals(currentStep, lastRenderedStep) {
        for (const algorithm of this.Algorithms) {
            const {history, steps, directions} = this.StepHistory[algorithm]
            const algorithmSteps = history.length

            const queue = this.QueueHistory[algorithm]

            // Calculate render range
            const startStep = lastRenderedStep
            const endStep = currentStep
            const isForward = endStep > startStep

            this.CellReferences[algorithm].forEach(cell => cell.removeAttribute("style"))
            this.CellReferences[algorithm].forEach(cell => cell.innerHTML = "")
            const starts = document.getElementsByClassName("start")
            Array.prototype.forEach.call(starts, function (start) {
                start.innerHTML = ""
            })

            // Show which cell is being searched and which cells are in the queue/stack
            const searchingStep = currentStep <= algorithmSteps ? currentStep : -1
            if (searchingStep != -1 && currentStep < algorithmSteps) {
                const [searchingX, searchingY] = Object.keys(history[searchingStep])[0].split("-").map(function (item) {
                    return parseInt(item)
                })

                // Queue might be array or objects, convert array into objects and rename different markings to score
                // Did not convert to maintain accuracy of benchmark
                // e.g. [{pos: [2, 5], score: 1}, {pos: [2, 7], score: 1}]
                const currentStepQueue = queue[searchingStep]
                const formattedCurrentStepQueue = []
                if (Array.isArray(currentStepQueue[0])) {
                    currentStepQueue.forEach(queueItem => {
                        formattedCurrentStepQueue.push({pos: queueItem, score: -1})
                    })
                } else {
                    // Get score name/key
                    const scoreKey = Object.keys(currentStepQueue[0])[1]
                    currentStepQueue.forEach(queueItem => {
                        formattedCurrentStepQueue.push({pos: queueItem.pos, score: queueItem[scoreKey]})
                    })
                }

                // Add score to visited
                formattedCurrentStepQueue.forEach(queueCell => {
                    const pos = queueCell.pos
                    const score = queueCell.score
                    if (score != -1)
                        this.CellReferences[algorithm][pos[1] * this.Grid.width + pos[0]].innerHTML = score
                    else
                        this.CellReferences[algorithm][pos[1] * this.Grid.width + pos[0]].innerHTML = "0"
                })

                // Set searching cell to #FFFF00, filter generated by: https://codepen.io/sosuke/pen/Pjoqqp
                this.CellReferences[algorithm][searchingY * this.Grid.width + searchingX].setAttribute("style", "filter: invert(33%) sepia(71%) saturate(4592%) hue-rotate(6deg) brightness(106%) contrast(106%);")
            }

            // Reverse
            if (!isForward) {
                for (let step = startStep; step >= endStep; step--) {
                    if (step >= algorithmSteps) continue
                    const cells = Object.values(history[step]).flat()
                    cells.forEach(([x, y]) => {
                        const index = y * this.Grid.width + x
                        if (this.CellReferences[algorithm][index].className !== "start" &&
                            this.CellReferences[algorithm][index].className !== "target") 
                        {
                            this.CellReferences[algorithm][index].className = "unvisited"
                        }
                    })
                }
                // Forward
            } else {
                for (let step = startStep; step < endStep; step++) {
                    if (step >= algorithmSteps) continue
                    const cells = Object.values(history[step]).flat()
                    cells.forEach(([x, y]) => {
                        const index = y * this.Grid.width + x
                        if (this.CellReferences[algorithm][index].className !== "start" &&
                            this.CellReferences[algorithm][index].className !== "target") 
                        {
                            this.CellReferences[algorithm][index].className = "visited"
                        }
                    })
                }
            }

            // Draw and un-draw path
            const isFinalStep = currentStep >= algorithmSteps
            const wasFinalStep = lastRenderedStep >= algorithmSteps

            if (wasFinalStep && !isFinalStep) {
                this.drawPath(algorithm, false, currentStep)
            }

            if (isFinalStep && steps.length > 0) {
                this.drawPath(algorithm, true, currentStep)
            }
        }

        return currentStep
    }

    drawPath(algorithm, draw, currentStep) {
        const {steps, directions} = this.StepHistory[algorithm]
        for (let pathStep = 1; pathStep < this.StepHistory[algorithm].steps.length; pathStep++) {
            const [x, y] = steps[pathStep]
            if (draw) {
                this.CellReferences[algorithm][y * this.Grid.width + x].className = directions[pathStep]
            } else {
                this.CellReferences[algorithm][y * this.Grid.width + x].className = currentStep == 0 ? "unvisited" : "visited"
            }
        }
        // Update target cell
        const [targetX, targetY] = this.Grid.getTargetPos()
        this.CellReferences[algorithm][targetY * this.Grid.width + targetX].className = draw ? "targetReached" : "target"
    }
}