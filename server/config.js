export const PORT = Number(process.env.PORT ?? 3000);
export const isLocal = (process.env.PORT === undefined);
export const __dirname = import.meta.dirname;
export const MYME_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".png": "image/png",
    ".ico": "image/x-icon",
};

export const TILE_SIZE = 64;
export const PLAYER_RADIUS = 16;
export const BULLET_RADIUS = 4;
export const MAP_WIDTH = 40;
export const MAP_HEIGHT = 40;
export const PLAYER_MAX_HP = 100;