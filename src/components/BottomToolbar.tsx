import React, { useState } from 'react';
import {
  ActiveTool,
  BuildingCategory,
  BuildingDef,
} from '../types';
import { BUILDINGS_CATALOG, ROAD_COSTS } from '../data/buildings';
import { audio } from '../utils/audio';
import { Lock, MousePointer, ShieldAlert, Trash2, Trees, Zap } from 'lucide-react';

interface BottomToolbarProps {
  activeTool: ActiveTool;
  onSelectTool: (tool: ActiveTool) => void;
  currentMoney: number;
  currentPopulation: number;
  constructionDiscount?: number;
}

const CATEGORIES: { id: BuildingCategory; label: string; icon: string }[] = [
  { id: 'roads', label: 'Roads', icon: '🛣️' },
  { id: 'residential', label: 'Residential', icon: '🏠' },
  { id: 'commercial', label: 'Commercial', icon: '🏬' },
  { id: 'industrial', label: 'Industry', icon: '🏭' },
  { id: 'services', label: 'Services', icon: '🏥' },
  { id: 'utilities', label: 'Utilities', icon: '⚡' },
  { id: 'parks', label: 'Parks', icon: '🌳' },
  { id: 'landmarks', label: 'Landmarks', icon: '✈️' },
];

export const BottomToolbar: React.FC<BottomToolbarProps> = ({
  activeTool,
  onSelectTool,
  currentMoney,
  currentPopulation,
  constructionDiscount = 0,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<BuildingCategory>('residential');
  const [hoveredItem, setHoveredItem] = useState<BuildingDef | null>(null);

  const getEffectiveCost = (cost: number) => {
    if (constructionDiscount > 0) {
      return Math.round(cost * (1 - constructionDiscount));
    }
    return cost;
  };

  // Filter items in active category
  const categoryBuildings = Object.values(BUILDINGS_CATALOG).filter(
    (b) => b.category === selectedCategory
  );

  return (
    <div className="fixed bottom-3 left-0 right-0 z-40 flex flex-col items-center pointer-events-none px-2">
      {/* Item Details Tooltip Card */}
      {hoveredItem && (
        <div className="pointer-events-auto mb-2 bg-slate-900/95 border border-slate-700/90 rounded-xl p-3 shadow-2xl text-white max-w-sm w-full backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{hoveredItem.icon}</span>
              <div>
                <h4 className="font-bold text-sm text-slate-100">{hoveredItem.name}</h4>
                <p className="text-[11px] text-slate-400">
                  Size: {hoveredItem.width}×{hoveredItem.height} tiles
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="font-bold text-emerald-400 font-mono text-sm">
                ${getEffectiveCost(hoveredItem.cost).toLocaleString()}
              </span>
              {constructionDiscount > 0 && (
                <span className="block text-[10px] text-amber-400 line-through">
                  ${hoveredItem.cost}
                </span>
              )}
            </div>
          </div>

          <p className="text-xs text-slate-300 mb-2">{hoveredItem.description}</p>

          <div className="grid grid-cols-3 gap-1 text-[11px] bg-slate-800/80 p-2 rounded-lg">
            <div>
              <span className="text-slate-400 block">Revenue:</span>
              <span className="text-emerald-400 font-semibold font-mono">
                +${hoveredItem.income}/d
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Upkeep:</span>
              <span className="text-rose-400 font-semibold font-mono">
                -${hoveredItem.maintenance}/d
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">
                {hoveredItem.population > 0 ? 'Residents:' : 'Jobs:'}
              </span>
              <span className="text-sky-400 font-semibold font-mono">
                {hoveredItem.population > 0 ? hoveredItem.population : hoveredItem.jobs}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Power:</span>
              <span className="text-amber-400 font-semibold font-mono">
                {hoveredItem.powerNeed < 0
                  ? `+${Math.abs(hoveredItem.powerNeed)} MW`
                  : `${hoveredItem.powerNeed} MW`}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Water:</span>
              <span className="text-cyan-400 font-semibold font-mono">
                {hoveredItem.waterNeed < 0
                  ? `+${Math.abs(hoveredItem.waterNeed)} m³`
                  : `${hoveredItem.waterNeed} m³`}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Pollution:</span>
              <span
                className={`font-semibold font-mono ${
                  hoveredItem.pollution > 0 ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {hoveredItem.pollution}
              </span>
            </div>
          </div>

          {currentPopulation < hoveredItem.unlockPopulation && (
            <div className="mt-2 text-rose-400 text-xs flex items-center gap-1 font-medium bg-rose-950/40 p-1.5 rounded border border-rose-800">
              <Lock size={12} />
              <span>Requires {hoveredItem.unlockPopulation} Population to unlock</span>
            </div>
          )}
        </div>
      )}

      {/* Main Dock Container */}
      <div className="pointer-events-auto bg-slate-900/90 border border-slate-700/80 rounded-2xl shadow-2xl p-2 max-w-4xl w-full backdrop-blur-md">
        {/* Top bar inside dock: Primary Tools (Select, Bulldoze, Expand) + Categories */}
        <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1.5 border-b border-slate-800 scrollbar-thin">
          {/* Quick Utility Tools */}
          <div className="flex items-center gap-1 pr-2 border-r border-slate-700 shrink-0">
            <button
              onClick={() => {
                audio.playClick();
                onSelectTool('inspect');
              }}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                activeTool === 'inspect'
                  ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
            >
              <MousePointer size={14} />
              <span className="hidden sm:inline">Select</span>
            </button>

            <button
              onClick={() => {
                audio.playClick();
                onSelectTool('bulldoze');
              }}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                activeTool === 'bulldoze'
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30 animate-pulse'
                  : 'bg-slate-800 hover:bg-slate-700 text-rose-300'
              }`}
            >
              <Trash2 size={14} />
              <span className="hidden sm:inline">Bulldoze</span>
            </button>

            <button
              onClick={() => {
                audio.playClick();
                onSelectTool('expand');
              }}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                activeTool === 'expand'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-amber-300'
              }`}
            >
              <span>🗺️</span>
              <span className="hidden sm:inline">Expand</span>
            </button>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 shrink-0">
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    audio.playClick();
                    setSelectedCategory(cat.id);
                  }}
                  className={`flex items-center gap-1 px-2.5 py-1.2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-slate-700 text-emerald-400 border border-emerald-500/50 shadow'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span className="hidden md:inline">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Tray: Available Items in Category */}
        <div className="flex items-center gap-2 pt-2 overflow-x-auto scrollbar-thin">
          {selectedCategory === 'roads' ? (
            // Road tools
            <>
              {Object.entries(ROAD_COSTS).map(([key, info]) => {
                const toolKey = `road_${key}` as ActiveTool;
                const isSelected = activeTool === toolKey;
                const cost = getEffectiveCost(info.cost);
                const canAfford = currentMoney >= cost;

                return (
                  <button
                    key={key}
                    onClick={() => {
                      audio.playClick();
                      onSelectTool(toolKey);
                    }}
                    disabled={!canAfford}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border text-left shrink-0 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg'
                        : canAfford
                        ? 'bg-slate-800/90 border-slate-700 text-slate-200 hover:border-slate-500 hover:bg-slate-800'
                        : 'bg-slate-800/40 border-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                    }`}
                  >
                    <span className="text-2xl">{info.icon}</span>
                    <div>
                      <div className="font-bold text-xs text-white">{info.label}</div>
                      <div className="font-mono text-emerald-400 text-[11px] font-semibold">
                        ${cost}
                      </div>
                    </div>
                  </button>
                );
              })}
            </>
          ) : (
            // Buildings in category
            categoryBuildings.map((b) => {
              const isSelected = activeTool === b.id;
              const cost = getEffectiveCost(b.cost);
              const isLocked = currentPopulation < b.unlockPopulation;
              const canAfford = currentMoney >= cost && !isLocked;

              return (
                <button
                  key={b.id}
                  onClick={() => {
                    if (isLocked) return;
                    audio.playClick();
                    onSelectTool(b.id);
                  }}
                  onMouseEnter={() => setHoveredItem(b)}
                  onMouseLeave={() => setHoveredItem(null)}
                  disabled={!canAfford}
                  className={`relative flex items-center gap-2 px-3 py-2 rounded-xl border text-left shrink-0 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg ring-2 ring-emerald-400'
                      : isLocked
                      ? 'bg-slate-800/40 border-slate-800/60 text-slate-500 cursor-not-allowed opacity-50'
                      : canAfford
                      ? 'bg-slate-800/90 border-slate-700 text-slate-200 hover:border-slate-500 hover:bg-slate-800'
                      : 'bg-slate-800/40 border-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                  }`}
                >
                  <span className="text-2xl">{b.icon}</span>
                  <div>
                    <div className="font-bold text-xs text-white flex items-center gap-1">
                      <span>{b.name}</span>
                      {isLocked && <Lock size={11} className="text-rose-400" />}
                    </div>
                    <div className="font-mono text-emerald-400 text-[11px] font-semibold">
                      ${cost.toLocaleString()}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
