import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Activity, Zap, Flame, RotateCcw } from 'lucide-react';
import { MatchStats } from '../types';

interface VictoryModalProps {
  winner: 'player' | 'opponent';
  stats: MatchStats;
  onRematch: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({ winner, stats, onRematch }) => {
  const isPlayerWinner = winner === 'player';

  useEffect(() => {
    if (isPlayerWinner) {
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 }
        });
      } catch {
        // ignore
      }
    }
  }, [isPlayerWinner]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-lg font-display animate-fade-in">
      <div className="bg-slate-900 border-2 border-emerald-500/60 rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl text-center text-slate-100 relative">
        {/* Trophy / Result Icon */}
        <div className="mx-auto w-20 h-20 rounded-3xl bg-gradient-to-tr from-yellow-500/20 via-emerald-500/20 to-sky-500/20 border border-yellow-400/50 flex items-center justify-center mb-4">
          <Trophy className={`w-10 h-10 ${isPlayerWinner ? 'text-yellow-400 animate-bounce' : 'text-slate-400'}`} />
        </div>

        <h2 className="text-3xl md:text-4xl font-black tracking-wide text-white mb-2">
          {isPlayerWinner ? 'CAMPEÃO DO GRAND SLAM!' : 'FIM DE PARTIDA!'}
        </h2>
        <p className="text-sm md:text-base text-emerald-400 mb-6 font-semibold">
          {isPlayerWinner
            ? 'Vitória espetacular com movimentos incríveis pela quadra!'
            : 'Excelente partida! Continue se movimentando para aprimorar seus golpes!'}
        </p>

        {/* Fitness & Match Summary Card */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 mb-6 text-left grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2.5 p-2 bg-slate-900/60 rounded-xl">
            <Activity className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Calorias Queimadas</span>
              <span className="text-lg font-black text-white">{stats.caloriesBurned} kcal</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2 bg-slate-900/60 rounded-xl">
            <Zap className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Golpes Realizados</span>
              <span className="text-lg font-black text-white">{stats.swingsCount}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2 bg-slate-900/60 rounded-xl">
            <Flame className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Maior Troca de Bolas</span>
              <span className="text-lg font-black text-white">{stats.maxRally} rebatidas</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2 bg-slate-900/60 rounded-xl">
            <Trophy className="w-5 h-5 text-sky-400 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Aces Marcados</span>
              <span className="text-lg font-black text-white">{stats.aces}</span>
            </div>
          </div>
        </div>

        {/* Rematch Button */}
        <button
          onClick={onRematch}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-lg flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/25 transition cursor-pointer"
        >
          <RotateCcw className="w-5 h-5" />
          JOGAR NOVAMENTE
        </button>
      </div>
    </div>
  );
};
