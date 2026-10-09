import { map } from "./map.js";
import { TILE_SIZE, PLAYER_RADIUS, BULLET_RADIUS, MAP_WIDTH, MAP_HEIGHT } from "./config.js";
import { sendTextFrame } from "./connection.js";
import { checkCircleRectCollision } from "./collision.js";

function createPlayerId() {
    const p = Math.random().toString(36).substring(2, 2 + 6);
    return p.charAt(0).toUpperCase() + p.slice(1);
}

function createPlayer() {
    const team = (Math.random() > 0.5 ? "R" : "B");
    return {
        playerId: createPlayerId(),
        team: team,
        x: (team === "R" ? TILE_SIZE * 1.5 : TILE_SIZE * (MAP_WIDTH - 1.5)),
        y: (team === "R" ? TILE_SIZE * 1.5 : TILE_SIZE * (MAP_HEIGHT - 1.5)),
    };
}

export class GameState {
    constructor() {
        this.map = [...map];
        this.sockets = new Set();
        this.players = new Map();
        this.playerIdsBySocket = new Map();
        this.bullets = new Set();
        this.teamPoints = { "R": 0, "B": 0 };
        this.playerCount = { "R": 0, "B": 0 };
        this.time = 0;
    }

    broadcast(all, socket, message) {
        const text = JSON.stringify(message);
        for (const client of this.sockets) {
            if (all || client !== socket) {
                sendTextFrame(client, text);
            }
        }
    }

    addPlayer(socket) {
        const player = createPlayer();
        this.sockets.add(socket);
        this.players.set(player.playerId, player);
        this.playerIdsBySocket.set(socket, player.playerId);
        this.playerCount[player.team] += 1;
        return player;
    }

    removePlayer(socket) {
        try {
            if (this.sockets.has(socket)) {
                this.sockets.delete(socket);
            }
            const playerId = this.getPlayerIdBySocket(socket);
            if (playerId !== null) {
                this.playerIdsBySocket.delete(socket);
                const player = this.getPlayerById(playerId);
                if (player !== null) {
                    this.players.delete(playerId);
                    this.playerCount[player.team] -= 1;
                }
            }
        } catch (error) {
            console.log(error);
        }
    }

    getPlayerIdBySocket(socket) {
        const playerId = this.playerIdsBySocket.get(socket);
        if (playerId === undefined || playerId === null) {
            return null;
        }
        return playerId;
    }

    getPlayerById(playerId) {
        const player = this.players.get(playerId);
        if (player === undefined || player === null) {
            return null;
        }
        return player;
    }

    checkPlayerWallColision(player) {
        for (let y = 0; y < MAP_HEIGHT; y++) {
            for (let x = 0; x < MAP_WIDTH; x++) {
                if (this.map[y][x] !== "#") continue;
                if (checkCircleRectCollision({ x: player.x, y: player.y, r: PLAYER_RADIUS }, { left: x * TILE_SIZE, right: (x + 1) * TILE_SIZE, top: y * TILE_SIZE, bottom: (y + 1) * TILE_SIZE })) {
                    return true;
                }
            }
        }
        return false;
    }
}
