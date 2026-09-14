import { RoadTile, Tile } from '../types';

export const TILE_WIDTH = 64;
export const TILE_HEIGHT = 32;

export const MAP_SIZE = 40; // 40x40 tiles grid
export const SECTOR_SIZE = 8; // 5x5 sectors of 8x8 tiles = 40x40

export function gridToScreen(
  gx: number,
  gy: number,
  cameraX: number,
  cameraY: number,
  zoom: number,
  elevation: number = 0
): { x: number; y: number } {
  const halfW = (TILE_WIDTH / 2) * zoom;
  const halfH = (TILE_HEIGHT / 2) * zoom;
  const sx = (gx - gy) * halfW + cameraX;
  const sy = (gx + gy) * halfH + cameraY - elevation * 16 * zoom;
  return { x: sx, y: sy };
}

export function screenToGrid(
  sx: number,
  sy: number,
  cameraX: number,
  cameraY: number,
  zoom: number
): { gx: number; gy: number } {
  const halfW = (TILE_WIDTH / 2) * zoom;
  const halfH = (TILE_HEIGHT / 2) * zoom;
  const relX = sx - cameraX;
  const relY = sy - cameraY;

  const gx = Math.floor((relX / halfW + relY / halfH) / 2);
  const gy = Math.floor((relY / halfH - relX / halfW) / 2);
  return { gx, gy };
}

export function getSectorCoords(gx: number, gy: number): { sx: number; sy: number } {
  return {
    sx: Math.floor(gx / SECTOR_SIZE),
    sy: Math.floor(gy / SECTOR_SIZE),
  };
}

export function isTileInMap(gx: number, gy: number): boolean {
  return gx >= 0 && gx < MAP_SIZE && gy >= 0 && gy < MAP_SIZE;
}

export function updateRoadConnections(
  grid: (Tile | null)[][],
  x: number,
  y: number
): RoadTile | null {
  const tile = grid[y]?.[x];
  if (!tile || !tile.road) return null;

  const north = grid[y - 1]?.[x]?.road !== null && grid[y - 1]?.[x]?.road !== undefined;
  const south = grid[y + 1]?.[x]?.road !== null && grid[y + 1]?.[x]?.road !== undefined;
  const east = grid[y]?.[x + 1]?.road !== null && grid[y]?.[x + 1]?.road !== undefined;
  const west = grid[y]?.[x - 1]?.road !== null && grid[y]?.[x - 1]?.road !== undefined;

  const isBridge = tile.terrain === 'water';

  tile.road.connections = { north, south, east, west };
  tile.road.isBridge = isBridge;
  return tile.road;
}
