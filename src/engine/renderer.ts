import {
  ActiveTool,
  BuildingDef,
  CameraState,
  Citizen,
  CityEvent,
  LandSector,
  Particle,
  PlacedBuilding,
  Tile,
  Vehicle,
} from '../types';
import { BUILDINGS_CATALOG } from '../data/buildings';
import {
  getSectorCoords,
  gridToScreen,
  isTileInMap,
  MAP_SIZE,
  TILE_HEIGHT,
  TILE_WIDTH,
} from './isometric';

export class CityRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animFrame: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Could not get 2d context');
    this.ctx = context;
  }

  public render(
    grid: Tile[][],
    sectors: LandSector[],
    buildings: PlacedBuilding[],
    citizens: Citizen[],
    vehicles: Vehicle[],
    particles: Particle[],
    camera: CameraState,
    hoveredGrid: { gx: number; gy: number } | null,
    activeTool: ActiveTool,
    dayTime: number, // 0 to 24
    activeEvents: CityEvent[],
    showGrid: boolean = true
  ) {
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;
    this.animFrame++;

    // 1. Background sky / atmosphere color based on time of day
    const daylight = this.getDaylightFactor(dayTime);
    const skyColor = this.getSkyColor(dayTime);
    ctx.fillStyle = skyColor;
    ctx.fillRect(0, 0, width, height);

    // Visible tile boundaries (culling for performance)
    const zoom = camera.zoom;
    const halfW = (TILE_WIDTH / 2) * zoom;
    const halfH = (TILE_HEIGHT / 2) * zoom;

    // Fast lookup map for sectors
    const unlockedMap = new Map<string, boolean>();
    sectors.forEach((s) => {
      unlockedMap.set(`${s.sectorX},${s.sectorY}`, s.unlocked);
    });

    // Helper to check unlocked tile
    const isTileUnlocked = (gx: number, gy: number) => {
      const sec = getSectorCoords(gx, gy);
      return unlockedMap.get(`${sec.sx},${sec.sy}`) ?? false;
    };

    // Fast lookup map for buildings
    const buildingMap = new Map<string, PlacedBuilding>();
    buildings.forEach((b) => buildingMap.set(b.uid, b));

    // 2. Render Ground & Terrain & Roads (Isometric order: gx + gy)
    for (let sum = 0; sum <= (MAP_SIZE - 1) * 2; sum++) {
      const minX = Math.max(0, sum - (MAP_SIZE - 1));
      const maxX = Math.min(MAP_SIZE - 1, sum);

      for (let x = minX; x <= maxX; x++) {
        const y = sum - x;
        const tile = grid[y]?.[x];
        if (!tile) continue;

        const screenPos = gridToScreen(x, y, camera.x, camera.y, zoom, tile.elevation);

        // View frustum culling
        if (
          screenPos.x < -halfW * 3 ||
          screenPos.x > width + halfW * 3 ||
          screenPos.y < -halfH * 3 ||
          screenPos.y > height + halfH * 6
        ) {
          continue;
        }

        const unlocked = isTileUnlocked(x, y);

        // Draw Ground Tile
        this.drawGroundTile(ctx, screenPos.x, screenPos.y, halfW, halfH, tile, unlocked, daylight);

        // Draw Grid Outline if enabled
        if (showGrid && unlocked && !tile.buildingUid) {
          this.drawTileOutline(ctx, screenPos.x, screenPos.y, halfW, halfH, 'rgba(255,255,255,0.06)');
        }

        // Draw Road if present
        if (tile.road && unlocked) {
          this.drawRoadTile(ctx, screenPos.x, screenPos.y, halfW, halfH, tile, daylight);
        }

        // Draw Trees on natural tiles without road or building
        if (tile.terrain === 'trees' && !tile.road && !tile.buildingUid && unlocked) {
          this.drawTree(ctx, screenPos.x, screenPos.y, halfW, halfH, tile.treeVariant || 0, daylight);
        }
      }
    }

    // 3. Render Buildings (Back-to-front sorting by x + y + height)
    // Sort buildings so taller / foreground ones render in proper visual depth
    const sortedBuildings = [...buildings].sort((a, b) => {
      const depthA = a.x + a.y + a.width + a.height;
      const depthB = b.x + b.y + b.width + b.height;
      return depthA - depthB;
    });

    sortedBuildings.forEach((b) => {
      const def = BUILDINGS_CATALOG[b.defId];
      if (!def) return;
      const originScreen = gridToScreen(b.x, b.y, camera.x, camera.y, zoom, 0);

      this.drawBuilding(
        ctx,
        originScreen.x,
        originScreen.y,
        halfW,
        halfH,
        b,
        def,
        daylight,
        dayTime
      );
    });

    // 4. Render Citizens (Pedestrians)
    citizens.forEach((c) => {
      if (!isTileUnlocked(Math.floor(c.x), Math.floor(c.y))) return;
      const pos = gridToScreen(c.x, c.y, camera.x, camera.y, zoom, 0);
      this.drawCitizen(ctx, pos.x, pos.y, zoom, c, daylight);
    });

    // 5. Render Vehicles (Cars, Buses, Emergency)
    vehicles.forEach((v) => {
      if (!isTileUnlocked(Math.floor(v.x), Math.floor(v.y))) return;
      const pos = gridToScreen(v.x, v.y, camera.x, camera.y, zoom, 0);
      this.drawVehicle(ctx, pos.x, pos.y, zoom, v, daylight, dayTime);
    });

    // 6. Render Particles (Smoke, Rain, Sparks)
    this.drawParticles(ctx, particles, camera);

    // 7. Render Placement Preview Cursor
    if (hoveredGrid && isTileInMap(hoveredGrid.gx, hoveredGrid.gy)) {
      this.drawPlacementPreview(
        ctx,
        grid,
        sectors,
        buildings,
        hoveredGrid.gx,
        hoveredGrid.gy,
        activeTool,
        camera
      );
    }

    // 8. Global Atmospheric Night / Weather Overlay
    this.drawAtmosphereOverlay(ctx, width, height, dayTime, activeEvents);
  }

  private getDaylightFactor(dayTime: number): number {
    // 0 to 24 hours. Peak day around 13:00 (1.0). Peak night around 01:00 (0.15).
    const normalized = ((dayTime - 6 + 24) % 24) / 24; // 0 at 6am
    const angle = normalized * Math.PI * 2;
    // Cosine wave: high during day, low during night
    const factor = (Math.sin(angle) + 1) / 2;
    return Math.max(0.18, Math.min(1.0, factor));
  }

  private getSkyColor(dayTime: number): string {
    if (dayTime >= 6 && dayTime < 8) return '#fdba74'; // dawn
    if (dayTime >= 8 && dayTime < 18) return '#60a5fa'; // daylight sky
    if (dayTime >= 18 && dayTime < 20) return '#f97316'; // dusk
    return '#090d16'; // night sky
  }

  private drawGroundTile(
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    halfW: number,
    halfH: number,
    tile: Tile,
    unlocked: boolean,
    daylight: number
  ) {
    ctx.beginPath();
    ctx.moveTo(sx, sy - halfH);
    ctx.lineTo(sx + halfW, sy);
    ctx.lineTo(sx, sy + halfH);
    ctx.lineTo(sx - halfW, sy);
    ctx.closePath();

    if (!unlocked) {
      // Locked foggy wilderness
      ctx.fillStyle = daylight > 0.5 ? '#1e293b' : '#0f172a';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.stroke();
      return;
    }

    // Unlocked terrain types
    if (tile.terrain === 'water') {
      const wave = Math.sin(this.animFrame * 0.05 + tile.x + tile.y) * 0.15;
      const blueVal = Math.round(180 + wave * 30);
      ctx.fillStyle = `rgb(14, ${Math.round(116 + wave * 20)}, ${blueVal})`;
      ctx.fill();

      // Water gentle ripple line
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.15 + wave * 0.1})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(sx - halfW * 0.4, sy);
      ctx.lineTo(sx + halfW * 0.4, sy);
      ctx.stroke();
    } else if (tile.terrain === 'sand') {
      ctx.fillStyle = daylight > 0.5 ? '#fde047' : '#ca8a04';
      ctx.fill();
    } else {
      // Grass with subtle checker hue
      const isAlt = (tile.x + tile.y) % 2 === 0;
      if (daylight > 0.5) {
        ctx.fillStyle = isAlt ? '#4ade80' : '#22c55e';
      } else {
        ctx.fillStyle = isAlt ? '#15803d' : '#166534';
      }
      ctx.fill();
    }
  }

  private drawTileOutline(
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    halfW: number,
    halfH: number,
    color: string
  ) {
    ctx.beginPath();
    ctx.moveTo(sx, sy - halfH);
    ctx.lineTo(sx + halfW, sy);
    ctx.lineTo(sx, sy + halfH);
    ctx.lineTo(sx - halfW, sy);
    ctx.closePath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  private drawRoadTile(
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    halfW: number,
    halfH: number,
    tile: Tile,
    daylight: number
  ) {
    const road = tile.road;
    if (!road) return;

    // Asphalt diamond base
    ctx.beginPath();
    ctx.moveTo(sx, sy - halfH);
    ctx.lineTo(sx + halfW, sy);
    ctx.lineTo(sx, sy + halfH);
    ctx.lineTo(sx - halfW, sy);
    ctx.closePath();

    if (road.isBridge) {
      // Wooden/Concrete bridge planks over water
      ctx.fillStyle = '#78716c';
      ctx.fill();
      ctx.strokeStyle = '#44403c';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      // Smooth dark asphalt
      ctx.fillStyle = road.type === 'highway' ? '#1e293b' : '#334155';
      ctx.fill();
    }

    // Road markings
    const { north, south, east, west } = road.connections;
    ctx.strokeStyle = road.type === 'highway' ? '#fbbf24' : '#ffffff';
    ctx.lineWidth = Math.max(1.5, halfW * 0.08);

    // Draw connection lines to connected borders
    ctx.beginPath();
    const cx = sx;
    const cy = sy;

    // North-West (X-), North-East (Y-), South-East (X+), South-West (Y+)
    // In our coordinate projection:
    // West (-X) goes to: (sx - halfW/2, sy - halfH/2)
    // East (+X) goes to: (sx + halfW/2, sy + halfH/2)
    // North (-Y) goes to: (sx + halfW/2, sy - halfH/2)
    // South (+Y) goes to: (sx - halfW/2, sy + halfH/2)

    if (west) {
      ctx.moveTo(cx, cy);
      ctx.lineTo(sx - halfW * 0.5, sy - halfH * 0.5);
    }
    if (east) {
      ctx.moveTo(cx, cy);
      ctx.lineTo(sx + halfW * 0.5, sy + halfH * 0.5);
    }
    if (north) {
      ctx.moveTo(cx, cy);
      ctx.lineTo(sx + halfW * 0.5, sy - halfH * 0.5);
    }
    if (south) {
      ctx.moveTo(cx, cy);
      ctx.lineTo(sx - halfW * 0.5, sy + halfH * 0.5);
    }

    // If isolated road, draw center dot
    if (!north && !south && !east && !west) {
      ctx.arc(cx, cy, halfW * 0.15, 0, Math.PI * 2);
    }

    ctx.stroke();

    // Night street lamp post glow on roads
    if (daylight < 0.4) {
      ctx.fillStyle = 'rgba(253, 224, 71, 0.2)';
      ctx.beginPath();
      ctx.arc(cx, cy, halfW * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawTree(
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    halfW: number,
    halfH: number,
    variant: number,
    daylight: number
  ) {
    const treeH = halfH * 1.6;

    // Trunk
    ctx.fillStyle = '#78350f';
    ctx.fillRect(sx - 2, sy - treeH * 0.4, 4, treeH * 0.4);

    // Foliage crown (isometric sphere or pine triangle)
    const foliageColor =
      variant === 0 ? (daylight > 0.5 ? '#15803d' : '#14532d') :
      variant === 1 ? (daylight > 0.5 ? '#16a34a' : '#166534') :
      (daylight > 0.5 ? '#047857' : '#064e3b');

    ctx.beginPath();
    ctx.arc(sx, sy - treeH * 0.7, halfW * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = foliageColor;
    ctx.fill();

    // Highlight on top-left of crown
    ctx.beginPath();
    ctx.arc(sx - halfW * 0.1, sy - treeH * 0.8, halfW * 0.18, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fill();
  }

  private drawBuilding(
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    halfW: number,
    halfH: number,
    placed: PlacedBuilding,
    def: BuildingDef,
    daylight: number,
    dayTime: number
  ) {
    const bw = placed.width;
    const bh = placed.height;

    // Isometric 3D building dimensions
    // Width along X and Y axes
    const spanX = (bw * halfW);
    const spanY = (bh * halfH);

    // Building height in pixels
    let heightPx = 28;
    if (def.id === 'house') heightPx = 30;
    else if (def.id === 'townhouse') heightPx = 45;
    else if (def.id === 'apartments') heightPx = 80;
    else if (def.id === 'residential_tower') heightPx = 140;
    else if (def.id === 'shop') heightPx = 32;
    else if (def.id === 'restaurant') heightPx = 35;
    else if (def.id === 'shopping_mall') heightPx = 60;
    else if (def.id === 'bank') heightPx = 55;
    else if (def.id === 'offices') heightPx = 95;
    else if (def.id === 'headquarters') heightPx = 150;
    else if (def.id === 'factory') heightPx = 50;
    else if (def.id === 'heavy_industry') heightPx = 65;
    else if (def.id === 'hospital') heightPx = 65;
    else if (def.id === 'school') heightPx = 45;
    else if (def.id === 'police') heightPx = 55;
    else if (def.id === 'fire_station') heightPx = 45;
    else if (def.id === 'power_plant') heightPx = 65;
    else if (def.id === 'solar_plant') heightPx = 16;
    else if (def.id === 'water_tower') heightPx = 55;
    else if (def.id === 'stadium') heightPx = 50;
    else if (def.id === 'airport') heightPx = 40;
    else if (def.id === 'park_small' || def.id === 'fountain_plaza') heightPx = 12;

    const baseColor = def.color || '#cbd5e1';
    const roofColor = def.roofColor || '#475569';

    // The base 4 corners of the building footprint on the ground:
    // Top: (sx, sy - spanY)
    // Right: (sx + spanX, sy)
    // Bottom: (sx + spanX - bw*halfW, sy + spanY) -> mathematically:
    // Bottom vertex is (gx + bw, gy + bh)
    const topGround = { x: sx, y: sy - halfH };
    const rightGround = { x: sx + bw * halfW, y: sy + (bw - 1) * halfH };
    const leftGround = { x: sx - bh * halfW, y: sy + (bh - 1) * halfH };
    const bottomGround = {
      x: sx + (bw - bh) * halfW,
      y: sy + (bw + bh - 1) * halfH,
    };

    // Roof vertices (lifted by heightPx)
    const topRoof = { x: topGround.x, y: topGround.y - heightPx };
    const rightRoof = { x: rightGround.x, y: rightGround.y - heightPx };
    const leftRoof = { x: leftGround.x, y: leftGround.y - heightPx };
    const bottomRoof = { x: bottomGround.x, y: bottomGround.y - heightPx };

    // --- Special: Park or Fountain ---
    if (def.category === 'parks') {
      this.drawParkSpecial(ctx, topGround, rightGround, bottomGround, leftGround, def);
      return;
    }

    // --- Special: Solar Plant ---
    if (def.id === 'solar_plant') {
      this.drawSolarSpecial(ctx, topRoof, rightRoof, bottomRoof, leftRoof);
      return;
    }

    // 1. Drop shadow behind the building
    ctx.beginPath();
    ctx.moveTo(bottomGround.x, bottomGround.y);
    ctx.lineTo(rightGround.x + 10, rightGround.y + 4);
    ctx.lineTo(topGround.x + 15, topGround.y + 2);
    ctx.lineTo(topGround.x, topGround.y);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fill();

    // 2. Left Wall (in shade)
    ctx.beginPath();
    ctx.moveTo(leftGround.x, leftGround.y);
    ctx.lineTo(bottomGround.x, bottomGround.y);
    ctx.lineTo(bottomRoof.x, bottomRoof.y);
    ctx.lineTo(leftRoof.x, leftRoof.y);
    ctx.closePath();
    ctx.fillStyle = this.shadeColor(baseColor, -25);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.stroke();

    // 3. Right Wall (in darker shade)
    ctx.beginPath();
    ctx.moveTo(bottomGround.x, bottomGround.y);
    ctx.lineTo(rightGround.x, rightGround.y);
    ctx.lineTo(rightRoof.x, rightRoof.y);
    ctx.lineTo(bottomRoof.x, bottomRoof.y);
    ctx.closePath();
    ctx.fillStyle = this.shadeColor(baseColor, -40);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.stroke();

    // 4. Windows on Walls (Illuminated warmly if night!)
    const isNight = daylight < 0.4;
    const windowGlow = isNight ? '#fef08a' : '#93c5fd';
    this.drawBuildingWindows(ctx, leftRoof, leftGround, bottomRoof, bottomGround, rightRoof, rightGround, heightPx, windowGlow, isNight);

    // 5. Roof Face (top)
    ctx.beginPath();
    ctx.moveTo(topRoof.x, topRoof.y);
    ctx.lineTo(rightRoof.x, rightRoof.y);
    ctx.lineTo(bottomRoof.x, bottomRoof.y);
    ctx.lineTo(leftRoof.x, leftRoof.y);
    ctx.closePath();
    ctx.fillStyle = roofColor;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.stroke();

    // 6. Architectural Details & Roof Features
    if (def.id === 'house' || def.id === 'townhouse') {
      // Gable peak
      ctx.beginPath();
      ctx.moveTo(topRoof.x, topRoof.y - 12);
      ctx.lineTo(bottomRoof.x, bottomRoof.y - 12);
      ctx.strokeStyle = '#991b1b';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Chimney
      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(topRoof.x + 8, topRoof.y - 14, 6, 12);
    } else if (def.id === 'hospital') {
      // Red Cross Symbol on roof
      const cx = (topRoof.x + bottomRoof.x) / 2;
      const cy = (topRoof.y + bottomRoof.y) / 2;
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(cx - 8, cy - 3, 16, 6);
      ctx.fillRect(cx - 3, cy - 8, 6, 16);
    } else if (def.id === 'stadium') {
      // Green pitch in center of stadium roof
      const cx = (topRoof.x + bottomRoof.x) / 2;
      const cy = (topRoof.y + bottomRoof.y) / 2;
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.ellipse(cx, cy, bw * 14, bh * 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else if (def.id === 'water_tower') {
      // Blue spherical tank
      const cx = (topRoof.x + bottomRoof.x) / 2;
      const cy = (topRoof.y + bottomRoof.y) / 2 - 8;
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0284c7';
      ctx.stroke();
    } else if (def.id === 'residential_tower' || def.id === 'headquarters') {
      // Rooftop antenna with blinking beacon
      const cx = (topRoof.x + bottomRoof.x) / 2;
      const cy = (topRoof.y + bottomRoof.y) / 2;
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx, cy - 25);
      ctx.stroke();

      // Blinking red beacon
      if (Math.sin(this.animFrame * 0.1) > 0) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(cx, cy - 25, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (def.id === 'factory' || def.id === 'power_plant') {
      // Industrial Smokestacks
      const cx = topRoof.x + 12;
      const cy = topRoof.y + 4;
      ctx.fillStyle = '#475569';
      ctx.fillRect(cx - 4, cy - 18, 8, 18);
      ctx.fillRect(cx + 10, cy - 22, 8, 22);

      // Warning red/white stripes on rim
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(cx - 4, cy - 18, 8, 3);
      ctx.fillRect(cx + 10, cy - 22, 8, 3);
    }

    // 7. Power / Water warning badge if unserviced
    if (!placed.hasPower || !placed.hasWater) {
      const cx = (topRoof.x + bottomRoof.x) / 2;
      const cy = topRoof.y - 15;
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(cx, cy, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(!placed.hasPower ? '⚡' : '💧', cx, cy);
    }
  }

  private drawBuildingWindows(
    ctx: CanvasRenderingContext2D,
    lr: { x: number; y: number },
    lg: { x: number; y: number },
    br: { x: number; y: number },
    bg: { x: number; y: number },
    rr: { x: number; y: number },
    rg: { x: number; y: number },
    heightPx: number,
    glowColor: string,
    isNight: boolean
  ) {
    if (heightPx < 25) return;
    const rows = Math.min(6, Math.floor(heightPx / 16));
    ctx.fillStyle = glowColor;

    // Draw window dots on left and right visible faces
    for (let r = 1; r <= rows; r++) {
      const factor = r / (rows + 1);

      // Left face windows
      const p1x = lr.x * (1 - factor) + lg.x * factor;
      const p1y = lr.y * (1 - factor) + lg.y * factor;
      const p2x = br.x * (1 - factor) + bg.x * factor;
      const p2y = br.y * (1 - factor) + bg.y * factor;

      for (let w = 1; w <= 3; w++) {
        const wf = w / 4;
        const wx = p1x * (1 - wf) + p2x * wf;
        const wy = p1y * (1 - wf) + p2y * wf;
        ctx.fillRect(wx - 2, wy - 3, 4, 6);
      }

      // Right face windows
      const q1x = br.x * (1 - factor) + bg.x * factor;
      const q1y = br.y * (1 - factor) + bg.y * factor;
      const q2x = rr.x * (1 - factor) + rg.x * factor;
      const q2y = rr.y * (1 - factor) + rg.y * factor;

      for (let w = 1; w <= 3; w++) {
        const wf = w / 4;
        const wx = q1x * (1 - wf) + q2x * wf;
        const wy = q1y * (1 - wf) + q2y * wf;
        ctx.fillRect(wx - 2, wy - 3, 4, 6);
      }
    }
  }

  private drawParkSpecial(
    ctx: CanvasRenderingContext2D,
    top: { x: number; y: number },
    right: { x: number; y: number },
    bottom: { x: number; y: number },
    left: { x: number; y: number },
    def: BuildingDef
  ) {
    // Lush green park base
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(right.x, right.y);
    ctx.lineTo(bottom.x, bottom.y);
    ctx.lineTo(left.x, left.y);
    ctx.closePath();
    ctx.fillStyle = '#4ade80';
    ctx.fill();
    ctx.strokeStyle = '#15803d';
    ctx.stroke();

    const cx = (top.x + bottom.x) / 2;
    const cy = (top.y + bottom.y) / 2;

    if (def.id === 'fountain_plaza') {
      // Marble fountain basin
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.ellipse(cx, cy, 18, 9, 0, 0, Math.PI * 2);
      ctx.fill();

      // Water pool
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.ellipse(cx, cy, 14, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Animated water jet
      const jetH = 8 + Math.sin(this.animFrame * 0.15) * 4;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx, cy - jetH);
      ctx.stroke();
    } else {
      // Small park with benches and tree
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.arc(cx - 8, cy - 8, 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx + 10, cy - 4, 8, 0, Math.PI * 2);
      ctx.fill();

      // Little brown bench
      ctx.fillStyle = '#78350f';
      ctx.fillRect(cx - 4, cy + 2, 8, 3);
    }
  }

  private drawSolarSpecial(
    ctx: CanvasRenderingContext2D,
    top: { x: number; y: number },
    right: { x: number; y: number },
    bottom: { x: number; y: number },
    left: { x: number; y: number }
  ) {
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(right.x, right.y);
    ctx.lineTo(bottom.x, bottom.y);
    ctx.lineTo(left.x, left.y);
    ctx.closePath();
    ctx.fillStyle = '#1e3a8a';
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Solar grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo((top.x + left.x) / 2, (top.y + left.y) / 2);
    ctx.lineTo((right.x + bottom.x) / 2, (right.y + bottom.y) / 2);
    ctx.moveTo((top.x + right.x) / 2, (top.y + right.y) / 2);
    ctx.lineTo((left.x + bottom.x) / 2, (left.y + bottom.y) / 2);
    ctx.stroke();
  }

  private drawCitizen(
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    zoom: number,
    c: Citizen,
    daylight: number
  ) {
    const size = Math.max(3, 4 * zoom);
    // Walking leg bobbing
    const bob = Math.sin(this.animFrame * 0.2 + c.x * 10) * 1.5;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(sx, sy + 1, size * 0.8, size * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = c.color;
    ctx.fillRect(sx - size * 0.5, sy - size * 1.8 + bob, size, size * 1.2);

    // Head
    ctx.fillStyle = '#fed7aa';
    ctx.beginPath();
    ctx.arc(sx, sy - size * 2.2 + bob, size * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawVehicle(
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    zoom: number,
    v: Vehicle,
    daylight: number,
    dayTime: number
  ) {
    const w = Math.max(5, 8 * zoom);
    const h = Math.max(3, 5 * zoom);

    // Car shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(sx, sy + 1, w * 0.9, h * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Car body box
    ctx.fillStyle = v.color;
    ctx.beginPath();
    ctx.roundRect(sx - w * 0.5, sy - h * 1.2, w, h, 2);
    ctx.fill();

    // Windshield
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(sx - w * 0.3, sy - h * 1.1, w * 0.6, h * 0.4);

    // Emergency lights for police/ambulance/fire_truck
    if (v.type === 'police' || v.type === 'ambulance' || v.type === 'fire_truck') {
      const flash = Math.sin(this.animFrame * 0.3) > 0;
      ctx.fillStyle = flash ? '#ef4444' : '#3b82f6';
      ctx.fillRect(sx - 2, sy - h * 1.7, 4, 3);
    }

    // Night headlights beam
    if (daylight < 0.45) {
      ctx.fillStyle = 'rgba(254, 240, 138, 0.4)';
      ctx.beginPath();
      let dx = 0;
      let dy = 0;
      if (v.direction === 'E') {
        dx = 15 * zoom;
        dy = 8 * zoom;
      } else if (v.direction === 'W') {
        dx = -15 * zoom;
        dy = -8 * zoom;
      } else if (v.direction === 'S') {
        dx = -15 * zoom;
        dy = 8 * zoom;
      } else {
        dx = 15 * zoom;
        dy = -8 * zoom;
      }

      ctx.moveTo(sx, sy - 2);
      ctx.lineTo(sx + dx - 6, sy + dy + 4);
      ctx.lineTo(sx + dx + 6, sy + dy - 4);
      ctx.closePath();
      ctx.fill();
    }
  }

  private drawParticles(
    ctx: CanvasRenderingContext2D,
    particles: Particle[],
    camera: CameraState
  ) {
    const zoom = camera.zoom;
    particles.forEach((p) => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;

      if (p.type === 'rain') {
        ctx.strokeStyle = 'rgba(186, 230, 253, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + 3, p.y + 12);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * zoom, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.globalAlpha = 1.0;
  }

  private drawPlacementPreview(
    ctx: CanvasRenderingContext2D,
    grid: Tile[][],
    sectors: LandSector[],
    buildings: PlacedBuilding[],
    gx: number,
    gy: number,
    activeTool: ActiveTool,
    camera: CameraState
  ) {
    if (activeTool === 'inspect') {
      const pos = gridToScreen(gx, gy, camera.x, camera.y, camera.zoom, 0);
      const halfW = (TILE_WIDTH / 2) * camera.zoom;
      const halfH = (TILE_HEIGHT / 2) * camera.zoom;
      this.drawTileOutline(ctx, pos.x, pos.y, halfW, halfH, '#38bdf8');
      return;
    }

    if (activeTool === 'expand') {
      // Highlight entire sector hovered
      const sec = getSectorCoords(gx, gy);
      const targetSector = sectors.find(
        (s) => s.sectorX === sec.sx && s.sectorY === sec.sy
      );
      if (!targetSector) return;

      const fillColor = targetSector.unlocked
        ? 'rgba(34, 197, 94, 0.15)'
        : 'rgba(234, 179, 8, 0.25)';
      const strokeColor = targetSector.unlocked ? '#22c55e' : '#eab308';

      // Draw all tiles in sector
      const startX = sec.sx * 8;
      const startY = sec.sy * 8;
      for (let y = startY; y < startY + 8; y++) {
        for (let x = startX; x < startX + 8; x++) {
          const pos = gridToScreen(x, y, camera.x, camera.y, camera.zoom, 0);
          const halfW = (TILE_WIDTH / 2) * camera.zoom;
          const halfH = (TILE_HEIGHT / 2) * camera.zoom;
          ctx.beginPath();
          ctx.moveTo(pos.x, pos.y - halfH);
          ctx.lineTo(pos.x + halfW, pos.y);
          ctx.lineTo(pos.x, pos.y + halfH);
          ctx.lineTo(pos.x - halfW, pos.y);
          ctx.closePath();
          ctx.fillStyle = fillColor;
          ctx.fill();
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
      return;
    }

    // Road or Building placement preview
    let reqWidth = 1;
    let reqHeight = 1;
    const isRoad = activeTool.startsWith('road_');
    const isBulldoze = activeTool === 'bulldoze';

    if (!isRoad && !isBulldoze) {
      const def = BUILDINGS_CATALOG[activeTool];
      if (def) {
        reqWidth = def.width;
        reqHeight = def.height;
      }
    }

    // Check validity
    let isValid = true;
    for (let dy = 0; dy < reqHeight; dy++) {
      for (let dx = 0; dx < reqWidth; dx++) {
        const tx = gx + dx;
        const ty = gy + dy;
        if (!isTileInMap(tx, ty)) {
          isValid = false;
          break;
        }
        const t = grid[ty]?.[tx];
        if (!t) {
          isValid = false;
          break;
        }

        const sec = getSectorCoords(tx, ty);
        const s = sectors.find((secItem) => secItem.sectorX === sec.sx && secItem.sectorY === sec.sy);
        if (!s || !s.unlocked) {
          isValid = false;
          break;
        }

        if (isBulldoze) {
          // Valid if has road or building
          if (!t.road && !t.buildingUid && t.terrain !== 'trees') {
            isValid = false;
          }
        } else if (isRoad) {
          if (t.buildingUid) isValid = false;
        } else {
          // Building placement: must be free of road, building, and water
          if (t.road || t.buildingUid || t.terrain === 'water') {
            isValid = false;
          }
        }
      }
    }

    const previewColor = isBulldoze
      ? 'rgba(239, 68, 68, 0.4)'
      : isValid
      ? 'rgba(34, 197, 94, 0.4)'
      : 'rgba(239, 68, 68, 0.4)';
    const strokeColor = isBulldoze ? '#ef4444' : isValid ? '#22c55e' : '#ef4444';

    for (let dy = 0; dy < reqHeight; dy++) {
      for (let dx = 0; dx < reqWidth; dx++) {
        const tx = gx + dx;
        const ty = gy + dy;
        const pos = gridToScreen(tx, ty, camera.x, camera.y, camera.zoom, 0);
        const halfW = (TILE_WIDTH / 2) * camera.zoom;
        const halfH = (TILE_HEIGHT / 2) * camera.zoom;

        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y - halfH);
        ctx.lineTo(pos.x + halfW, pos.y);
        ctx.lineTo(pos.x, pos.y + halfH);
        ctx.lineTo(pos.x - halfW, pos.y);
        ctx.closePath();
        ctx.fillStyle = previewColor;
        ctx.fill();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
  }

  private drawAtmosphereOverlay(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    dayTime: number,
    activeEvents: CityEvent[]
  ) {
    // Night vignette overlay
    const daylight = this.getDaylightFactor(dayTime);
    if (daylight < 0.6) {
      const nightOpacity = (0.6 - daylight) * 0.9;
      ctx.fillStyle = `rgba(15, 23, 42, ${nightOpacity})`;
      ctx.fillRect(0, 0, width, height);
    }

    // Heavy rain overlay effect if event active
    const hasRain = activeEvents.some((e) => e.id === 'heavy_rain');
    if (hasRain) {
      ctx.fillStyle = 'rgba(14, 116, 144, 0.12)';
      ctx.fillRect(0, 0, width, height);
    }
  }

  private shadeColor(color: string, percent: number): string {
    let R = parseInt(color.substring(1, 3), 16) || 128;
    let G = parseInt(color.substring(3, 5), 16) || 128;
    let B = parseInt(color.substring(5, 7), 16) || 128;

    R = Math.round((R * (100 + percent)) / 100);
    G = Math.round((G * (100 + percent)) / 100);
    B = Math.round((B * (100 + percent)) / 100);

    R = Math.min(255, Math.max(0, R));
    G = Math.min(255, Math.max(0, G));
    B = Math.min(255, Math.max(0, B));

    const RR = R.toString(16).padStart(2, '0');
    const GG = G.toString(16).padStart(2, '0');
    const BB = B.toString(16).padStart(2, '0');
    return `#${RR}${GG}${BB}`;
  }
}
