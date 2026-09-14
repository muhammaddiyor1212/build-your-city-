import React from 'react';
import { PlacedBuilding, Tile } from '../types';
import { BUILDINGS_CATALOG, ROAD_COSTS } from '../data/buildings';
import { audio } from '../utils/audio';
import { AlertCircle, CheckCircle2, DollarSign, Power, Trash2, X, Zap } from 'lucide-react';

interface InspectorPanelProps {
  tile: Tile | null;
  building: PlacedBuilding | null;
  onClose: () => void;
  onDemolish: () => void;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  tile,
  building,
  onClose,
  onDemolish,
}) => {
  if (!tile) return null;

  const def = building ? BUILDINGS_CATALOG[building.defId] : null;

  return (
    <div className="fixed top-16 right-4 z-40 bg-slate-900/95 border border-slate-700/90 rounded-2xl shadow-2xl p-4 text-white w-80 backdrop-blur-md animate-in fade-in slide-in-from-right-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{def ? def.icon : tile.road ? '🛣️' : '🌱'}</span>
          <div>
            <h3 className="font-bold text-sm text-slate-100">
              {def ? def.name : tile.road ? 'City Road' : 'Land Parcel'}
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">
              Coordinates: ({tile.x}, {tile.y})
            </span>
          </div>
        </div>
        <button
          onClick={() => {
            audio.playClick();
            onClose();
          }}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Building Details */}
      {def && building ? (
        <div className="space-y-3">
          <p className="text-xs text-slate-300">{def.description}</p>

          {/* Service Status */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div
              className={`p-2 rounded-lg border flex items-center gap-1.5 ${
                building.hasPower
                  ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-800 text-rose-300'
              }`}
            >
              {building.hasPower ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
              <span>{building.hasPower ? 'Powered' : 'No Power'}</span>
            </div>

            <div
              className={`p-2 rounded-lg border flex items-center gap-1.5 ${
                building.hasWater
                  ? 'bg-sky-950/40 border-sky-800/80 text-sky-300'
                  : 'bg-rose-950/40 border-rose-800 text-rose-300'
              }`}
            >
              {building.hasWater ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
              <span>{building.hasWater ? 'Watered' : 'No Water'}</span>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="bg-slate-800/70 rounded-xl p-3 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Footprint:</span>
              <span className="font-semibold text-slate-200">
                {def.width} × {def.height} tiles
              </span>
            </div>

            {def.population > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-400">Residents:</span>
                <span className="font-semibold text-sky-400">
                  {building.currentResidents || def.population} / {def.population}
                </span>
              </div>
            )}

            {def.jobs > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-400">Workers:</span>
                <span className="font-semibold text-amber-400">
                  {building.currentWorkers || def.jobs} / {def.jobs}
                </span>
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-slate-400">Daily Tax Revenue:</span>
              <span className="font-semibold font-mono text-emerald-400">
                +${def.income}/day
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-400">Maintenance Cost:</span>
              <span className="font-semibold font-mono text-rose-400">
                -${def.maintenance}/day
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-400">Happiness Rating:</span>
              <span className="font-semibold text-emerald-400">
                {def.happinessBonus >= 0 ? `+${def.happinessBonus}` : def.happinessBonus}%
              </span>
            </div>
          </div>

          {/* Demolish Action */}
          <button
            onClick={() => {
              onDemolish();
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 font-bold py-2 px-3 rounded-xl transition-all cursor-pointer text-xs"
          >
            <Trash2 size={14} />
            <span>Demolish Structure</span>
          </button>
        </div>
      ) : tile.road ? (
        // Road Details
        <div className="space-y-3">
          <div className="bg-slate-800/70 rounded-xl p-3 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Type:</span>
              <span className="font-semibold text-slate-200 capitalize">
                {tile.road.type} Road {tile.road.isBridge ? '(Bridge)' : ''}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Maintenance:</span>
              <span className="font-semibold font-mono text-rose-400">
                -${ROAD_COSTS[tile.road.type]?.maintenance || 1}/day
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              onDemolish();
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 font-bold py-2 px-3 rounded-xl transition-all cursor-pointer text-xs"
          >
            <Trash2 size={14} />
            <span>Demolish Road</span>
          </button>
        </div>
      ) : (
        // Empty Land Details
        <div className="space-y-3 text-xs">
          <div className="bg-slate-800/70 rounded-xl p-3 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-400">Terrain:</span>
              <span className="font-semibold capitalize text-slate-200">{tile.terrain}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Status:</span>
              <span className="font-semibold text-emerald-400">Available for Construction</span>
            </div>
          </div>

          {tile.terrain === 'trees' && (
            <button
              onClick={() => {
                onDemolish();
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 font-bold py-2 px-3 rounded-xl transition-all cursor-pointer text-xs"
            >
              <Trash2 size={14} />
              <span>Clear Trees ($10)</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
