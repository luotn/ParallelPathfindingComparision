class DOMDriver {
    constructor(grid, algorithms, stepHistory, targetDOMElement) {
        this.Grid = grid
        this.Algorithms = algorithms
        this.StepHistory = stepHistory
        this.DOMElementRoot = targetDOMElement
        this.CellReferences = {}
        this.preLoadImages()
        return this.constructVisuals()
    }
    // Visualise result
    constructVisuals() {
        // Find largest steps
        for (const algorithm of this.Algorithms) {
            const algorithmStep = this.StepHistory[algorithm].history.length
            MaxStep = algorithmStep > MaxStep ? algorithmStep : MaxStep
        }
        let visualResult = `<a style="color: orange">WARNING: WebGPU or the full functionality of WebGPU is not supported in this browser!</a><br>Performance will be drastically reduced!<br>Please use Chrome/Edge 113+, Safari Technology Preview, Opera 99+, Chrome for Android 138+, Samsung Internet 24+, Opera Mobile 80+ <br>Or enable WebGPU flag on Safari or Firefox.<br><br>`

        // Add visual for each algorithm
        for (const algorithm of Algorithms) {
            // Statistics
            visualResult += `${algorithm}: ${this.StepHistory[algorithm].history.length} steps found path with length ${this.StepHistory[algorithm].steps.length - 1} in ${Math.round(this.StepHistory[algorithm].time)}ms.`

            // Draw initial grid
            visualResult += `<table class="board ${algorithm}">\n<tbody>\n`
            for (let y = 0; y < Grid.height; y++) {
                visualResult += `<tr id="row ${y}">\n`
                for (let x = 0; x < Grid.width; x++) {
                    let style = ""
                    if (Grid.getCell([x, y]) === "start")
                        style += " style='filter: invert(33%) sepia(71%) saturate(4592%) hue-rotate(6deg) brightness(106%) contrast(106%);'"

                    visualResult += `<td id="${x}-${y}" role="cell" class="${Grid.getCell([x, y])}"${style}></td>\n`
                }
                visualResult += `</tr>\n`
            }
            visualResult += `</tbody>\n</table>\n`
        }

        document.getElementById(this.DOMElementRoot).innerHTML = visualResult

        this.saveReferences()
    }

    preLoadImages() {
        var image = new Image();
        image.src = "./icons/arrow-down-square-fill.svg"
        image.src = "./icons/arrow-up-square-fill.svg"
        image.src = "./icons/arrow-left-square-fill.svg"
        image.src = "./icons/door-open-fill.svg"
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
    updateVisuals() {
        for (const algorithm of this.Algorithms) {
            const { history, steps, directions } = this.StepHistory[algorithm]
            const algorithmSteps = history.length

            const queue = QueueHistory[algorithm]

            // Calculate render range
            const startStep = LastRenderedStep
            const endStep = CurrentStep
            const isForward = endStep > startStep

            CellReferences[algorithm].forEach(cell => cell.removeAttribute("style"))
            CellReferences[algorithm].forEach(cell => cell.innerHTML = "")
            const starts = document.getElementsByClassName("start")
            Array.prototype.forEach.call(starts, function (start) {
                start.innerHTML = ""
            })

            // Show which cell is being searched and which cells are in the queue/stack
            const searchingStep = CurrentStep <= algorithmSteps ? CurrentStep : -1
            if (searchingStep != -1 && CurrentStep < algorithmSteps) {
                const [searchingX, searchingY] = Object.keys(history[searchingStep])[0].split("-").map(function (item) {
                    return parseInt(item);
                })

                // Queue might be array or objects, convert array into objects and rename different markings to score
                // Did not convert to maintain accuracy of benchmark
                // e.g. [{pos: [2, 5], score: 1}, {pos: [2, 7], score: 1}]
                const currentStepQueue = queue[searchingStep]
                const formattedCurrentStepQueue = []
                if (Array.isArray(currentStepQueue[0])) {
                    currentStepQueue.forEach(queueItem => {
                        formattedCurrentStepQueue.push({ pos: queueItem, score: -1 })
                    })
                } else {
                    // Get score name/key
                    const scoreKey = Object.keys(currentStepQueue[0])[1]
                    currentStepQueue.forEach(queueItem => {
                        formattedCurrentStepQueue.push({ pos: queueItem.pos, score: queueItem[scoreKey] })
                    })
                }

                // Add score to visited
                formattedCurrentStepQueue.forEach(queueCell => {
                    const pos = queueCell.pos
                    const score = queueCell.score
                    if (score != -1)
                        CellReferences[algorithm][pos[1] * Grid.width + pos[0]].innerHTML = score
                    else
                        CellReferences[algorithm][pos[1] * Grid.width + pos[0]].innerHTML = "0"
                })

                // Set searching cell to #FFFF00, filter generated by: https://codepen.io/sosuke/pen/Pjoqqp
                CellReferences[algorithm][searchingY * Grid.width + searchingX].setAttribute("style", "filter: invert(33%) sepia(71%) saturate(4592%) hue-rotate(6deg) brightness(106%) contrast(106%);")
            }

            // Reverse
            if (!isForward) {
                for (let step = startStep; step >= endStep; step--) {
                    if (step >= algorithmSteps) continue
                    const cells = Object.values(history[step]).flat()
                    cells.forEach(([x, y]) => {
                        const index = y * Grid.width + x
                        if (CellReferences[algorithm][index].className !== "start" &&
                            CellReferences[algorithm][index].className !== "target") {
                            CellReferences[algorithm][index].className = "unvisited"
                        }
                    })
                }
                // Forward
            } else {
                for (let step = startStep; step < endStep; step++) {
                    if (step >= algorithmSteps) continue
                    const cells = Object.values(history[step]).flat()
                    cells.forEach(([x, y]) => {
                        const index = y * Grid.width + x
                        if (CellReferences[algorithm][index].className !== "start" &&
                            CellReferences[algorithm][index].className !== "target") {
                            CellReferences[algorithm][index].className = "visited"
                        }
                    })
                }
            }

            // Draw and un-draw path
            const isFinalStep = CurrentStep >= algorithmSteps
            const wasFinalStep = LastRenderedStep >= algorithmSteps

            if (wasFinalStep && !isFinalStep) {
                drawPath(algorithm, false)
            }

            if (isFinalStep && steps.length > 0) {
                drawPath(algorithm, true)
            }
        }

        LastRenderedStep = CurrentStep
    }

    drawPath(algorithm, draw) {
        const { steps, directions } = StepHistory[algorithm]
        for (let pathStep = 1; pathStep < StepHistory[algorithm].steps.length; pathStep++) {
            const [x, y] = steps[pathStep]
            if (draw) {
                CellReferences[algorithm][y * Grid.width + x].className = directions[pathStep]
            } else {
                CellReferences[algorithm][y * Grid.width + x].className = CurrentStep == 0 ? "unvisited" : "visited"
            }
        }
        // Update target cell
        const [targetX, targetY] = Grid.getTargetPos()
        CellReferences[algorithm][targetY * Grid.width + targetX].className = draw ? "targetReached" : "target"
    }
}