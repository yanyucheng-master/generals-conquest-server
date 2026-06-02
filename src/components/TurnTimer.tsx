import { useEffect, useState } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

interface Props {
  remainingMs: number;
  totalMs: number;
  isRunning: boolean;
}

export default function TurnTimer({ remainingMs, totalMs, isRunning }: Props) {
  const [flash, setFlash] = useState(false);
  const pct = totalMs > 0 ? (remainingMs / totalMs) * 100 : 0;
  const seconds = Math.ceil(remainingMs / 1000);

  // 低于5秒时闪烁警告
  useEffect(() => {
    if (remainingMs <= 5000 && remainingMs > 0) {
      setFlash(true);
      const interval = setInterval(() => {
        setFlash(prev => !prev);
      }, 300);
      return () => clearInterval(interval);
    } else {
      setFlash(false);
    }
  }, [remainingMs]);

  if (!isRunning && remainingMs === totalMs) return null;

  const getColor = () => {
    if (pct > 60) return { bar: 'bg-emerald-500', text: 'text-emerald-400', border: 'border-emerald-700' };
    if (pct > 30) return { bar: 'bg-yellow-500', text: 'text-yellow-400', border: 'border-yellow-700' };
    return { bar: 'bg-red-500', text: 'text-red-400', border: 'border-red-700' };
  };

  const colors = getColor();

  return (
    <div className={`
      flex items-center gap-2 px-3 py-1 rounded border
      ${flash && remainingMs <= 5000 ? 'bg-red-900/40 ' + colors.border : 'bg-black/40 ' + colors.border}
      transition-colors duration-200
    `}>
      {remainingMs <= 5000 ? (
        <AlertTriangle className={`w-4 h-4 ${colors.text} ${flash ? 'animate-pulse' : ''}`} />
      ) : (
        <Clock className={`w-4 h-4 ${colors.text}`} />
      )}
      <div className="w-20 h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${colors.bar} transition-all duration-100`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-sm font-bold ${colors.text} ${flash ? 'animate-pulse' : ''}`}>
        {seconds}秒
      </span>
    </div>
  );
}
