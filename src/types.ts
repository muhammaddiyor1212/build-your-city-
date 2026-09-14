export type TerrainType = 'grass' | 'water' | 'sand' | 'trees';

export type RoadType = 'small' | 'large' | 'highway';

export type BuildingCategory =
  | 'roads'
  | 'residential'
  | 'commercial'
  | 'industrial'
  | 'services'
  | 'parks'
  | 'utilities'
  | 'landmarks';

export interface BuildingDef {
  id: string;
  name: string;
  category: BuildingCategory;
  icon: string;
  width: number;
  height: number;
  cost: number;
  income: number; // $ generated per day/tick
  maintenance: number; // $ cost per day/tick
  population: number; // resident capacity
  jobs: number; // job slots
  powerNeed: number; // MW needed (negative if generator)
  waterNeed: number; // m3 needed (negative if generator)
  pollution: number; // 0 to 100
  happinessBonus: number; // -10 to +30
  unlockPopulation: number;
  description: string;
  color?: string;
  roofColor?: string;
}

export interface PlacedBuilding {
  uid: string;
  defId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  placedAtDay: number;
  hasPower: boolean;
  hasWater: boolean;
  currentWorkers: number;
  currentResidents: number;
  customName?: string;
}

export interface RoadTile {
  type: RoadType;
  connections: {
    north: boolean;
    south: boolean;
    east: boolean;
    west: boolean;
  };
  isBridge: boolean;
}

export interface Tile {
  x: number;
  y: number;
  terrain: TerrainType;
  elevation: number;
  road: RoadTile | null;
  buildingUid: string | null;
  treeVariant?: number;
}

export interface LandSector {
  sectorX: number;
  sectorY: number;
  unlocked: boolean;
  cost: number;
}

export interface Citizen {
  id: string;
  name: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  state: 'wandering' | 'working' | 'shopping' | 'relaxing';
  homeX?: number;
  homeY?: number;
  workX?: number;
  workY?: number;
  speed: number;
  color: string;
  gender: 'm' | 'f';
}

export interface Vehicle {
  id: string;
  type: 'car' | 'bus' | 'truck' | 'police' | 'ambulance' | 'fire_truck';
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  direction: 'N' | 'S' | 'E' | 'W';
  speed: number;
  color: string;
  path: { x: number; y: number }[];
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  type: 'smoke' | 'spark' | 'balloon' | 'rain';
}

export interface CityStats {
  money: number;
  population: number;
  maxPopulation: number;
  happiness: number; // 0-100
  powerCapacity: number;
  powerConsumed: number;
  waterCapacity: number;
  waterConsumed: number;
  trafficLoad: number; // 0-100%
  pollutionLevel: number; // 0-100%
  unemploymentRate: number; // 0-100%
  totalJobs: number;
  filledJobs: number;
  incomePerDay: number;
  expensesPerDay: number;
  netPerDay: number;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  rewardMoney: number;
  rewardHappinessBonus: number;
  icon: string;
  targetType:
    | 'population'
    | 'money'
    | 'building_count'
    | 'happiness'
    | 'power'
    | 'water'
    | 'road_count';
  targetBuildingId?: string;
  targetValue: number;
  completed: boolean;
  claimed: boolean;
}

export interface CityEvent {
  id: string;
  title: string;
  description: string;
  icon: string;
  type: 'positive' | 'negative' | 'neutral';
  durationSeconds: number;
  remainingSeconds: number;
  effects: {
    happinessModifier?: number;
    incomeModifier?: number;
    trafficModifier?: number;
    powerOutage?: boolean;
    bonusMoney?: number;
    constructionDiscount?: number;
  };
}

export type ActiveTool =
  | 'inspect'
  | 'bulldoze'
  | 'road_small'
  | 'road_large'
  | 'road_highway'
  | 'expand'
  | string; // building ID

export interface CameraState {
  x: number;
  y: number;
  zoom: number;
}

export interface GameSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  showGrid: boolean;
  showParticles: boolean;
  showCitizenLabels: boolean;
}
