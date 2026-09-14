import React from 'react';
import { AlertTriangle, Sparkles, Timer } from 'lucide-react';
import { CityEvent } from '../types';

interface EventNotificationProps {
  events: CityEvent[];
}

export const EventNotification: React.FC<EventNotificationProps> = ({ events }) => {
  if (events.length === 0) return null;

  return (
    <div className="fixed top-14 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2 max-w-lg w-full px-4 pointer-events-none">
      {events.map((ev) => {
        const isPositive = ev.type === 'positive';
        const isNegative = ev.type === 'negative';

        return (
          <div
            key={ev.id}
            className={`pointer-events-auto w-full p-3 rounded-2xl border shadow-2xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-3 flex items-start gap-3 ${
              isPositive
                ? 'bg-emerald-950/90 border-emerald-500/80 text-emerald-100 shadow-emerald-900/30'
                : isNegative
                ? 'bg-rose-950/90 border-rose-500/80 text-rose-100 shadow-rose-900/30'
                : 'bg-sky-950/90 border-sky-500/80 text-sky-100 shadow-sky-900/30'
            }`}
          >
            <span className="text-3xl shrink-0 mt-0.5">{ev.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-bold text-sm tracking-wide flex items-center gap-1.5">
                  {isPositive ? (
                    <Sparkles size={14} className="text-amber-400" />
                  ) : (
                    <AlertTriangle size={14} className="text-rose-400" />
                  )}
                  <span>{ev.title}</span>
                </h4>
                <span className="text-[11px] font-mono flex items-center gap-1 text-slate-300">
                  <Timer size={12} />
                  <span>{Math.ceil(ev.remainingSeconds)}s</span>
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">{ev.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
