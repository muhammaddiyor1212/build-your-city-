import React from 'react';
import { Compass, Maximize2, Minus, Plus } from 'lucide-react';
import { audio } from '../utils/audio';

interface CameraControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetCamera: () => void;
  zoom: number;
}

export const CameraControls: React.FC<CameraControlsProps> = ({
  onZoomIn,
  onZoomOut,
  onResetCamera,
  zoom,
}) => {
  return (
    <div className="fixed bottom-24 right-4 z-30 flex flex-col gap-1.5 pointer-events-auto">
      <button
        onClick={() => {
          audio.playClick();
          onZoomIn();
        }}
        title="Zoom In (+)"
        className="w-10 h-10 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-700/80 shadow-xl flex items-center justify-center transition-all cursor-pointer backdrop-blur-sm active:scale-95"
      >
        <Plus size={18} />
      </button>

      <div className="bg-slate-900/90 border border-slate-700/80 rounded-lg py-1 px-1 text-center font-mono text-[10px] text-slate-300 select-none shadow">
        {Math.round(zoom * 100)}%
      </div>

      <button
        onClick={() => {
          audio.playClick();
          onZoomOut();
        }}
        title="Zoom Out (-)"
        className="w-10 h-10 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-700/80 shadow-xl flex items-center justify-center transition-all cursor-pointer backdrop-blur-sm active:scale-95"
      >
        <Minus size={18} />
      </button>

      <button
        onClick={() => {
          audio.playClick();
          onResetCamera();
        }}
        title="Recenter City Center"
        className="w-10 h-10 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-emerald-400 border border-slate-700/80 shadow-xl flex items-center justify-center transition-all cursor-pointer backdrop-blur-sm active:scale-95"
      >
        <Compass size={18} />
      </button>
    </div>
  );
};
