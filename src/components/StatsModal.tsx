import React from 'react';
import {
  BarChart3,
  CheckCircle2,
  DollarSign,
  Droplets,
  Factory,
  Heart,
  TrendingDown,
  TrendingUp,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { CityStats, PlacedBuilding } from '../types';
import { BUILDINGS_CATALOG, ROAD_COSTS } from '../data/buildings';
import { audio } from '../utils/audio';

interface StatsModalProps {
  stats: CityStats;
  buildings: PlacedBuilding[];
  onClose: () => void;
}

export const StatsModal: React.FC<StatsModalProps> = ({ stats, buildings, onClose }) => {
  // Compute revenue breakdown
  let resIncome = 0;
  let comIncome = 0;
  let indIncome = 0;
  let landmarkIncome = 0;

  let serviceExpense = 0;
  let utilityExpense = 0;
  let parkExpense = 0;

  buildings.forEach((b) => {
    const def = BUILDINGS_CATALOG[b.defId];
    if (!def) return;
    const factor = (b.hasPower ? 0.6 : 0.2) + (b.hasWater ? 0.4 : 0.0);
    const inc = Math.round(def.income * factor);

    if (def.category === 'residential') resIncome += inc;
    else if (def.category === 'commercial') comIncome += inc;
    else if (def.category === 'industrial') indIncome += inc;
    else if (def.category === 'landmarks') landmarkIncome += inc;

    if (def.category === 'services') serviceExpense += def.maintenance;
    else if (def.category === 'utilities') utilityExpense += def.maintenance;
    else if (def.category === 'parks') parkExpense += def.maintenance;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="text-emerald-400" size={24} />
            <div>
              <h2 className="text-base font-bold text-white">City Ledger & Demographics</h2>
              <p className="text-xs text-slate-400">
                Detailed municipal financial balance sheet and demographic indicators.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              audio.playClick();
              onClose();
            }}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 scrollbar-thin text-xs text-slate-300">
          {/* Top Key Performance Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-800/70 p-3 rounded-xl border border-slate-700">
              <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                <DollarSign size={14} className="text-amber-400" />
                <span>Treasury</span>
              </div>
              <div className="text-lg font-bold font-mono text-amber-300">
                ${stats.money.toLocaleString()}
              </div>
              <div
                className={`text-[11px] font-mono flex items-center gap-1 mt-0.5 ${
                  stats.netPerDay >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {stats.netPerDay >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                <span>${stats.netPerDay}/day net</span>
              </div>
            </div>

            <div className="bg-slate-800/70 p-3 rounded-xl border border-slate-700">
              <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                <Users size={14} className="text-sky-400" />
                <span>Population</span>
              </div>
              <div className="text-lg font-bold font-mono text-white">
                {stats.population.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Capacity: {stats.maxPopulation.toLocaleString()}
              </div>
            </div>

            <div className="bg-slate-800/70 p-3 rounded-xl border border-slate-700">
              <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                <Heart size={14} className="text-rose-400" />
                <span>Happiness</span>
              </div>
              <div
                className={`text-lg font-bold font-mono ${
                  stats.happiness >= 75
                    ? 'text-emerald-400'
                    : stats.happiness >= 50
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                {stats.happiness}%
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {stats.happiness >= 75 ? 'Thriving' : stats.happiness >= 50 ? 'Moderate' : 'Unhappy'}
              </div>
            </div>

            <div className="bg-slate-800/70 p-3 rounded-xl border border-slate-700">
              <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                <Factory size={14} className="text-purple-400" />
                <span>Job Market</span>
              </div>
              <div className="text-lg font-bold font-mono text-purple-300">
                {stats.unemploymentRate}%
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Jobs: {stats.filledJobs} / {stats.totalJobs}
              </div>
            </div>
          </div>

          {/* Financial Ledger Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Daily Income */}
            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/80">
              <h3 className="font-bold text-sm text-emerald-400 mb-3 flex items-center justify-between">
                <span>Daily Municipal Revenue</span>
                <span className="font-mono text-base">+${stats.incomePerDay}/d</span>
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Residential Property Tax</span>
                  <span className="font-mono text-slate-200">+${resIncome}</span>
                </div>
                <div className="flex justify-between">
                  <span>Commercial & Retail Tax</span>
                  <span className="font-mono text-slate-200">+${comIncome}</span>
                </div>
                <div className="flex justify-between">
                  <span>Industrial & Production Tax</span>
                  <span className="font-mono text-slate-200">+${indIncome}</span>
                </div>
                <div className="flex justify-between">
                  <span>Landmarks & Transit Hubs</span>
                  <span className="font-mono text-slate-200">+${landmarkIncome}</span>
                </div>
              </div>
            </div>

            {/* Daily Expenses */}
            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/80">
              <h3 className="font-bold text-sm text-rose-400 mb-3 flex items-center justify-between">
                <span>Daily Municipal Expenses</span>
                <span className="font-mono text-base">-${stats.expensesPerDay}/d</span>
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Public Services (Police, Hospital, Fire)</span>
                  <span className="font-mono text-slate-200">-${serviceExpense}</span>
                </div>
                <div className="flex justify-between">
                  <span>Utilities (Power & Water plants)</span>
                  <span className="font-mono text-slate-200">-${utilityExpense}</span>
                </div>
                <div className="flex justify-between">
                  <span>Parks & Recreation Maintenance</span>
                  <span className="font-mono text-slate-200">-${parkExpense}</span>
                </div>
                <div className="flex justify-between">
                  <span>Road & Infrastructure Upkeep</span>
                  <span className="font-mono text-slate-200">
                    -${stats.expensesPerDay - (serviceExpense + utilityExpense + parkExpense)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Infrastructure Health */}
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/80 space-y-3">
            <h3 className="font-bold text-sm text-sky-400">Utilities & Environment Capacity</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="flex items-center gap-1">
                    <Zap size={13} className="text-amber-400" />
                    <span>Electricity Grid:</span>
                  </span>
                  <span className="font-mono">
                    {stats.powerConsumed} / {stats.powerCapacity} MW
                  </span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div
                    className={`h-full ${
                      stats.powerConsumed > stats.powerCapacity ? 'bg-rose-500' : 'bg-amber-400'
                    }`}
                    style={{
                      width: `${
                        stats.powerCapacity > 0
                          ? Math.min(100, (stats.powerConsumed / stats.powerCapacity) * 100)
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="flex items-center gap-1">
                    <Droplets size={13} className="text-cyan-400" />
                    <span>Water Network:</span>
                  </span>
                  <span className="font-mono">
                    {stats.waterConsumed} / {stats.waterCapacity} m³
                  </span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div
                    className={`h-full ${
                      stats.waterConsumed > stats.waterCapacity ? 'bg-rose-500' : 'bg-cyan-400'
                    }`}
                    style={{
                      width: `${
                        stats.waterCapacity > 0
                          ? Math.min(100, (stats.waterConsumed / stats.waterCapacity) * 100)
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
