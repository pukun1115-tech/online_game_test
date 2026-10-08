const canvas = document.getElementById("gamecanvas");
const ctx = canvas.getContext("2d");
const webSocketProtocol = (window.location.protocol === "https:" ? "wss" : "ws");
const socket = new WebSocket(`${webSocketProtocol}://${window.location.host}/`);

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

resizeCanvas();

window.addEventListener("resize", () => {
    setTimeout(() => {
        resizeCanvas();
    }, 50);
});

function mainLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}