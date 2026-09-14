import {
  ActiveTool,
  Citizen,
  CityEvent,
  CityStats,
  LandSector,
  Mission,
  Particle,
  PlacedBuilding,
  RoadType,
  Tile,
  Vehicle,
} from '../types';
import { BUILDINGS_CATALOG, ROAD_COSTS } from '../data/buildings';
import { RANDOM_EVENTS } from '../data/events';
import { audio } from '../utils/audio';
import { getSectorCoords, isTileInMap, MAP_SIZE, updateRoadConnections } from './isometric';

export class SimulationEngine {
  public dayCount: number = 1;
  public dayTime: number = 9.0; // 09:00 AM start
  public gameSpeed: number = 1; // 0 = pause, 1 = normal, 2 = fast, 5 = ultra

  public citizens: Citizen[] = [];
  public vehicles: Vehicle[] = [];
  public particles: Particle[] = [];
  public activeEvents: CityEvent[] = [];

  private lastTickTime: number = performance.now();
  private eventCheckTimer: number = 0;

  constructor(initialDayCount: number = 1, initialDayTime: number = 9.0) {
    this.dayCount = initialDayCount;
    this.dayTime = initialDayTime;
  }

  public update(
    deltaMs: number,
    grid: Tile[][],
    sectors: LandSector[],
    buildings: PlacedBuilding[],
    stats: CityStats,
    missions: Mission[],
    onMissionCompleted?: (mission: Mission) => void,
    onEventTriggered?: (event: CityEvent) => void
  ) {
    if (this.gameSpeed === 0) return; // Paused

    const effectiveDelta = (deltaMs / 1000) * this.gameSpeed;

    // 1. Advance Day/Night time (1 game day = 90 seconds at 1x speed)
    const hoursPerSecond = 24 / 90;
    this.dayTime += hoursPerSecond * effectiveDelta;
    if (this.dayTime >= 24) {
      this.dayTime %= 24;
      this.dayCount++;
    }

    // 2. Manage Active Events Timer
    for (let i = this.activeEvents.length - 1; i >= 0; i--) {
      const ev = this.activeEvents[i];
      ev.remainingSeconds -= effectiveDelta;
      if (ev.remainingSeconds <= 0) {
        this.activeEvents.splice(i, 1);
      }
    }

    // Check for random event triggers every ~60 seconds
    this.eventCheckTimer += effectiveDelta;
    if (this.eventCheckTimer >= 65 && this.activeEvents.length === 0) {
      this.eventCheckTimer = 0;
      if (Math.random() < 0.45 && buildings.length >= 3) {
        this.triggerRandomEvent(onEventTriggered);
      }
    }

    // 3. Power & Water Distribution
    this.calculateUtilities(buildings, stats);

    // 4. Jobs, Population & Happiness
    this.calculateDemographics(buildings, stats);

    // 5. Finances & Economy (Cash flow)
    this.calculateFinances(grid, buildings, stats, effectiveDelta);

    // 6. Citizens & Traffic Management
    this.updateCitizens(grid, buildings, effectiveDelta);
    this.updateVehicles(grid, effectiveDelta);
    this.calculateTraffic(grid, stats);

    // 7. Update Environmental Particles
    this.updateParticles(buildings, effectiveDelta);

    // 8. Missions Progression Check
    this.checkMissions(grid, buildings, stats, missions, onMissionCompleted);
  }

  private triggerRandomEvent(onEventTriggered?: (event: CityEvent) => void) {
    const template = RANDOM_EVENTS[Math.floor(Math.random() * RANDOM_EVENTS.length)];
    const newEvent: CityEvent = {
      ...template,
      remainingSeconds: template.durationSeconds,
    };
    this.activeEvents.push(newEvent);
    audio.playEventAlert();
    if (onEventTriggered) {
      onEventTriggered(newEvent);
    }
  }

