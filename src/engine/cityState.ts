import {
  CityStats,
  LandSector,
  Mission,
  PlacedBuilding,
  Tile,
} from '../types';
import { INITIAL_MISSIONS } from '../data/missions';
import { MAP_SIZE, SECTOR_SIZE, updateRoadConnections } from './isometric';

export const SAVE_KEY = 'build_your_city_save_v1';

export function createInitialMap(): {
  grid: Tile[][];
  sectors: LandSector[];
  buildings: PlacedBuilding[];
} {
  const grid: Tile[][] = [];
  const numSectors = MAP_SIZE / SECTOR_SIZE;
  const sectors: LandSector[] = [];

  // Initialize sectors (5x5)
  for (let sy = 0; sy < numSectors; sy++) {
    for (let sx = 0; sx < numSectors; sx++) {
      // Unlocked central 2x2 sectors
      const isCentral = (sx === 2 && sy === 2) || (sx === 2 && sy === 1);
      const distFromCenter = Math.hypot(sx - 2, sy - 2);
      const cost = Math.round(2000 + distFromCenter * 3500);

      sectors.push({
        sectorX: sx,
        sectorY: sy,
        unlocked: isCentral,
        cost,
      });
    }
  }

  // Helper to check if sector is unlocked
  const isSectorUnlocked = (sx: number, sy: number) => {
    const s = sectors.find((sec) => sec.sectorX === sx && sec.sectorY === sy);
    return s ? s.unlocked : false;
  };

  // Generate terrain with a gentle winding river
  for (let y = 0; y < MAP_SIZE; y++) {
    const row: Tile[] = [];
    for (let x = 0; x < MAP_SIZE; x++) {
      // River path formula
      const riverCenterX = 26 + Math.sin(y * 0.22) * 5 + Math.cos(y * 0.1) * 2;
      const distToRiver = Math.abs(x - riverCenterX);

      let terrain: Tile['terrain'] = 'grass';
      if (distToRiver < 1.8) {
        terrain = 'water';
      } else if (distToRiver < 2.8) {
        terrain = 'sand';
      } else {
        // Natural trees scattered
        const treeNoise = Math.sin(x * 1.5) * Math.cos(y * 1.3);
        if (treeNoise > 0.45 && Math.random() < 0.6) {
          terrain = 'trees';
        }
      }

      row.push({
        x,
        y,
        terrain,
        elevation: 0,
        road: null,
        buildingUid: null,
        treeVariant: Math.floor(Math.random() * 3),
      });
    }
    grid.push(row);
  }

  // Pre-place a small starter connection in the unlocked area so players see a friendly starting seed
  const starterRoads: { x: number; y: number }[] = [
    { x: 18, y: 14 },
    { x: 18, y: 15 },
    { x: 18, y: 16 },
    { x: 18, y: 17 },
    { x: 18, y: 18 },
    { x: 19, y: 16 },
    { x: 20, y: 16 },
    { x: 21, y: 16 },
  ];

  starterRoads.forEach((pt) => {
    if (grid[pt.y]?.[pt.x] && grid[pt.y][pt.x].terrain !== 'water') {
      grid[pt.y][pt.x].road = {
        type: 'small',
        connections: { north: false, south: false, east: false, west: false },
        isBridge: false,
      };
    }
  });

  // Update starter road connections
  starterRoads.forEach((pt) => {
    updateRoadConnections(grid, pt.x, pt.y);
  });

  return { grid, sectors, buildings: [] };
}

export function createInitialStats(): CityStats {
  return {
    money: 25000,
    population: 0,
    maxPopulation: 0,
    happiness: 75,
    powerCapacity: 0,
    powerConsumed: 0,
    waterCapacity: 0,
    waterConsumed: 0,
    trafficLoad: 10,
    pollutionLevel: 0,
    unemploymentRate: 0,
    totalJobs: 0,
    filledJobs: 0,
    incomePerDay: 0,
    expensesPerDay: 0,
    netPerDay: 0,
  };
}

export interface CitySaveData {
  version: number;
  cityName: string;
  dayCount: number;
  dayTime: number;
  stats: CityStats;
  sectors: LandSector[];
  buildings: PlacedBuilding[];
  missions: Mission[];
  grid: {
    x: number;
    y: number;
    terrain: Tile['terrain'];
    elevation: number;
    road: Tile['road'];
    buildingUid: string | null;
    treeVariant?: number;
  }[][];
}

export function saveCityToStorage(data: CitySaveData): boolean {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch (err) {
    console.error('Failed to save city:', err);
    return false;
  }
}

export function loadCityFromStorage(): CitySaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as CitySaveData;
    if (!data.grid || !data.stats) return null;
    return data;
  } catch (err) {
    console.error('Failed to load city:', err);
    return null;
  }
}

export function clearSavedCity(): void {
  localStorage.removeItem(SAVE_KEY);
}
