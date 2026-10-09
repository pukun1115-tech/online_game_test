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
    setupWebSocketConnection(socket, gameState);
}

function setupWebSocketConnection(socket, gameState) {
    const player = gameState.addPlayer(socket);
    sendTextFrame(socket, JSON.stringify({ type: "init", map: gameState.map, player: player, teamPoints: gameState.teamPoints, playerCount: gameState.playerCount }));
    socket.on("data", (buffer) => {
        handleWebSocketData(buffer, socket, gameState);
    });
    socket.on("close", () => {
        gameState.removePlayer(socket);
    });
    socket.on("end", () => {
        gameState.removePlayer(socket);
    });
    socket.on("error", () => {
        gameState.removePlayer(socket);
    });
}

function handleWebSocketData(buffer, socket, gameState) {
    //
}

/**
 * テキストフレームを送信する
 * @param {WebSocket} socket 
 * @param {string} text 
 * @returns {undefined}
 */
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

/**
 * クローズフレームを送信する
 * @param {WebSocket} socket 
 * @param {number} statusCode 
 * @param {string} reason 
 */
function sendCloseFrame(socket, statusCode = 1000, reason = "") {
    const reasonBuffer = Buffer.from(reason, "utf8");
    if (reasonBuffer.length > 123) {
        console.log("closeフレームのreasonが123バイトを超えています。");
    } else {
        const payload = Buffer.alloc(reasonBuffer.length + 2);
        payload.writeUInt16BE(statusCode, 0);
        reasonBuffer.copy(payload, 2);
        const frame = Buffer.alloc(2 + payload.length);
        frame[0] = 0x88;
        frame[1] = payload.length;
        payload.copy(frame, 2);
        socket.write(frame);
    }
}

/**
 * テキストフレームをデコードする
 * @param {Buffer} frame 
 * @returns {string} デコードされたテキスト
 */
function decodeTextFrame(frame) {
    const secondByte = frame[1];
    const lengthCode = secondByte & 0x7f;
    let payloadLength;
    let payloadStartIndex;
    if (lengthCode < 126) {
        payloadLength = lengthCode;
        payloadStartIndex = 6;
    } else if (lengthCode === 126) {
        payloadLength = frame.readUInt16BE(2);
        payloadStartIndex = 8;
    } else {
        throw new Error("データが大きすぎます。");
    }
    const maskingKeyStartIndex = payloadStartIndex - 4;
    const maskingKey = frame.subarray(maskingKeyStartIndex, maskingKeyStartIndex + 4);
    const maskedPayload = frame.subarray(payloadStartIndex, payloadStartIndex + payloadLength);
    const decodedPayload = Buffer.alloc(payloadLength);
    for (let i = 0; i < payloadLength; i++) {
        decodedPayload[i] = maskedPayload[i] ^ maskingKey[i % 4];
    }
    return decodedPayload.toString("utf8");
}


/**
 * WebSocketフレームを抽出する
 * @param {Buffer} buffer 
 * @returns {frame: Buffer | null, rest: Buffer}
 */
function extractFrame(buffer) {
    if (buffer.length < 2) {
        return { frame: null, rest: buffer };
    }
    const firstByte = buffer[0];
    const secondByte = buffer[1];

    const fin = (firstByte >> 7) === 1;
    const opcode = firstByte & 0x0f;
    const masked = (secondByte >> 7) === 1;
    const lengthCode = secondByte & 0x7f;

    if (!fin || (opcode !== 0x08 && opcode !== 0x01) || !masked) {
        throw new Error("不正なWebSocketフレームを受信しました。");
    }

    let lengthBytes;
    if (lengthCode <= 125) {
        lengthBytes = 0;
    } else if (lengthCode === 126) {
        lengthBytes = 2;
    } else if (lengthCode === 127) {
        throw new Error("データが大きすぎます。");
    }

    const headerLength = 2 + lengthBytes + 4;
    if (buffer.length < headerLength) {
        return { frame: null, rest: buffer };
    }
    const payloadLength = (lengthCode < 126) ? lengthCode : buffer.readUInt16BE(2);
    const frameLength = headerLength + payloadLength;
    if (buffer.length < frameLength) {
        return { frame: null, rest: buffer };
    }
    return {
        frame: buffer.subarray(0, frameLength),
        rest: buffer.subarray(frameLength)
    };
}

/**
 * 受信したデータを順番に処理する
 * @param {WebSocket} socket 
 * @param {Buffer} receiveBuffer 受け取ったデータをためるバッファ
 * @returns {Buffer | null}
 */
function processReceivedData(socket, receiveBuffer) {
    try {
        while (receiveBuffer.length > 0) {
            const result = extractFrame(receiveBuffer);

            const { frame, rest } = result;
            receiveBuffer = rest;

            const firstByte = frame[0];
            const opcode = firstByte & 0x0f;
            if (opcode === 0x8) {
                sendCloseFrame(socket, 1000, "正常終了");
                socket.end();
                return null;
            }
            if (opcode === 0x1) {
                const text = decodeTextFrame(frame);

                // ここで受信したテキストを処理する
            }
        }
        return receiveBuffer;
    } catch (error) {
        console.log(error);
        socket.destroy();
        return null;
    }
}