import React, { useState } from 'react';
import {
  Award,
  BarChart3,
  Check,
  Edit2,
  FastForward,
  Flame,
  Moon,
  Pause,
  Play,
  RotateCcw,
  Settings,
  Sun,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { CityEvent, CityStats } from '../types';
import { audio } from '../utils/audio';

interface HeaderBarProps {
  cityName: string;
  onUpdateCityName: (name: string) => void;
  dayCount: number;
  dayTime: number; // 0 to 24
  gameSpeed: number;
  onSetGameSpeed: (speed: number) => void;
  stats: CityStats;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenMissions: () => void;
  onOpenStats: () => void;
  onOpenSettings: () => void;
  unclaimedMissionsCount: number;
  activeEvents: CityEvent[];
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  cityName,
  onUpdateCityName,
  dayCount,
  dayTime,
  gameSpeed,
  onSetGameSpeed,
  stats,
  soundEnabled,
  onToggleSound,
  onOpenMissions,
  onOpenStats,
  onOpenSettings,
  unclaimedMissionsCount,
  activeEvents,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(cityName);

  const formatHours = (h: number) => {
    const hours = Math.floor(h);
    const minutes = Math.floor((h - hours) * 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const isNight = dayTime < 6 || dayTime >= 20;

  const handleSaveName = () => {
    if (tempName.trim()) {
      onUpdateCityName(tempName.trim());
    }
    setIsEditingName(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-700/80 text-white shadow-xl px-3 py-2">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        {/* Left: City Name & Time / Speed */}
        <div className="flex items-center gap-3">
          {/* City Name */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
            <span className="text-emerald-400 font-bold text-sm">🏙️</span>
            {isEditingName ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                  className="bg-slate-700 text-white text-xs font-semibold px-2 py-0.5 rounded outline-none w-28 border border-emerald-500"
                  autoFocus
                />
                <button
                  onClick={handleSaveName}
                  className="text-emerald-400 hover:text-emerald-300 p-0.5"
                >
                  <Check size={14} />
                </button>
              </div>
            ) : (
              <div
                onClick={() => {
                  setTempName(cityName);
                  setIsEditingName(true);
                }}
                className="flex items-center gap-1 cursor-pointer group"
                title="Click to rename city"
              >
                <span className="font-bold text-sm text-slate-100 tracking-wide group-hover:text-emerald-300 transition-colors">
                  {cityName}
                </span>
                <Edit2 size={12} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            )}
          </div>

          {/* Time & Day Clock */}
          <div className="flex items-center gap-2 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700 text-xs">
            <span className="flex items-center gap-1 font-medium text-slate-300">
              {isNight ? <Moon size={14} className="text-indigo-400" /> : <Sun size={14} className="text-amber-400" />}
              <span>Day {dayCount}</span>
            </span>
            <span className="font-mono text-amber-300 font-semibold">{formatHours(dayTime)}</span>
          </div>

          {/* Speed Controls */}
          <div className="flex items-center bg-slate-800/80 p-0.5 rounded-lg border border-slate-700">
            <button
              onClick={() => {
                audio.playClick();
                onSetGameSpeed(0);
              }}
              title="Pause"
              className={`p-1.5 rounded transition-colors ${
                gameSpeed === 0 ? 'bg-amber-500 text-slate-900 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Pause size={13} />
            </button>
            <button
              onClick={() => {
                audio.playClick();
                onSetGameSpeed(1);
              }}
              title="Normal Speed (1x)"
              className={`p-1.5 rounded transition-colors ${
                gameSpeed === 1 ? 'bg-emerald-500 text-slate-900 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Play size={13} />
            </button>
            <button
              onClick={() => {
                audio.playClick();
                onSetGameSpeed(2);
              }}
              title="Fast Speed (2x)"
              className={`p-1.5 rounded transition-colors ${
                gameSpeed === 2 ? 'bg-emerald-500 text-slate-900 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <FastForward size={13} />
            </button>
            <button
              onClick={() => {
                audio.playClick();
                onSetGameSpeed(5);
              }}
              title="Ultra Speed (5x)"
              className={`p-1.5 rounded transition-colors ${
                gameSpeed === 5 ? 'bg-emerald-500 text-slate-900 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Zap size={13} />
            </button>
          </div>
        </div>

        {/* Center: Essential City Metrics */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium">
          {/* Money & Net */}
          <div className="flex items-center gap-1.5 bg-slate-800/90 px-2.5 py-1 rounded-lg border border-slate-700">
            <span className="text-amber-400 font-bold">💰</span>
            <span className="font-bold text-amber-300 font-mono text-sm">
              ${stats.money.toLocaleString()}
            </span>
            <span
              className={`text-[11px] font-mono ${
                stats.netPerDay >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
              title="Net income per game day"
            >
              ({stats.netPerDay >= 0 ? '+' : ''}${stats.netPerDay}/d)
            </span>
          </div>

          {/* Population */}
          <div className="flex items-center gap-1.5 bg-slate-800/90 px-2.5 py-1 rounded-lg border border-slate-700">
            <span className="text-sky-400">👥</span>
            <span className="font-bold text-white font-mono">{stats.population}</span>
            <span className="text-slate-400 text-[11px]">/ {stats.maxPopulation}</span>
          </div>

          {/* Happiness */}
          <div className="flex items-center gap-1.5 bg-slate-800/90 px-2.5 py-1 rounded-lg border border-slate-700">
            <span>
              {stats.happiness >= 75 ? '😄' : stats.happiness >= 50 ? '🙂' : '😟'}
            </span>
            <span
              className={`font-bold font-mono ${
                stats.happiness >= 75
                  ? 'text-emerald-400'
                  : stats.happiness >= 50
                  ? 'text-yellow-400'
                  : 'text-rose-400'
              }`}
            >
              {stats.happiness}%
            </span>
          </div>

          {/* Electricity */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] ${
              stats.powerConsumed > stats.powerCapacity && stats.powerConsumed > 0
                ? 'bg-rose-950/80 border-rose-500 text-rose-300 animate-pulse'
                : 'bg-slate-800/90 border-slate-700 text-slate-300'
            }`}
            title="Electricity Consumed / Generated"
          >
            <span className="text-amber-400 font-bold">⚡</span>
            <span className="font-mono">
              {stats.powerConsumed}/{stats.powerCapacity} MW
            </span>
          </div>

          {/* Water */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] ${
              stats.waterConsumed > stats.waterCapacity && stats.waterConsumed > 0
                ? 'bg-rose-950/80 border-rose-500 text-rose-300 animate-pulse'
                : 'bg-slate-800/90 border-slate-700 text-slate-300'
            }`}
            title="Water Consumed / Produced"
          >
            <span className="text-sky-400 font-bold">💧</span>
            <span className="font-mono">
              {stats.waterConsumed}/{stats.waterCapacity} m³
            </span>
          </div>

          {/* Traffic */}
          <div
            className="hidden sm:flex items-center gap-1 bg-slate-800/90 px-2 py-1 rounded-lg border border-slate-700 text-[11px]"
            title="Road Traffic Density"
          >
            <span>🚗</span>
            <span className="font-mono text-slate-300">{stats.trafficLoad}%</span>
          </div>

          {/* Pollution */}
          <div
            className="hidden md:flex items-center gap-1 bg-slate-800/90 px-2 py-1 rounded-lg border border-slate-700 text-[11px]"
            title="Smog & Industrial Pollution"
          >
            <span>🏭</span>
            <span className="font-mono text-slate-300">{stats.pollutionLevel}%</span>
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Missions Button */}
          <button
            onClick={() => {
              audio.playClick();
              onOpenMissions();
            }}
            className="relative flex items-center gap-1.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-900 font-bold px-3 py-1 rounded-lg shadow transition-all cursor-pointer text-xs"
          >
            <Award size={14} />
            <span className="hidden sm:inline">Missions</span>
            {unclaimedMissionsCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-bounce shadow">
                {unclaimedMissionsCount}
              </span>
            )}
          </button>

          {/* Analytics Button */}
          <button
            onClick={() => {
              audio.playClick();
              onOpenStats();
            }}
            title="City Budget & Analytics"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
          >
            <BarChart3 size={15} />
          </button>

          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            title={soundEnabled ? 'Mute Sound' : 'Enable Sound'}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
          >
            {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} className="text-rose-400" />}
          </button>

          {/* Settings / Save */}
          <button
            onClick={() => {
              audio.playClick();
              onOpenSettings();
            }}
            title="Settings, Save & Reset"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
          >
            <Settings size={15} />
          </button>
        </div>
      </div>
    </header>
  );
};
