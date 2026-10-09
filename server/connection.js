import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { __dirname, MYME_TYPES } from "./config.js";

export function createHttpServer(request, response) {
    const requestUrl = (request.url === "/" ? "/index.html" : request.url);
    if (request.method !== "GET" || (requestUrl !== "/index.html" && requestUrl !== "/script.js" && requestUrl !== "/style.css" && requestUrl !== "/images/favicon.ico")) {
        response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("404 Not Found");
        return;
    }
    const extension = path.extname(requestUrl);
    const filePath = (requestUrl === "/images/favicon.ico" ? path.join(__dirname, "../", requestUrl) : path.join(__dirname, "../public", requestUrl));
    fs.readFile(filePath, (error, fileData) => {
        if (error) {
            response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
            response.end("Hello!");
            return;
        }
        response.writeHead(200, { "Content-Type": MYME_TYPES[extension] || "application/octet-stream" });
        response.end(fileData);
    });
}

export function onUpgrade(request, socket, head, gameState) {
    const websocketKey = request.headers["sec-websocket-key"];
    if (!websocketKey) {
        socket.destroy();
        return;
    }
    const magicString = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
    const acceptKey = crypto
        .createHash("sha1")
        .update(websocketKey + magicString)
        .digest("base64");
    const response = (
        "HTTP/1.1 101 Switching Protocols\r\n" +
        "Upgrade: websocket\r\n" +
        "Connection: Upgrade\r\n" +
        `Sec-WebSocket-Accept: ${acceptKey}\r\n` +
        "\r\n"
    );
    socket.write(response);
}

function setupWebSocketConnection(socket, gameState) {
    const player = gameState.addPlayer(socket);
    socket.on("data", (buffer) => {
        handleWebSocketData(buffer, socket, gameState);
    });
    socket.on("end", () => {
        //
    });
    socket.on("error", () => {
        //
    });
}

function handleWebSocketData(buffer, socket, gameState) {
    //
}

export function sendTextFrame(socket, text) {
    const payload = Buffer.from(text, "utf8");
    if (payload.length <= 125) {
        const frame = Buffer.alloc(2 + payload.length);
        frame[0] = 0x81;
        frame[1] = payload.length;
        payload.copy(frame, 2);
        socket.write(frame);
    } else if (payload.length <= 65535) {
        const frame = Buffer.alloc(4 + payload.length);
        frame[0] = 0x81;
        frame[1] = 126;
        frame.writeUInt16BE(payload.length, 2);
        payload.copy(frame, 4);
        socket.write(frame);
    } else {
        return;
    }
}