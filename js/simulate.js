function init() {
    gridString = sessionStorage.getItem("grid")
    algorithmString = sessionStorage.getItem("algorithms")
    if (gridString == undefined || algorithmString == undefined) {
        alert("Simulation data not found!\nRedirecting to index page...")
        window.location.replace("./index.html");
    }
}

function updateSpeed() {
    let speed = document.getElementById("speed").value
    document.getElementById("speedPrompt").innerHTML = `Step Interval: ${1 - speed}s`
}