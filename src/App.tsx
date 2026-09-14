/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  ActiveTool,
  CameraState,
  CityEvent,
  CityStats,
  LandSector,
  Mission,
  PlacedBuilding,
  RoadType,
  Tile,
} from './types';
import { BUILDINGS_CATALOG, ROAD_COSTS } from './data/buildings';
import { INITIAL_MISSIONS } from './data/missions';
import {
  clearSavedCity,
  createInitialMap,
  createInitialStats,
  loadCityFromStorage,
  saveCityToStorage,
} from './engine/cityState';
import {
  getSectorCoords,
  isTileInMap,
  MAP_SIZE,
  screenToGrid,
  SECTOR_SIZE,
  updateRoadConnections,
} from './engine/isometric';
import { CityRenderer } from './engine/renderer';
import { SimulationEngine } from './engine/simulation';
import { audio } from './utils/audio';

// Components
import { HeaderBar } from './components/HeaderBar';
import { BottomToolbar } from './components/BottomToolbar';
import { InspectorPanel } from './components/InspectorPanel';
import { MissionsModal } from './components/MissionsModal';
import { StatsModal } from './components/StatsModal';
import { SettingsModal } from './components/SettingsModal';
import { ExpansionModal } from './components/ExpansionModal';
import { EventNotification } from './components/EventNotification';
import { CameraControls } from './components/CameraControls';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<CityRenderer | null>(null);
  const simRef = useRef<SimulationEngine | null>(null);

  // Game Core State
  const [cityName, setCityName] = useState<string>('Metro City');
  const [grid, setGrid] = useState<Tile[][]>([]);
  const [sectors, setSectors] = useState<LandSector[]>([]);
  const [buildings, setBuildings] = useState<PlacedBuilding[]>([]);
  const [stats, setStats] = useState<CityStats>(createInitialStats);
  const [missions, setMissions] = useState<Mission[]>(INITIAL_MISSIONS);

  // Simulation Time & Speed
  const [dayCount, setDayCount] = useState<number>(1);
  const [dayTime, setDayTime] = useState<number>(9.0);
  const [gameSpeed, setGameSpeed] = useState<number>(1);
  const [activeEvents, setActiveEvents] = useState<CityEvent[]>([]);

  // Tool & Camera State
  const [activeTool, setActiveTool] = useState<ActiveTool>('inspect');
  const [hoveredGrid, setHoveredGrid] = useState<{ gx: number; gy: number } | null>(null);
  const [camera, setCamera] = useState<CameraState>({ x: 0, y: 0, zoom: 1.0 });

  // Inspection & Modals
  const [selectedTile, setSelectedTile] = useState<Tile | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<PlacedBuilding | null>(null);
  const [selectedSectorToUnlock, setSelectedSectorToUnlock] = useState<LandSector | null>(null);

  const [showMissionsModal, setShowMissionsModal] = useState<boolean>(false);
  const [showStatsModal, setShowStatsModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Touch / Drag Interaction Refs
  const isDraggingRef = useRef<boolean>(false);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragDistanceRef = useRef<number>(0);
  const lastPinchDistRef = useRef<number | null>(null);

  // 1. Initialize Map & Game Data (Restore from LocalStorage if exists)
  useEffect(() => {
    const saved = loadCityFromStorage();
    if (saved) {
      setCityName(saved.cityName || 'Metro City');
      setGrid(saved.grid as Tile[][]);
      setSectors(saved.sectors);
      setBuildings(saved.buildings);
      setStats(saved.stats);
      setMissions(saved.missions || INITIAL_MISSIONS);
      setDayCount(saved.dayCount || 1);
      setDayTime(saved.dayTime || 9.0);
      simRef.current = new SimulationEngine(saved.dayCount || 1, saved.dayTime || 9.0);
    } else {
      const init = createInitialMap();
      setGrid(init.grid);
      setSectors(init.sectors);
      setBuildings(init.buildings);
      setStats(createInitialStats());
      simRef.current = new SimulationEngine(1, 9.0);
    }
  }, []);

  // 2. Center Camera when canvas mounts
  useEffect(() => {
    if (canvasRef.current) {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvasRef.current.width = w;
      canvasRef.current.height = h;
      rendererRef.current = new CityRenderer(canvasRef.current);

      // Center on initial unlocked sector (center of map)
      setCamera({
        x: w / 2,
        y: h / 2 - 120,
        zoom: 1.0,
      });
    }

    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 3. Auto-save every 15 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      if (grid.length > 0) {
        saveCityToStorage({
          version: 1,
          cityName,
          dayCount,
          dayTime,
          stats,
          sectors,
          buildings,
          missions,
          grid,
        });
      }
    }, 15000);
    return () => clearInterval(timer);
  }, [grid, sectors, buildings, stats, missions, dayCount, dayTime, cityName]);

  // 4. Main Game Loop (Simulation & Rendering via requestAnimationFrame)
  useEffect(() => {
    let animationId: number;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const deltaMs = currentTime - lastTime;
      lastTime = currentTime;

      const sim = simRef.current;
      const renderer = rendererRef.current;

      if (sim && grid.length > 0) {
        sim.gameSpeed = gameSpeed;
        sim.update(
          deltaMs,
          grid,
          sectors,
          buildings,
          stats,
          missions,
          (completedMission) => {
            // Updated in state
            setMissions([...missions]);
          },
          (newEvent) => {
            setActiveEvents([...sim.activeEvents]);
          }
        );

        setDayTime(sim.dayTime);
        setDayCount(sim.dayCount);
        setActiveEvents([...sim.activeEvents]);
      }

      if (renderer && grid.length > 0) {
        renderer.render(
          grid,
          sectors,
          buildings,
          sim ? sim.citizens : [],
          sim ? sim.vehicles : [],
          sim ? sim.particles : [],
          camera,
          hoveredGrid,
          activeTool,
          sim ? sim.dayTime : dayTime,
          sim ? sim.activeEvents : [],
          true
        );
      }

      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationId);
  }, [grid, sectors, buildings, stats, missions, camera, hoveredGrid, activeTool, gameSpeed]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveTool('inspect');
        setSelectedTile(null);
        setSelectedBuilding(null);
      } else if (e.key === 'b' || e.key === 'B') {
        setActiveTool('bulldoze');
      } else if (e.key === 'r' || e.key === 'R') {
        setActiveTool('road_small');
      } else if (e.key === ' ') {
        setGameSpeed((s) => (s === 0 ? 1 : 0));
      } else if (e.key === '1') {
        setGameSpeed(1);
      } else if (e.key === '2') {
        setGameSpeed(2);
      } else if (e.key === '3' || e.key === '5') {
        setGameSpeed(5);
      } else if (e.key === 'm' || e.key === 'M') {
        setShowMissionsModal((v) => !v);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --- Building Placement & Modification Logic ---
  const handleTileAction = (gx: number, gy: number) => {
    if (!isTileInMap(gx, gy)) return;

    // 1. Expand Sector Mode
    if (activeTool === 'expand') {
      const sec = getSectorCoords(gx, gy);
      const targetSector = sectors.find(
        (s) => s.sectorX === sec.sx && s.sectorY === sec.sy
      );
      if (targetSector && !targetSector.unlocked) {
        setSelectedSectorToUnlock(targetSector);
      }
      return;
    }

    // Check if tile is in unlocked territory
    const sec = getSectorCoords(gx, gy);
    const targetSector = sectors.find(
      (s) => s.sectorX === sec.sx && s.sectorY === sec.sy
    );
    if (!targetSector || !targetSector.unlocked) return;

    const clickedTile = grid[gy]?.[gx];
    if (!clickedTile) return;

    // 2. Inspect Mode
    if (activeTool === 'inspect') {
      setSelectedTile(clickedTile);
      if (clickedTile.buildingUid) {
        const b = buildings.find((item) => item.uid === clickedTile.buildingUid) || null;
        setSelectedBuilding(b);
      } else {
        setSelectedBuilding(null);
      }
      return;
    }

    // 3. Bulldoze Mode
    if (activeTool === 'bulldoze') {
      demolishAt(gx, gy);
      return;
    }

    // 4. Road Construction Mode
    if (activeTool.startsWith('road_')) {
      const roadType = activeTool.replace('road_', '') as RoadType;
      const roadCostDef = ROAD_COSTS[roadType];
      if (!roadCostDef) return;

      const effectiveCost = getDiscountedCost(roadCostDef.cost);
      if (stats.money < effectiveCost) return;
      if (clickedTile.buildingUid) return; // Cannot build through building

      // Deduct funds
      setStats((prev) => ({ ...prev, money: prev.money - effectiveCost }));
      audio.playRoad();

      // Place road
      const isBridge = clickedTile.terrain === 'water';
      clickedTile.road = {
        type: roadType,
        connections: { north: false, south: false, east: false, west: false },
        isBridge,
      };

      // Update connectivity on this tile and surrounding 4 neighbors
      updateRoadConnections(grid, gx, gy);
      updateRoadConnections(grid, gx, gy - 1);
      updateRoadConnections(grid, gx, gy + 1);
      updateRoadConnections(grid, gx + 1, gy);
      updateRoadConnections(grid, gx - 1, gy);

      setGrid([...grid]);
      return;
    }

    // 5. Place Building Mode
    const def = BUILDINGS_CATALOG[activeTool];
    if (!def) return;

    const effectiveCost = getDiscountedCost(def.cost);
    if (stats.money < effectiveCost) return;

    // Verify all tiles within footprint are free and unlocked
    const bw = def.width;
    const bh = def.height;
    for (let dy = 0; dy < bh; dy++) {
      for (let dx = 0; dx < bw; dx++) {
        const tx = gx + dx;
        const ty = gy + dy;
        if (!isTileInMap(tx, ty)) return;
        const t = grid[ty]?.[tx];
        if (!t) return;
        const s = sectors.find(
          (secItem) =>
            secItem.sectorX === Math.floor(tx / SECTOR_SIZE) &&
            secItem.sectorY === Math.floor(ty / SECTOR_SIZE)
        );
        if (!s || !s.unlocked) return;
        if (t.road || t.buildingUid || t.terrain === 'water') return;
      }
    }

    // Deduct cost and place
    setStats((prev) => ({ ...prev, money: prev.money - effectiveCost }));
    audio.playBuild();

    const buildingUid = `bld_${Date.now()}_${Math.random()}`;
    const newBuilding: PlacedBuilding = {
      uid: buildingUid,
      defId: def.id,
      x: gx,
      y: gy,
      width: bw,
      height: bh,
      placedAtDay: dayCount,
      hasPower: true,
      hasWater: true,
      currentWorkers: def.jobs,
      currentResidents: def.population,
    };

    // Mark tiles
    for (let dy = 0; dy < bh; dy++) {
      for (let dx = 0; dx < bw; dx++) {
        const t = grid[gy + dy][gx + dx];
        t.buildingUid = buildingUid;
        if (t.terrain === 'trees') {
          t.terrain = 'grass';
        }
      }
    }

    setBuildings((prev) => [...prev, newBuilding]);
    setGrid([...grid]);
  };

  const demolishAt = (gx: number, gy: number) => {
    const tile = grid[gy]?.[gx];
    if (!tile) return;

    audio.playDemolish();

    // 1. Demolish building
    if (tile.buildingUid) {
      const bUid = tile.buildingUid;
      // Free all tiles occupied by this building
      for (let y = 0; y < MAP_SIZE; y++) {
        for (let x = 0; x < MAP_SIZE; x++) {
          if (grid[y][x].buildingUid === bUid) {
            grid[y][x].buildingUid = null;
          }
        }
      }
      setBuildings((prev) => prev.filter((b) => b.uid !== bUid));
      setGrid([...grid]);
      setSelectedTile(null);
      setSelectedBuilding(null);
      return;
    }

    // 2. Demolish road
    if (tile.road) {
      tile.road = null;
      // Recompute connections for neighbors
      updateRoadConnections(grid, gx, gy - 1);
      updateRoadConnections(grid, gx, gy + 1);
      updateRoadConnections(grid, gx + 1, gy);
      updateRoadConnections(grid, gx - 1, gy);
      setGrid([...grid]);
      setSelectedTile(null);
      return;
    }

    // 3. Clear trees ($10 cost)
    if (tile.terrain === 'trees') {
      tile.terrain = 'grass';
      setStats((prev) => ({ ...prev, money: Math.max(0, prev.money - 10) }));
      setGrid([...grid]);
    }
  };

  const getDiscountedCost = (cost: number) => {
    const hasDiscount = activeEvents.some((e) => e.effects.constructionDiscount);
    if (hasDiscount) {
      return Math.round(cost * 0.7);
    }
    return cost;
  };

  // --- Mouse & Touch Dragging and Canvas Events ---
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      isDraggingRef.current = true;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
      dragDistanceRef.current = 0;
    } else if (e.button === 2) {
      // Right click cancels tool
      e.preventDefault();
      setActiveTool('inspect');
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingRef.current) {
      const dx = e.clientX - lastMousePosRef.current.x;
      const dy = e.clientY - lastMousePosRef.current.y;
      dragDistanceRef.current += Math.hypot(dx, dy);
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };

      setCamera((prev) => ({
        ...prev,
        x: prev.x + dx,
        y: prev.y + dy,
      }));
    }

    // Tile hover calculation
    const gridPos = screenToGrid(e.clientX, e.clientY, camera.x, camera.y, camera.zoom);
    if (isTileInMap(gridPos.gx, gridPos.gy)) {
      setHoveredGrid(gridPos);
    } else {
      setHoveredGrid(null);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      // If minimal drag distance, treat as click!
      if (dragDistanceRef.current < 6) {
        const gridPos = screenToGrid(e.clientX, e.clientY, camera.x, camera.y, camera.zoom);
        handleTileAction(gridPos.gx, gridPos.gy);
      }
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    setCamera((prev) => ({
      ...prev,
      zoom: Math.min(2.5, Math.max(0.45, prev.zoom * zoomFactor)),
    }));
  };

  // Touch Handlers for Mobile & Tablet
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      isDraggingRef.current = true;
      lastMousePosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      dragDistanceRef.current = 0;
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      lastPinchDistRef.current = dist;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDraggingRef.current) {
      const dx = e.touches[0].clientX - lastMousePosRef.current.x;
      const dy = e.touches[0].clientY - lastMousePosRef.current.y;
      dragDistanceRef.current += Math.hypot(dx, dy);
      lastMousePosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };

      setCamera((prev) => ({
        ...prev,
        x: prev.x + dx,
        y: prev.y + dy,
      }));

      const gridPos = screenToGrid(e.touches[0].clientX, e.touches[0].clientY, camera.x, camera.y, camera.zoom);
      if (isTileInMap(gridPos.gx, gridPos.gy)) {
        setHoveredGrid(gridPos);
      }
    } else if (e.touches.length === 2 && lastPinchDistRef.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = dist / lastPinchDistRef.current;
      lastPinchDistRef.current = dist;
      setCamera((prev) => ({
        ...prev,
        zoom: Math.min(2.5, Math.max(0.45, prev.zoom * factor)),
      }));
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      if (dragDistanceRef.current < 8 && e.changedTouches.length === 1) {
        const touch = e.changedTouches[0];
        const gridPos = screenToGrid(touch.clientX, touch.clientY, camera.x, camera.y, camera.zoom);
        handleTileAction(gridPos.gx, gridPos.gy);
      }
    }
    lastPinchDistRef.current = null;
  };

  // Claim Mission Reward
  const handleClaimReward = (missionId: string) => {
    const mission = missions.find((m) => m.id === missionId);
    if (!mission || mission.claimed) return;

    mission.claimed = true;
    setStats((prev) => ({
      ...prev,
      money: prev.money + mission.rewardMoney,
      happiness: Math.min(100, prev.happiness + mission.rewardHappinessBonus),
    }));
    setMissions([...missions]);
  };

  // Confirm Unlock Territory Sector
  const handleConfirmUnlockSector = (sector: LandSector) => {
    if (stats.money < sector.cost) return;

    setStats((prev) => ({ ...prev, money: prev.money - sector.cost }));
    sector.unlocked = true;
    setSectors([...sectors]);
  };

  // Reset City to scratch
  const handleResetCity = () => {
    clearSavedCity();
    const init = createInitialMap();
    setGrid(init.grid);
    setSectors(init.sectors);
    setBuildings([]);
    setStats(createInitialStats());
    setMissions(INITIAL_MISSIONS.map((m) => ({ ...m, completed: false, claimed: false })));
    setDayCount(1);
    setDayTime(9.0);
    simRef.current = new SimulationEngine(1, 9.0);
    setCamera({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2 - 120,
      zoom: 1.0,
    });
  };

  // Export City to JSON
  const handleExportCity = () => {
    const data = {
      version: 1,
      cityName,
      dayCount,
      dayTime,
      stats,
      sectors,
      buildings,
      missions,
      grid,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cityName.toLowerCase().replace(/\s+/g, '_')}_city_save.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import City from JSON
  const handleImportCity = (jsonStr: string): boolean => {
    try {
      const data = JSON.parse(jsonStr);
      if (!data.grid || !data.stats) return false;

      setCityName(data.cityName || 'Metro City');
      setGrid(data.grid);
      setSectors(data.sectors);
      setBuildings(data.buildings || []);
      setStats(data.stats);
      setMissions(data.missions || INITIAL_MISSIONS);
      setDayCount(data.dayCount || 1);
      setDayTime(data.dayTime || 9.0);
      simRef.current = new SimulationEngine(data.dayCount || 1, data.dayTime || 9.0);
      audio.playMissionComplete();
      return true;
    } catch {
      return false;
    }
  };

  const unclaimedMissionsCount = missions.filter((m) => m.completed && !m.claimed).length;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 select-none touch-none">
      {/* Interactive Isometric Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onContextMenu={(e) => e.preventDefault()}
        className="w-full h-full cursor-crosshair block"
      />

      {/* Top Header Bar */}
      <HeaderBar
        cityName={cityName}
        onUpdateCityName={setCityName}
        dayCount={dayCount}
        dayTime={dayTime}
        gameSpeed={gameSpeed}
        onSetGameSpeed={setGameSpeed}
        stats={stats}
        soundEnabled={soundEnabled}
        onToggleSound={() => {
          const next = !soundEnabled;
          setSoundEnabled(next);
          audio.enabled = next;
        }}
        onOpenMissions={() => setShowMissionsModal(true)}
        onOpenStats={() => setShowStatsModal(true)}
        onOpenSettings={() => setShowSettingsModal(true)}
        unclaimedMissionsCount={unclaimedMissionsCount}
        activeEvents={activeEvents}
      />

      {/* Random Event Alert Banner */}
      <EventNotification events={activeEvents} />

      {/* Camera Navigation Controls */}
      <CameraControls
        onZoomIn={() => setCamera((c) => ({ ...c, zoom: Math.min(2.5, c.zoom * 1.2) }))}
        onZoomOut={() => setCamera((c) => ({ ...c, zoom: Math.max(0.45, c.zoom * 0.83) }))}
        onResetCamera={() =>
          setCamera({
            x: window.innerWidth / 2,
            y: window.innerHeight / 2 - 120,
            zoom: 1.0,
          })
        }
        zoom={camera.zoom}
      />

      {/* Inspector Panel */}
      <InspectorPanel
        tile={selectedTile}
        building={selectedBuilding}
        onClose={() => {
          setSelectedTile(null);
          setSelectedBuilding(null);
        }}
        onDemolish={() => {
          if (selectedTile) demolishAt(selectedTile.x, selectedTile.y);
        }}
      />

      {/* Bottom Construction Toolbar */}
      <BottomToolbar
        activeTool={activeTool}
        onSelectTool={setActiveTool}
        currentMoney={stats.money}
        currentPopulation={stats.population}
        constructionDiscount={activeEvents.some((e) => e.effects.constructionDiscount) ? 0.3 : 0}
      />

      {/* Missions Modal */}
      {showMissionsModal && (
        <MissionsModal
          missions={missions}
          stats={stats}
          buildings={buildings}
          grid={grid}
          onClaimReward={handleClaimReward}
          onClose={() => setShowMissionsModal(false)}
        />
      )}

      {/* City Stats / Ledger Modal */}
      {showStatsModal && (
        <StatsModal
          stats={stats}
          buildings={buildings}
          onClose={() => setShowStatsModal(false)}
        />
      )}

      {/* Settings & Save System Modal */}
      {showSettingsModal && (
        <SettingsModal
          onManualSave={() =>
            saveCityToStorage({
              version: 1,
              cityName,
              dayCount,
              dayTime,
              stats,
              sectors,
              buildings,
              missions,
              grid,
            })
          }
          onExportCity={handleExportCity}
          onImportCity={handleImportCity}
          onResetCity={handleResetCity}
          soundEnabled={soundEnabled}
          onToggleSound={() => {
            const next = !soundEnabled;
            setSoundEnabled(next);
            audio.enabled = next;
          }}
          onClose={() => setShowSettingsModal(false)}
        />
      )}

      {/* Territory Expansion Modal */}
      {selectedSectorToUnlock && (
        <ExpansionModal
          sector={selectedSectorToUnlock}
          currentMoney={stats.money}
          onConfirmUnlock={handleConfirmUnlockSector}
          onClose={() => setSelectedSectorToUnlock(null)}
        />
      )}
    </div>
  );
}
