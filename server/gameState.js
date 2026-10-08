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
        this.sockets = [];
        this.players = {};
        this.playerIds = {};
        this.bullets = [];
        this.teamPoints = { "R": 0, "B": 0 };
        this.playerCount = { "R": 0, "B": 0 };
        this.time = 0;
    }

    addPlayer(socket) {
        const player = createPlayer();
        this.players[player.playerId] = player;
        this.sockets.push(socket);
        return player;
    }
}