  private calculateUtilities(buildings: PlacedBuilding[], stats: CityStats) {
    let powerCap = 0;
    let powerUse = 0;
    let waterCap = 0;
    let waterUse = 0;
    let totalPollution = 0;

    const hasPowerOutage = this.activeEvents.some((e) => e.effects.powerOutage);

    buildings.forEach((b) => {
      const def = BUILDINGS_CATALOG[b.defId];
      if (!def) return;

      // Generators have negative powerNeed / waterNeed
      if (def.powerNeed < 0) {
        powerCap += Math.abs(def.powerNeed);
      } else {
        powerUse += def.powerNeed;
      }

      if (def.waterNeed < 0) {
        waterCap += Math.abs(def.waterNeed);
      } else {
        waterUse += def.waterNeed;
      }

      totalPollution += Math.max(0, def.pollution);
    });

    if (hasPowerOutage) {
      powerCap = Math.floor(powerCap * 0.5);
    }

    stats.powerCapacity = powerCap;
    stats.powerConsumed = powerUse;
    stats.waterCapacity = waterCap;
    stats.waterConsumed = waterUse;

    // Pollution percentage
    stats.pollutionLevel = Math.min(100, Math.round(totalPollution * 1.8));

    // Assign power and water availability to buildings
    let remainingPower = powerCap;
    let remainingWater = waterCap;

    buildings.forEach((b) => {
      const def = BUILDINGS_CATALOG[b.defId];
      if (!def) return;

      if (def.powerNeed <= 0) {
        b.hasPower = true;
      } else if (remainingPower >= def.powerNeed) {
        b.hasPower = true;
        remainingPower -= def.powerNeed;
      } else {
        b.hasPower = false;
      }

      if (def.waterNeed <= 0) {
        b.hasWater = true;
      } else if (remainingWater >= def.waterNeed) {
        b.hasWater = true;
        remainingWater -= def.waterNeed;
      } else {
        b.hasWater = false;
      }
    });
  }

  private calculateDemographics(buildings: PlacedBuilding[], stats: CityStats) {
    let maxPop = 0;
    let totalJobs = 0;
    let serviceBonus = 0;
    let parkBonus = 0;

    buildings.forEach((b) => {
      const def = BUILDINGS_CATALOG[b.defId];
      if (!def) return;

      if (def.population > 0) {
        maxPop += def.population;
      }
      if (def.jobs > 0 && b.hasPower && b.hasWater) {
        totalJobs += def.jobs;
      }

      if (b.hasPower && b.hasWater) {
        if (def.category === 'services') serviceBonus += def.happinessBonus;
        if (def.category === 'parks') parkBonus += def.happinessBonus;
      }
    });

    stats.maxPopulation = maxPop;
    stats.totalJobs = totalJobs;

    // Workforce is ~65% of population
    const workforce = Math.round(stats.population * 0.65);
    stats.filledJobs = Math.min(workforce, totalJobs);
    stats.unemploymentRate =
      workforce > 0 ? Math.round(((workforce - stats.filledJobs) / workforce) * 100) : 0;

    // Base Happiness
    let happiness = 70;

    // Power & Water satisfaction
    if (stats.powerConsumed > stats.powerCapacity && stats.powerConsumed > 0) {
      happiness -= 25;
    }
    if (stats.waterConsumed > stats.waterCapacity && stats.waterConsumed > 0) {
      happiness -= 20;
    }

    // Unemployment penalty
    if (stats.unemploymentRate > 20) {
      happiness -= Math.round((stats.unemploymentRate - 20) * 0.8);
    } else if (stats.unemploymentRate < 5 && workforce > 10) {
      happiness += 8;
    }

    // Services & Parks
    happiness += Math.min(25, serviceBonus);
    happiness += Math.min(20, parkBonus);

    // Pollution penalty
    happiness -= Math.round(stats.pollutionLevel * 0.3);

    // Event modifier
    this.activeEvents.forEach((ev) => {
      if (ev.effects.happinessModifier) {
        happiness += ev.effects.happinessModifier;
      }
    });

    stats.happiness = Math.max(5, Math.min(100, Math.round(happiness)));

    // Migration rate based on Happiness and Capacity
    if (stats.population < maxPop && stats.happiness >= 45) {
      const growthRate = ((stats.happiness - 40) / 60) * 1.5;
      stats.population = Math.min(maxPop, Math.round(stats.population + growthRate));
    } else if (stats.population > maxPop || stats.happiness < 35) {
      const shrinkRate = Math.max(1, Math.round(stats.population * 0.02));
      stats.population = Math.max(0, stats.population - shrinkRate);
    }
  }

