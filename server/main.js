import http from "node:http";

import { PORT, isLocal } from "./config.js";
import { GameState } from "./gameState.js";
import { onUpgrade, createHttpServer } from "./connection.js";

const gameState = new GameState();

const server = http.createServer((request, response) => createHttpServer(request, response));

server.on("upgrade", (request, socket, head) => onUpgrade(request, socket, head, gameState));

server.listen(PORT, "0.0.0.0", () => {
    console.log("サーバーが起動しました。");
    if (isLocal) {
        console.log("http://localhost:3000/\r\n");
    }
});