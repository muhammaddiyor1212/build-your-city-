import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { Award, CheckCircle2, Gift, X } from 'lucide-react';
import { CityStats, Mission, PlacedBuilding, Tile } from '../types';
import { audio } from '../utils/audio';
import { MAP_SIZE } from '../engine/isometric';

interface MissionsModalProps {
  missions: Mission[];
  stats: CityStats;
  buildings: PlacedBuilding[];
  grid: Tile[][];
  onClaimReward: (missionId: string) => void;
  onClose: () => void;
}

export const MissionsModal: React.FC<MissionsModalProps> = ({
  missions,
  stats,
  buildings,
  grid,
  onClaimReward,
  onClose,
}) => {
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  // Helper to compute live progress for a mission
  const getMissionProgress = (m: Mission): { current: number; max: number; pct: number } => {
    let current = 0;
    switch (m.targetType) {
      case 'population':
        current = stats.population;
        break;
      case 'money':
        current = stats.money;
        break;
      case 'happiness':
        current = stats.happiness;
        break;
      case 'power':
        current = stats.powerCapacity;
        break;
      case 'water':
        current = stats.waterCapacity;
        break;
      case 'road_count': {
        let roads = 0;
        for (let y = 0; y < MAP_SIZE; y++) {
          for (let x = 0; x < MAP_SIZE; x++) {
            if (grid[y]?.[x]?.road) roads++;
          }
        }
        current = roads;
        break;
      }
      case 'building_count':
        if (m.targetBuildingId) {
          current = buildings.filter((b) => b.defId === m.targetBuildingId).length;
        }
        break;
    }

    const max = m.targetValue;
    const pct = Math.min(100, Math.round((current / max) * 100));
    return { current, max, pct };
  };

  const handleClaim = (m: Mission) => {
    audio.playCoin();
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // Ignore
    }
    onClaimReward(m.id);
  };

  const filteredMissions = missions.filter((m) => {
    if (filter === 'active') return !m.claimed;
    if (filter === 'completed') return m.claimed;
    return true;
  });

  const unclaimedCount = missions.filter((m) => m.completed && !m.claimed).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="text-amber-400" size={24} />
            <div>
              <h2 className="text-base font-bold text-white">City Milestones & Missions</h2>
              <p className="text-xs text-slate-400">
                Complete civic goals to earn treasury grants and citizen happiness!
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              audio.playClick();
              onClose();
            }}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="px-4 py-2 bg-slate-950/60 border-b border-slate-800 flex items-center gap-2 text-xs">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
              filter === 'all'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            All ({missions.length})
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-3 py-1 rounded-lg font-semibold transition-colors flex items-center gap-1 ${
              filter === 'active'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span>In Progress</span>
            {unclaimedCount > 0 && (
              <span className="bg-amber-500 text-slate-950 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {unclaimedCount} ready
              </span>
            )}
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
              filter === 'completed'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Claimed ({missions.filter((m) => m.claimed).length})
          </button>
        </div>

        {/* Mission List */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1 scrollbar-thin">
          {filteredMissions.map((m) => {
            const prog = getMissionProgress(m);
            const isReadyToClaim = m.completed && !m.claimed;

            return (
              <div
                key={m.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  m.claimed
                    ? 'bg-slate-800/30 border-slate-800 opacity-60'
                    : isReadyToClaim
                    ? 'bg-gradient-to-r from-amber-950/40 to-emerald-950/40 border-amber-500/80 shadow-lg'
                    : 'bg-slate-800/70 border-slate-700/80'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-start gap-2.5">
                    <span className="text-2xl mt-0.5">{m.icon}</span>
                    <div>
                      <h4 className="font-bold text-sm text-white flex items-center gap-2">
                        <span>{m.title}</span>
                        {m.claimed && (
                          <span className="text-[10px] bg-slate-700 text-emerald-400 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 size={10} /> Completed
                          </span>
                        )}
                      </h4>
                      <p className="text-xs text-slate-300 mt-0.5">{m.description}</p>
                    </div>
                  </div>

                  {/* Reward Tags */}
                  <div className="text-right shrink-0">
                    <div className="text-xs font-mono font-bold text-amber-300">
                      +${m.rewardMoney.toLocaleString()}
                    </div>
                    {m.rewardHappinessBonus > 0 && (
                      <div className="text-[10px] text-emerald-400 font-semibold">
                        +{m.rewardHappinessBonus}% Bliss
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                {!m.claimed && (
                  <div className="mt-3">
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>Progress:</span>
                      <span className="font-mono">
                        {prog.current.toLocaleString()} / {prog.max.toLocaleString()} ({prog.pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isReadyToClaim ? 'bg-amber-400' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${prog.pct}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Claim Button */}
                {isReadyToClaim && (
                  <button
                    onClick={() => handleClaim(m)}
                    className="mt-3 w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 font-black py-2 px-4 rounded-xl shadow-lg transition-all cursor-pointer text-xs uppercase tracking-wider animate-bounce"
                  >
                    <Gift size={14} />
                    <span>Claim ${m.rewardMoney.toLocaleString()} Grant!</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