  private calculateFinances(
    grid: Tile[][],
    buildings: PlacedBuilding[],
    stats: CityStats,
    effectiveDelta: number
  ) {
    let incomeDaily = 0;
    let expenseDaily = 0;

    // Income multiplier from events (e.g. Business Boom)
    let incomeMultiplier = 1.0;
    this.activeEvents.forEach((ev) => {
      if (ev.effects.incomeModifier) {
        incomeMultiplier *= ev.effects.incomeModifier;
      }
    });

    buildings.forEach((b) => {
      const def = BUILDINGS_CATALOG[b.defId];
      if (!def) return;

      // Buildings only generate full income if powered and watered
      const utilityFactor = (b.hasPower ? 0.6 : 0.2) + (b.hasWater ? 0.4 : 0.0);
      incomeDaily += def.income * utilityFactor * incomeMultiplier;
      expenseDaily += def.maintenance;
    });

    // Road maintenance cost
    let roadTiles = 0;
    for (let y = 0; y < MAP_SIZE; y++) {
      for (let x = 0; x < MAP_SIZE; x++) {
        const road = grid[y]?.[x]?.road;
        if (road) {
          roadTiles++;
          const rc = ROAD_COSTS[road.type];
          if (rc) expenseDaily += rc.maintenance;
        }
      }
    }

    stats.incomePerDay = Math.round(incomeDaily);
    stats.expensesPerDay = Math.round(expenseDaily);
    stats.netPerDay = stats.incomePerDay - stats.expensesPerDay;

    // Flow money smoothly per second (90s = 1 day)
    const netPerSecond = stats.netPerDay / 90;
    stats.money = Math.round(stats.money + netPerSecond * effectiveDelta);
  }

