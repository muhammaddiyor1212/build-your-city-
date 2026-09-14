import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Download,
  FileText,
  RotateCcw,
  Save,
  Settings,
  Upload,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { audio } from '../utils/audio';

interface SettingsModalProps {
  onManualSave: () => boolean;
  onExportCity: () => void;
  onImportCity: (jsonString: string) => boolean;
  onResetCity: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  onManualSave,
  onExportCity,
  onImportCity,
  onResetCity,
  soundEnabled,
  onToggleSound,
  onClose,
}) => {
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSave = () => {
    audio.playClick();
    const ok = onManualSave();
    if (ok) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = onImportCity(content);
        if (success) {
          onClose();
        } else {
          alert('Failed to import city save file: invalid format.');
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-md w-full shadow-2xl p-5 text-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Settings className="text-slate-300" size={22} />
            <h3 className="font-bold text-sm text-white">Game Settings & Save System</h3>
          </div>
          <button
            onClick={() => {
              audio.playClick();
              onClose();
            }}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 text-xs text-slate-300">
          {/* Controls Help */}
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/80 space-y-1.5">
            <h4 className="font-bold text-slate-200 text-xs">🎮 Camera & Builder Controls</h4>
            <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-400">
              <div>• Drag / Swipe: Pan camera</div>
              <div>• Mouse Wheel / Buttons: Zoom</div>
              <div>• Left Click: Place / Inspect</div>
              <div>• Escape / Right Click: Deselect</div>
            </div>
          </div>

          {/* Sound & Audio */}
          <div className="flex items-center justify-between bg-slate-800/60 p-3 rounded-xl border border-slate-700/80">
            <div>
              <div className="font-semibold text-white">Game Sound Effects</div>
              <div className="text-[11px] text-slate-400">Web Audio synthesized effects</div>
            </div>
            <button
              onClick={() => {
                onToggleSound();
                audio.playClick();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-colors ${
                soundEnabled
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-700 text-slate-400'
              }`}
            >
              {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
              <span>{soundEnabled ? 'Enabled' : 'Muted'}</span>
            </button>
          </div>

          {/* Save & Load Section */}
          <div className="space-y-2">
            <div className="font-semibold text-slate-200">City Persistence (Auto-saves to browser)</div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleSave}
                className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-3 rounded-xl transition-all cursor-pointer shadow"
              >
                {saveSuccess ? <Check size={14} /> : <Save size={14} />}
                <span>{saveSuccess ? 'Saved!' : 'Save City Now'}</span>
              </button>

              <button
                onClick={onExportCity}
                className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2.5 px-3 rounded-xl border border-slate-700 transition-all cursor-pointer"
              >
                <Download size={14} />
                <span>Export File</span>
              </button>
            </div>

            {/* Import file input hidden */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2 px-3 rounded-xl border border-slate-700 transition-all cursor-pointer"
            >
              <Upload size={14} />
              <span>Import Saved City JSON</span>
            </button>
          </div>

          {/* Reset / New City */}
          <div className="pt-2 border-t border-slate-800">
            {showResetConfirm ? (
              <div className="bg-rose-950/40 border border-rose-800 p-3 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-rose-300 font-bold text-xs">
                  <AlertTriangle size={15} />
                  <span>Are you sure? All buildings and funds will be reset!</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-1.5 px-2 rounded-lg font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      audio.playDemolish();
                      onResetCity();
                      setShowResetConfirm(false);
                      onClose();
                    }}
                    className="flex-1 bg-rose-600 hover:bg-rose-500 text-white py-1.5 px-2 rounded-lg font-bold"
                  >
                    Yes, Reset City
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="w-full flex items-center justify-center gap-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 border border-rose-900/50 py-2 px-3 rounded-xl font-semibold transition-colors cursor-pointer"
              >
                <RotateCcw size={14} />
                <span>Start New City (Wipe & Reset)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
