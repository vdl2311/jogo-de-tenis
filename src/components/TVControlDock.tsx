import React, { useState } from 'react';
import {
  Volume2,
  VolumeX,
  Music,
  RotateCcw,
  Maximize,
  HelpCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { CourtSurface, Difficulty } from '../types';

interface TVControlDockProps {
  surface: CourtSurface;
  onSurfaceChange: (surface: CourtSurface) => void;
  difficulty: Difficulty;
  onDifficultyChange: (diff: Difficulty) => void;
  isMusicPlaying: boolean;
  onToggleMusic: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onResetMatch: () => void;
  onOpenHelp: () => void;
}

export const TVControlDock: React.FC<TVControlDockProps> = ({
  surface,
  onSurfaceChange,
  difficulty,
  onDifficultyChange,
  isMusicPlaying,
  onToggleMusic,
  isMuted,
  onToggleMute,
  onResetMatch,
  onOpenHelp
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center transition-all duration-300 font-display pointer-events-auto"
      style={{ maxWidth: 'min(940px, 94vw)', width: '100%' }}
    >
      {/* Collapse / Expand Tab */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="bg-slate-900/90 border border-slate-700/80 border-b-0 px-4 py-1 rounded-t-xl text-xs text-slate-300 hover:text-white flex items-center gap-1.5 shadow-lg backdrop-blur-md cursor-pointer transition hover:bg-slate-800"
      >
        {isCollapsed ? (
          <>
            <ChevronUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>MOSTRAR CONTROLES</span>
          </>
        ) : (
          <>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            <span>RECOLHER BARRA</span>
          </>
        )}
      </button>

      {/* Dock Content */}
      <div
        className={`w-full bg-slate-950/90 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-md p-2.5 md:p-3 transition-all duration-300 overflow-hidden ${
          isCollapsed ? 'max-h-0 py-0 opacity-0 pointer-events-none' : 'max-h-48 opacity-100'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs md:text-sm">
          {/* 1. Court Surface Selector */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <span className="text-[11px] font-bold text-slate-400 px-2 uppercase">Quadra:</span>
            <button
              onClick={() => onSurfaceChange('HARD_COURT')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                surface === 'HARD_COURT'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Rápida (Azul)
            </button>
            <button
              onClick={() => onSurfaceChange('CLAY')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                surface === 'CLAY'
                  ? 'bg-orange-700 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Saibro (Roland Garros)
            </button>
            <button
              onClick={() => onSurfaceChange('GRASS')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                surface === 'GRASS'
                  ? 'bg-emerald-700 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Grama (Wimbledon)
            </button>
          </div>

          {/* 2. Difficulty Selector */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <span className="text-[11px] font-bold text-slate-400 px-2 uppercase">Nível:</span>
            <button
              onClick={() => onDifficultyChange('EASY')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                difficulty === 'EASY'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Iniciante
            </button>
            <button
              onClick={() => onDifficultyChange('MEDIUM')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                difficulty === 'MEDIUM'
                  ? 'bg-amber-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Pro
            </button>
            <button
              onClick={() => onDifficultyChange('HARD')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                difficulty === 'HARD'
                  ? 'bg-rose-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Campeão
            </button>
          </div>

          {/* 3. Audio & Utility Controls */}
          <div className="flex items-center gap-2">
            {/* Energetic Music Button */}
            <button
              onClick={onToggleMusic}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold border transition cursor-pointer ${
                isMusicPlaying
                  ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
              }`}
              title="Música Energética de Treino"
            >
              <Music className="w-4 h-4" />
              <span className="hidden sm:inline">Música {isMusicPlaying ? 'Ligada' : 'Desligada'}</span>
            </button>

            {/* Mute SFX */}
            <button
              onClick={onToggleMute}
              className={`p-2 rounded-xl border transition cursor-pointer ${
                isMuted
                  ? 'bg-rose-950/80 border-rose-600 text-rose-300'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
              }`}
              title={isMuted ? 'Desmutar' : 'Mutar Efeitos'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Reset Match */}
            <button
              onClick={onResetMatch}
              className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Reiniciar Partida"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Instructions / How to play */}
            <button
              onClick={onOpenHelp}
              className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-emerald-400 hover:text-emerald-300 hover:bg-slate-800 transition cursor-pointer"
              title="Como Jogar na TV com Câmera"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            {/* Fullscreen for TV */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition cursor-pointer shadow-lg"
              title="Tela Cheia (Ideal para TV)"
            >
              <Maximize className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