  private updateCitizens(grid: Tile[][], buildings: PlacedBuilding[], effectiveDelta: number) {
    // Determine target citizen count based on population (cap at 30 for performance)
    const desiredCitizens = Math.min(30, Math.floor(Math.sqrt(this.dayCount * 2 + buildings.length * 2)));

    // Find road tiles for walking
    const roadTiles: { x: number; y: number }[] = [];
    for (let y = 0; y < MAP_SIZE; y++) {
      for (let x = 0; x < MAP_SIZE; x++) {
        if (grid[y]?.[x]?.road) {
          roadTiles.push({ x, y });
        }
      }
    }

    if (roadTiles.length === 0) {
      this.citizens = [];
      return;
    }

    // Spawn new citizens if below count
    while (this.citizens.length < desiredCitizens) {
      const spawnTile = roadTiles[Math.floor(Math.random() * roadTiles.length)];
      const names = ['Alex', 'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Lucas', 'Mia'];
      const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
      this.citizens.push({
        id: `cit_${Math.random()}`,
        name: names[Math.floor(Math.random() * names.length)],
        x: spawnTile.x + 0.5,
        y: spawnTile.y + 0.5,
        targetX: spawnTile.x + 0.5,
        targetY: spawnTile.y + 0.5,
        state: 'wandering',
        speed: 0.6 + Math.random() * 0.4,
        color: colors[Math.floor(Math.random() * colors.length)],
        gender: Math.random() > 0.5 ? 'm' : 'f',
      });
    }

    // Move citizens
    this.citizens.forEach((c) => {
      const dx = c.targetX - c.x;
      const dy = c.targetY - c.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 0.15) {
        // Pick new adjacent road target
        const currentTileX = Math.floor(c.x);
        const currentTileY = Math.floor(c.y);
        const currentRoad = grid[currentTileY]?.[currentTileX]?.road;

        const candidates: { x: number; y: number }[] = [];
        if (currentRoad) {
          const { north, south, east, west } = currentRoad.connections;
          if (north && grid[currentTileY - 1]?.[currentTileX]?.road) {
            candidates.push({ x: currentTileX + 0.5, y: currentTileY - 0.5 });
          }
          if (south && grid[currentTileY + 1]?.[currentTileX]?.road) {
            candidates.push({ x: currentTileX + 0.5, y: currentTileY + 1.5 });
          }
          if (east && grid[currentTileY]?.[currentTileX + 1]?.road) {
            candidates.push({ x: currentTileX + 1.5, y: currentTileY + 0.5 });
          }
          if (west && grid[currentTileY]?.[currentTileX - 1]?.road) {
            candidates.push({ x: currentTileX - 0.5, y: currentTileY + 0.5 });
          }
        }

        if (candidates.length > 0) {
          const next = candidates[Math.floor(Math.random() * candidates.length)];
          c.targetX = next.x;
          c.targetY = next.y;
        } else {
          // Wander to any random road tile
          const randomRoad = roadTiles[Math.floor(Math.random() * roadTiles.length)];
          c.targetX = randomRoad.x + 0.5;
          c.targetY = randomRoad.y + 0.5;
        }
      } else {
        // Move towards target
        const step = c.speed * effectiveDelta;
        c.x += (dx / dist) * step;
        c.y += (dy / dist) * step;
      }
    });
  }

  private updateVehicles(grid: Tile[][], effectiveDelta: number) {
    const roadTiles: { x: number; y: number }[] = [];
    for (let y = 0; y < MAP_SIZE; y++) {
      for (let x = 0; x < MAP_SIZE; x++) {
        if (grid[y]?.[x]?.road) {
          roadTiles.push({ x, y });
        }
      }
    }

    if (roadTiles.length === 0) {
      this.vehicles = [];
      return;
    }

    // Fewer cars at night, more during daytime rush hour
    const isNight = this.dayTime < 6 || this.dayTime > 21;
    const maxVehicles = isNight ? Math.min(6, Math.floor(roadTiles.length / 8)) : Math.min(20, Math.floor(roadTiles.length / 3));

    // Spawn vehicles
    while (this.vehicles.length < maxVehicles) {
      const spawnTile = roadTiles[Math.floor(Math.random() * roadTiles.length)];
      const carTypes: Vehicle['type'][] = ['car', 'car', 'car', 'bus', 'truck', 'police'];
      const vType = carTypes[Math.floor(Math.random() * carTypes.length)];
      const colors = ['#ef4444', '#3b82f6', '#e2e8f0', '#0f172a', '#eab308', '#10b981'];

      this.vehicles.push({
        id: `veh_${Math.random()}`,
        type: vType,
        x: spawnTile.x + 0.5,
        y: spawnTile.y + 0.5,
        targetX: spawnTile.x + 0.5,
        targetY: spawnTile.y + 0.5,
        direction: 'E',
        speed: vType === 'police' ? 2.4 : 1.5 + Math.random() * 0.8,
        color: vType === 'police' ? '#1e3a8a' : vType === 'bus' ? '#f59e0b' : colors[Math.floor(Math.random() * colors.length)],
        path: [],
      });
    }

    // Trim excess vehicles during night
    if (this.vehicles.length > maxVehicles) {
      this.vehicles.splice(maxVehicles);
    }

    // Move vehicles along roads
    this.vehicles.forEach((v) => {
      const dx = v.targetX - v.x;
      const dy = v.targetY - v.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 0.2) {
        const curX = Math.floor(v.x);
        const curY = Math.floor(v.y);
        const currentRoad = grid[curY]?.[curX]?.road;

        const nextOptions: { x: number; y: number; dir: Vehicle['direction'] }[] = [];
        if (currentRoad) {
          const { north, south, east, west } = currentRoad.connections;
          if (north && grid[curY - 1]?.[curX]?.road) {
            nextOptions.push({ x: curX + 0.5, y: curY - 0.5, dir: 'N' });
          }
          if (south && grid[curY + 1]?.[curX]?.road) {
            nextOptions.push({ x: curX + 0.5, y: curY + 1.5, dir: 'S' });
          }
          if (east && grid[curY]?.[curX + 1]?.road) {
            nextOptions.push({ x: curX + 1.5, y: curY + 0.5, dir: 'E' });
          }
          if (west && grid[curY]?.[curX - 1]?.road) {
            nextOptions.push({ x: curX - 0.5, y: curY + 0.5, dir: 'W' });
          }
        }

        if (nextOptions.length > 0) {
          const next = nextOptions[Math.floor(Math.random() * nextOptions.length)];
          v.targetX = next.x;
          v.targetY = next.y;
          v.direction = next.dir;
        } else {
          const fallback = roadTiles[Math.floor(Math.random() * roadTiles.length)];
          v.targetX = fallback.x + 0.5;
          v.targetY = fallback.y + 0.5;
        }
      } else {
        const step = v.speed * effectiveDelta;
        v.x += (dx / dist) * step;
        v.y += (dy / dist) * step;
      }
    });
  }

  private calculateTraffic(grid: Tile[][], stats: CityStats) {
    let roadCapacity = 0;
    for (let y = 0; y < MAP_SIZE; y++) {
      for (let x = 0; x < MAP_SIZE; x++) {
        const road = grid[y]?.[x]?.road;
        if (road) {
          roadCapacity += road.type === 'highway' ? 8 : road.type === 'large' ? 4 : 2;
        }
      }
    }

    if (roadCapacity === 0) {
      stats.trafficLoad = 0;
      return;
    }

    // Traffic load formula
    let rawTraffic = (this.vehicles.length * 6 + stats.population * 0.1) / roadCapacity;
    let trafficPct = Math.min(100, Math.round(rawTraffic * 40));

    // Traffic jam event
    this.activeEvents.forEach((ev) => {
      if (ev.effects.trafficModifier) {
        trafficPct += ev.effects.trafficModifier;
      }
    });

    stats.trafficLoad = Math.min(100, Math.max(5, trafficPct));
  }

  private updateParticles(buildings: PlacedBuilding[], effectiveDelta: number) {
    // 1. Smokestack particles
    buildings.forEach((b) => {
      const def = BUILDINGS_CATALOG[b.defId];
      if (def && (def.id === 'factory' || def.id === 'heavy_industry' || def.id === 'power_plant')) {
        if (Math.random() < 0.25) {
          // Smoke puff
          this.particles.push({
            x: (b.x - b.y) * 32,
            y: (b.x + b.y) * 16 - 65,
            vx: (Math.random() - 0.5) * 6,
            vy: -15 - Math.random() * 15,
            alpha: 0.7,
            size: 4 + Math.random() * 5,
            color: '#64748b',
            life: 0,
            maxLife: 1.5,
            type: 'smoke',
          });
        }
      }
    });

    // 2. Heavy rain particles
    const isRain = this.activeEvents.some((e) => e.id === 'heavy_rain');
    if (isRain && this.particles.length < 80) {
      for (let i = 0; i < 4; i++) {
        this.particles.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight * 0.4,
          vx: -20,
          vy: 200,
          alpha: 0.6,
          size: 2,
          color: '#bae6fd',
          life: 0,
          maxLife: 0.8,
          type: 'rain',
        });
      }
    }

    // Update particle lifetime
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += effectiveDelta;
      p.x += p.vx * effectiveDelta;
      p.y += p.vy * effectiveDelta;
      p.size += effectiveDelta * 2;
      p.alpha = Math.max(0, 1 - p.life / p.maxLife);

      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }
  }

  private checkMissions(
    grid: Tile[][],
    buildings: PlacedBuilding[],
    stats: CityStats,
    missions: Mission[],
    onMissionCompleted?: (mission: Mission) => void
  ) {
    let roadCount = 0;
    for (let y = 0; y < MAP_SIZE; y++) {
      for (let x = 0; x < MAP_SIZE; x++) {
        if (grid[y]?.[x]?.road) roadCount++;
      }
    }

    missions.forEach((m) => {
      if (m.completed) return;

      let isFinished = false;
      switch (m.targetType) {
        case 'road_count':
          isFinished = roadCount >= m.targetValue;
          break;
        case 'population':
          isFinished = stats.population >= m.targetValue;
          break;
        case 'money':
          isFinished = stats.money >= m.targetValue;
          break;
        case 'happiness':
          isFinished = stats.happiness >= m.targetValue;
          break;
        case 'power':
          isFinished = stats.powerCapacity >= m.targetValue;
          break;
        case 'water':
          isFinished = stats.waterCapacity >= m.targetValue;
          break;
        case 'building_count':
          if (m.targetBuildingId) {
            const count = buildings.filter((b) => b.defId === m.targetBuildingId).length;
            isFinished = count >= m.targetValue;
          }
          break;
      }

      if (isFinished) {
        m.completed = true;
        audio.playMissionComplete();
        if (onMissionCompleted) {
          onMissionCompleted(m);
        }
      }
    });
  }
}
