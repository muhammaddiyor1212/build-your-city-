import React from 'react';
import { LandSector } from '../types';
import { audio } from '../utils/audio';
import { DollarSign, MapPin, Unlock, X } from 'lucide-react';

interface ExpansionModalProps {
  sector: LandSector;
  currentMoney: number;
  onConfirmUnlock: (sector: LandSector) => void;
  onClose: () => void;
}

export const ExpansionModal: React.FC<ExpansionModalProps> = ({
  sector,
  currentMoney,
  onConfirmUnlock,
  onClose,
}) => {
  const canAfford = currentMoney >= sector.cost;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-sm w-full shadow-2xl p-5 text-white">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🗺️</span>
            <div>
              <h3 className="font-bold text-sm text-white">Unlock Territory</h3>
              <p className="text-[11px] text-slate-400">
                Sector ({sector.sectorX + 1}, {sector.sectorY + 1})
              </p>
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

        <p className="text-xs text-slate-300 mb-4">
          Expanding your municipal boundaries grants 64 new land tiles (8×8 grid) for zoning
          residential suburbs, commercial centers, or industrial zones.
        </p>

        <div className="bg-slate-800/80 rounded-xl p-3 mb-4 border border-slate-700/80 space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Expansion Cost:</span>
            <span className="font-bold font-mono text-amber-400 text-sm">
              ${sector.cost.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Your Treasury:</span>
            <span
              className={`font-mono font-bold ${
                canAfford ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              ${currentMoney.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              audio.playClick();
              onClose();
            }}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2 px-3 rounded-xl transition-colors text-xs cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (!canAfford) return;
              audio.playBuild();
              onConfirmUnlock(sector);
              onClose();
            }}
            disabled={!canAfford}
            className={`flex-1 flex items-center justify-center gap-1.5 font-bold py-2 px-3 rounded-xl transition-all text-xs cursor-pointer ${
              canAfford
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Unlock size={14} />
            <span>Unlock Land</span>
          </button>
        </div>
      </div>
    </div>
  );
};
