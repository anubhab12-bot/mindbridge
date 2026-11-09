import React from 'react';

const COLOR_MAP = {
  rose: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  purple: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
  amber: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  sky: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
  teal: 'bg-teal-500/10 text-teal-400 border-teal-500/30',
  slate: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
};

export default function Badge({ children, color = 'indigo', className = '', dot = false }) {
  const styles = COLOR_MAP[color] || COLOR_MAP.indigo;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles} ${className}`}>
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${color === 'emerald' ? 'bg-emerald-400' : color === 'rose' ? 'bg-rose-400' : color === 'amber' ? 'bg-amber-400' : 'bg-indigo-400'}`} />
      )}
      {children}
    </span>
  );
}
