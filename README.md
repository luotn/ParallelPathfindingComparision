# ParallelPathfindingComparision
This is the dissertation project for Luotn in KCL.

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0) 

## Project Folder Layout / Table of Content
luotn/ParallelPathfindingComparision/
├── index.html
├── simulate.html
├── .gitignore
├── LICENSE.md
├── README.md
├── js/
│   ├── index.js
│   ├── simulate.js
│   ├── domdriver.js
│   ├── gpudriver.js
│   ├── grid.js
│   ├── aStar.js
│   ├── dijkstra.js
│   ├── bfs.js
│   └── dfs.js
├── css/
│   ├── common.css
│   ├── simulate.css
└── icons/
    ├── [0~9].svg
    ├── github.svg
    ├── square-fill-orange.svg
    ├── arrow-up-square-fill.svg
    └── ... (Total of 38 items)

## Usage
This project does not have any depencdency.

### Self Host
Set project root folder as root folder of any http server. Then run the server and visit the defined address (and port).

Tested on VSCode live server with default settings, and GitHub Pages.

### Github Pages

Try it: [Github Pages](https://luotn.github.io/ParallelPathfindingComparision)

### Browser Compatability

Directly avaliable browsers: 
![Google Chrome](https://img.shields.io/badge/Google%20Chrome-4285F4?style=for-the-badge&logo=GoogleChrome&logoColor=white) ![Edge](https://img.shields.io/badge/Edge-0078D7?style=for-the-badge&logo=Microsoft-edge&logoColor=white) ![Opera](https://img.shields.io/badge/Opera-FF1B2D?style=for-the-badge&logo=Opera&logoColor=white)
Avaliable in Windows, macOS, and ChromeOS.

Avaliable browsers:
![Safari](https://img.shields.io/badge/Safari-000000?style=for-the-badge&logo=Safari&logoColor=white) Enable the WebGPU flag in features tab.

![Firefox](https://img.shields.io/badge/Firefox-FF7139?style=for-the-badge&logo=Firefox-Browser&logoColor=white) Enable WebGPU flag in nightly builds on Windows.

Compatability information in [MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API#browser_compatibility).

## Features:
 - [x] Share Link
 - [x] Edit grid after simulation
 - [x] Compare multiple algorithms in the same screen
 - [x] WebGPU accelerated, can handle enormous mazes
 - [x] Algorithm queue/stack and score viewing

## Example Simulations
[Fixed path](https://luotn.github.io/ParallelPathfindingComparision/simulate.html?g=14_20_swuuuwuuuwuuuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuwuuuwuuuwuuuwut&a=["AStar","Dijkstra","BFS","DFS"]&b=true)

[A* different from BFS Grid](https://luotn.github.io/ParallelPathfindingComparision/simulate.html?g=13_13_uuuuuuuuuuuuuuuuuuuwuuuuuuuuuuuuwuuuuuuuuuuuuwuuuuuuuuuuuuwuuuuuuuuuuuuwuuuuuuuusuuwuuuutuuuuuuuwwuuuuuuuuuuuuwuuuuuuuuuuuuwuuuuuuuuuuuuwuuuuuuuuuuuuwuuuuuuuuuuuuuuuuuuu&a=["AStar","Dijkstra","BFS","DFS"]&b=true)

[76 * 76 Stress Test](https://luotn.github.io/ParallelPathfindingComparision/simulate.html?g=70_70_suuuuuuuuuuuuuuwuuwwwwwwuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuwwwwwwwwwwwwwuuwuuwwwwwwuuuuuuuuwuwwwwuuuwwwwwwwuuuwwwwuuuuuuuuuuuuuuuuuuuuuuuuuuuwuuwuuwwwwwwuuuuuuuuwuwuuuwuuwuuuuuuuuwuuuuwuuuuuuuuuuuuuuuwwwwwwwwwwuwuuwuuwwwwwwuuuuuuuuwuwuuuuwuwuuuuuuuwuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuwuwuuwuuwwwwwwuuuuuuuuwuwuuuuwuwuuuuuuuwuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuwuwuuwuuwwwwwwuuuuuuuuwuwuuuuwuwuuuuuuuwuuuuuuuuuuuuuuuuuuuuuuwuuuuwuuwuwuuwuuwwwwwwuuuuuuuuwuwuuuwuuwwwwwuuuwuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuwuwuuwuuwwwwwwuuuuuuuuwuwwwwuuuwuuuuuuuuwwwwwuuuuuuuuuuuuuuuuuuuuuuuuuwuwuuwuuwwwwwwuuuuuuuuwuwuuuwuuwuuuuuuuuuuuuuwuuuuuuuuuuuuuuuuwuuuuwuuwuwuuwuuwwwwwwuuuuuuuuwuwuuuuuuwuuuuuuuuuuuuuwuuuuuuuuuuuuuuuuuwuuwuuuwuwuuwuuwwwwwwuuuuuuuuwuwuuuuuuwuuuuuuuuuuuuuwuuuuuuuuuuuuuuuuuuwwuuuuwuwuuwuuwwwwwwuuuuuuuuwuwuuuuuuwuuuuuuuuuuuuuwuuuuuuuuuuuuuuuuuuuuuuuuwuuuuwuuwwwwwwuuuuuuuuwuwuuuuuuwuuuuuuuuuuuuuwuuuuuuuuuuuuuuuuuuuuuuuuwuuuuwuuwwwwwwuuuuuuuuwuwuuuwuuwuuuuuuuuwuuuuwuuuuuuuuuuuuuuuuuuuuuuuuwwwwwwuuwwwwwwuuuuuuuuwuwwwwuuuwuuuuuuuuuwwwwuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuwuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuwwwwwwwwwwwwwwwwwwuwwwwwwwwuuuuuwuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuwuuuuuuuuuuwuuuuuuuwuuuuwuwwwwuuuuuuuuwuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuwuuuuuuuuuuwuuuuuuuwuuuuwuwuuuwuuuuuuuwuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuwuuuuuuuuuuwuuuuuuuuwuuuwuwuuuuwuuuuuuwuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuwuuuuuuuuuuwuuuuuuuuwuuuwuwuuuuwuuuuuuwuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuwuuuuuuuuuuwuuuuuuuuuwuuwuwuuuuuwuuuuuwuuuuuuuuuuuwuuuuuuuuuuuuuuuuuuuwuuuuuuuuuuwuuuuuuuuuwuuwuwuuuuuwuuuuuwuuuuuuuuuuuwuuuuuuuuuuuuuuuuuuuwuuuuuuuuuuwuuuuuuuuuwuuwuwuuuuuwuwuwuwuuwuuuwwuuwwwuuwuwuuuuuuuuuuuuuwuuuuuuuuuuwuuuuuuuuuuwuwuwuuuuuwuuuuuwuwuuuwuuwuuwuuuwwuuuuuuuuuuuuuuwuuuuuuuuuuwuuuuuuuuuuwuwuwuuuuuwuuuuuwwuuuuwuuuuuwuuuwwuuuuuuuuuuuuuuwuuuuuuuuuuwuuuuuuuuuuwuwuwuuuuuwuwuwuwuwuuuwuuuuuwuuuwuuuuwuuuuuuuuuuwuuuuuuuuuuwuuuuuuuuuuwuwuwuuuuuwuwuwuwuwuuuuwwuuuwuuuwuuuwuwuuuuuuuuuwuuuuuuuuuuwuuuuuuuuuwuuwuwuuuuwuuwuwuwuuwuuuuuwuuwuuuwuuuwwwuuuuuuuuuwuuuuuuuuuuwuuuuuuuuuwuuwuwuuuuwuuwuwuwuuwuuuuuwuuwuuuwuuuwuwuuuuuuuuuwuuuuuuuuuuwuuuuuuuuuwuuwuwuuuwuuuwuwuwuuuwuwuuwuuwuwuwuuuwuwuuuuuuuuuwuuuuuuuuuuwuuuuuuuuwuuuwuwwwwuuuuwuwuwuuuwuuwwuuuuwuuwuuuwuwuuuuuuuuuwuuuuuuuuuuwuuuuuuuuwuuuwuuuuuuuuuuuwuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuwuuuuuuuuuuwuuuuuuuwuuuuwuuuuuuuuuuuwuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuwuuuuuuuuuuwuuuuuuuwuuuuwuuuuuuuuuwuwuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuwuuuuuuuuuuwwwwwwwwuuuuuwuuuuuuuuuuwuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuwuuuuuuuuuuuuuuuuuuuuuuuwuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuwuuwuuuuuwuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuwuuwuuuuuwuuuuuuuuuuuuuuuuuuuuuuuuuuuuuwwwwuuuuwwwwwwwuuuwwwwwuuuuuuuuwuuwuuuuuwuuuuuuuuuuuuuuuuuuuuuuuuuuuuuwuuuwuuuwuuuuuuuuwuuuuuwuuuuuuuwuuwuuuuuwuuuuuuuuuuuuuuuuuuuuuuuuuuuuuwuuuwuuuwuuuuuuuwuuuuuuuuuuuuuuwuuwuuuuuwuuuuuuuuuuuuuuuuuuuuuuuuuuuuuwuuuuwuuwuuuuuuuwuuuuuuuuuuuuuuwuuwwwwwwwuuuuuuuuuuuuuuuuuuuuuuuuuuuuuwuuuuwuuwuuuuuuuwuuuuuuuuuuuuuuwuuwuuuuuwuuuuuuuuuuuuuuuuuuuuuuuuuuuuuwuuuuuwuwwwwwuuuwuuuuuuuuuuuuuuwuuwuuuuuwuuuuuuuuuuuuuuuuuuuuuuuuuuuuuwuuuuuwuwuuuuuuuuwuuuuuuuuuuuuuwuuwuuuuuwuuwwwuuwuwuuwwwuuuuuuuuuuuuuuwuuuuuwuwuuuuuuuuuwwwwuuuuuuuuuwuuwuuuuuwuwuuuwuwwuuwuuuwuuuuuuuuuuuuuwuuuuuwuwuuuuuuuuuuuuuwuuuuuuuuwuuwuuuuuwuwwwwuuwwuuwwwwuuuuuuuuuuuuuuwuuuuwuuwuuuuuuuuuuuuuuwuuuuuuuwuuwuuuuuwuwuuuuuwuuuwuuuuuuuuuuuuuuuuuwuuuuwuuwuuuuuuuuuuuuuuwuuuuuuuwuuwuuuuuwuwuuuwuwuuuwuuuwuuuuuuuuuuuuuwuuuwuuuwuuuuuuuuuuuuuuwuuuuuuuwuuwuuuuuwuuwwwuuwuuuuwwwuuuuuuuuuuuuuuwuuuwuuuwuuuuuuuwuuuuuuwuuuuuuuwuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuwwwwuuuuwuuuuuuuuwwwwwwuuuuuuuuwuuuuuuuuuuuuuuuuuuuwwuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuwuuuuuuuuuuuuuuuuuuuwwwuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuwuuuuuuuuuuuuuuuuuuuuwwwuuuuuuuuuuuuuuuuuuuuwuuuuuwuuuuuuuuuuuuuuuuuuuwwwwwwwwwwwwwwwwuuuuuuwwwuuuuuuuuuuuuuuuuuuuwuuuuwwwuuuuuuuuuuuuuuuuuuwuuuuuuuuuuuuuuwuuuuuuuwwwuuuuuuuuwuuuuuuuuwuwuuuuwuuuuuuuuuuuuuuuuuuuwuuuuuuuuuuuuuuwuuuuuuuuwwwuuuuuuuwwuuuuuuuwuwuuuuuuuuuuuuuuuuuuuuuuuuwuuuuuuuuuuuuuuwuuuuuuuuuwwwuuuuuuwwuuuuuuwuuuwuuuuuuuuuuuuuuuuuuuuuuuwuuwuuuwuuuuuuuwuuuuuuuuuuwwwuuuuuwwuuuuuuwuuuwuuuuuuuuuuuuuuuuuuuuuuuwuuwuuuwuuuuuuuwuuuuuuuuuuuwwwuuuuwwuuuuuuwwwwwuuuuuuuuuuuuuuuuuuuuuuuwuuwuuuwuuuuuuuwuuuuuuuuuuuuwwwuuuwwuuuuuwuuuuuwuuuuuuuuuuuuuuuuuuuuuuwuuwuuuwuuuwuuuwuuuuuuuuuuuuuwwwuuwwuuuuuwuuuuuwuuuuuuuuuuuuuuuuuuuuuuwuuwuuuwuuuuuuuwuuuuuuuuuuuuuuwwwuwwuuuuuwuuuuuwuuuuuuuuuuuuuuuuuuuuuuwuuwwwwwuuuwuuuwuuuuuuuuuuuuuuuwwwwwuuuuuwuuuuuwuuuuuuuuuuuuuuuuuuuuuuwuuwuuuwuuuwuuuwuuuuuuuuuuuuuuuuwwwwuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuwuuwuuuwuuuwuuuwuuuuuuuuuuuuuuuuwwwwuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuwuuwuuuwuuuwuuuwuuuuuuuwwwwwwwwwwwwwuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuwuuuuuuuuuuuuuuwuuuuuuuuwwwwwwwwwwwwuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuwuuuuuuuuuuuuuuwuuuuuuuuuuuuuuuuuuuuut&a=["AStar","BFS","DFS","Dijkstra"]&b=true)
Hint❗️: This URL is 5,019 characters long. Which is too big ( $>2048$ ) for Chrome to handle. 
Please use Safari, Firefox or Opera.

## Got question?
Leave a issue or [![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/luotn/ParallelPathfindingComparision)

## Project Abstract
This project presents the design, implementation, and evaluation of a web-based tool for parallel visualization of classical pathfinding algorithms, leveraging the emerging WebGPU API to address both pedagogical and performance limitations of existing implementations. The primary objective was to enable simultaneous, side-by-side comparison of multiple algorithms, including Depth-First Search, Breadth-First Search, Dijkstra’s algorithm, and A*, within a single, interactive environment. To achieve this, a two-phase workflow was adopted: a DOM-based grid creation interface for defining custom mazes, and a simulation phase featuring a decoupled architecture separating algorithm execution, benchmarking, and rendering engines.

Benchmarking exploits automated warm-up runs and 1,000 iteration timing to overcome millisecond timer resolution limits, ensuring statistically reliable performance metrics. The core rendering shader module was developed “bare-metal” in WGSL without external libraries, demonstrating direct WebGPU buffer management, shader programming, and texture atlas assembly, even accommodating Safari’s SVG-to-canvas nuances via bitmap conversion. In performance trials on both Apple M1 Pro and Intel/NVIDIA platforms, WebGPU rendering outperformed traditional DOM updates by approximately 20-40%, while maintaining full cross-browser compatibility. A compressive share URL mechanism serializes only the initial maze and settings, capitalizing on algorithmic determinism, to facilitate effortless reproducibility and collaboration without server-side storage. Educationally, the tool bridges the gap between abstract algorithm theory and concrete execution by visualizing interior states (queues, stacks, heuristic scores) alongside final paths, significantly enhancing intuitive understanding. The modular design supports future algorithm integration, making this work both a practical learning resource and a foundational reference for WebGPU-accelerated visualizations in research and industry.