import { map } from "./map.js";
import { TILE_SIZE, PLAYER_RADIUS, BULLET_RADIUS, MAP_WIDTH, MAP_HEIGHT } from "./config.js";

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
        this.playerIds = new Map();
        this.bullets = new Set();
        this.teamPoints = { "R": 0, "B": 0 };
        this.playerCount = { "R": 0, "B": 0 };
        this.time = 0;
    }

    addPlayer(socket) {
        const player = createPlayer();
        this.sockets.add(socket);
        this.players.set(player.playerId, player);
        this.playerIds.set(socket, player);
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
                this.playerIds.delete(socket);
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
        const playerId = this.playerIds.get(socket);
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
}
