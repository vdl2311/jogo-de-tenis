import React from 'react';
import { TennisScore } from '../types';
import { Flame, Gauge } from 'lucide-react';

interface ScoreBoardProps {
  score: TennisScore;
  ballSpeed: number;
  rallyCount: number;
  commentary: string;
}

export const ScoreBoard: React.FC<ScoreBoardProps> = ({
  score,
  ballSpeed,
  rallyCount,
  commentary
}) => {
  // Format tennis points display
  const formatPoint = (pts: number, playerType: 'player' | 'opponent') => {
    if (score.advantage) {
      return score.advantage === playerType ? 'AD' : '–';
    }
    if (score.isDeuce) {
      return '40';
    }
    const tennisPts = ['0', '15', '30', '40'];
    return tennisPts[Math.min(3, pts)];
  };

  return (
    <div className="absolute top-4 left-6 right-6 flex flex-col md:flex-row justify-between items-start md:items-center pointer-events-none gap-3 z-20">
      {/* Broadcast Style TV Scoreboard Card */}
      <div className="bg-slate-900/90 border-2 border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden min-w-[340px] md:min-w-[420px]">
        {/* Tournament Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-600 to-emerald-600 px-4 py-1.5 flex justify-between items-center text-xs tracking-wider uppercase font-display font-bold text-white shadow-inner">
          <span>Grand Slam Motion TV</span>
          <span className="text-yellow-300 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span> AO VIVO
          </span>
        </div>

        {/* Players & Scores Grid */}
        <div className="p-3 text-slate-100 font-display">
          {/* Player Row (VOCÊ) */}
          <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <span className={`w-3.5 h-3.5 rounded-full ${score.server === 'player' ? 'bg-yellow-400 shadow-[0_0_8px_#facc15]' : 'bg-transparent'}`}></span>
              <span className="text-lg md:text-xl font-bold tracking-wide text-white">
                VOCÊ <span className="text-xs text-emerald-400 font-medium px-2 py-0.5 bg-emerald-950/60 rounded border border-emerald-500/40 ml-1">CÂMERA</span>
              </span>
            </div>
            <div className="flex items-center gap-3 md:gap-4">
              <span className="text-xs uppercase text-slate-400 font-semibold">SETS</span>
              <span className="text-xl font-black text-amber-400 px-2 min-w-6 text-center">{score.playerSets}</span>
              <span className="text-xs uppercase text-slate-400 font-semibold">GAMES</span>
              <span className="text-xl font-black text-sky-400 px-2 min-w-6 text-center">{score.playerGames}</span>
              <span className="text-2xl font-black text-yellow-300 bg-slate-950 px-3 py-0.5 rounded-lg border border-yellow-500/30 min-w-12 text-center glow-neon-yellow">
                {formatPoint(score.playerPoints, 'player')}
              </span>
            </div>
          </div>

          {/* Opponent Row (BOT) */}
          <div className="flex items-center justify-between py-1.5">
            <div className="flex items-center gap-2.5">
              <span className={`w-3.5 h-3.5 rounded-full ${score.server === 'opponent' ? 'bg-yellow-400 shadow-[0_0_8px_#facc15]' : 'bg-transparent'}`}></span>
              <span className="text-lg md:text-xl font-bold tracking-wide text-slate-300">
                RIVAL <span className="text-xs text-amber-400 font-medium px-2 py-0.5 bg-amber-950/60 rounded border border-amber-500/40 ml-1">IA</span>
              </span>
            </div>
            <div className="flex items-center gap-3 md:gap-4">
              <span className="text-xs uppercase text-slate-400 font-semibold">SETS</span>
              <span className="text-xl font-black text-amber-400 px-2 min-w-6 text-center">{score.opponentSets}</span>
              <span className="text-xs uppercase text-slate-400 font-semibold">GAMES</span>
              <span className="text-xl font-black text-sky-400 px-2 min-w-6 text-center">{score.opponentGames}</span>
              <span className="text-2xl font-black text-yellow-300 bg-slate-950 px-3 py-0.5 rounded-lg border border-yellow-500/30 min-w-12 text-center glow-neon-yellow">
                {formatPoint(score.opponentPoints, 'opponent')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Telemetry: Radar Speed + Rally Counter + TV Action Callout */}
      <div className="flex flex-col items-start md:items-end gap-2">
        {/* Live TV Commentary / Coach Banner */}
        {commentary && (
          <div className="bg-slate-900/90 border border-emerald-500/50 text-emerald-300 font-display font-bold text-sm md:text-base px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 max-w-md animate-fade-in">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
            {commentary}
          </div>
        )}

        <div className="flex items-center gap-3 font-display">
          {/* Radar Speed Gun */}
          {ballSpeed > 0 && (
            <div className="bg-slate-900/90 border border-sky-500/40 px-3.5 py-1.5 rounded-xl shadow-lg flex items-center gap-2 text-sky-300">
              <Gauge className="w-5 h-5 text-sky-400" />
              <div>
                <div className="text-[10px] text-slate-400 leading-tight">RADAR DE VELOCIDADE</div>
                <div className="text-lg font-black text-white glow-neon-cyan leading-none">{ballSpeed} <span className="text-xs font-normal text-sky-400">KM/H</span></div>
              </div>
            </div>
          )}

          {/* Rally Counter */}
          {rallyCount > 1 && (
            <div className="bg-slate-900/90 border border-amber-500/40 px-3.5 py-1.5 rounded-xl shadow-lg flex items-center gap-2 text-amber-300">
              <Flame className="w-5 h-5 text-amber-400" />
              <div>
                <div className="text-[10px] text-slate-400 leading-tight">TROCA DE BOLAS</div>
                <div className="text-lg font-black text-white leading-none">{rallyCount} <span className="text-xs font-normal text-amber-400">GOLPES</span></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
