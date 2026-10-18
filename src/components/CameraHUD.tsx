import React, { useState } from 'react';
import { Camera, Activity, Zap, Maximize2, Minimize2, Eye, EyeOff } from 'lucide-react';
import { GestureType, MotionData } from '../types';

interface CameraHUDProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  motionData: MotionData;
  calories: number;
  swings: number;
  cameraReady: boolean;
  cameraError?: string;
  sensitivity: number;
  onSensitivityChange: (val: number) => void;
  onManualStroke: (gesture: GestureType) => void;
}

export const CameraHUD: React.FC<CameraHUDProps> = ({
  videoRef,
  canvasRef,
  motionData,
  calories,
  swings,
  cameraReady,
  cameraError,
  sensitivity,
  onSensitivityChange,
  onManualStroke
}) => {
  const [minimized, setMinimized] = useState<boolean>(false);
  const [showZones, setShowZones] = useState<boolean>(true);

  return (
    <div className="absolute bottom-20 left-6 z-30 font-display">
      {/* Fitness Pill Tracker */}
      <div className="mb-2 flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-1.5 shadow-xl text-xs backdrop-blur-md">
        <div className="flex items-center gap-1.5 text-emerald-400">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold">{calories} <span className="text-[10px] text-slate-400">KCAL</span></span>
        </div>
        <div className="w-px h-4 bg-slate-700"></div>
        <div className="flex items-center gap-1.5 text-amber-400">
          <Zap className="w-4 h-4 text-amber-400" />
          <span className="font-semibold">{swings} <span className="text-[10px] text-slate-400">GOLPES</span></span>
        </div>
      </div>

      {/* Main Camera PIP Window */}
      <div className={`bg-slate-950/95 border-2 border-emerald-500/50 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${minimized ? 'w-48 h-12' : 'w-64 md:w-76'}`}>
        {/* PIP Header */}
        <div className="bg-slate-900 px-3 py-1.5 flex items-center justify-between text-xs border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Camera className={`w-3.5 h-3.5 ${cameraReady ? 'text-emerald-400' : 'text-amber-400'}`} />
            <span className="font-bold tracking-wide text-slate-200">
              {cameraReady ? 'SENSOR DE MOVIMENTO' : 'MODO TECLADO / SIMULADOR'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowZones(!showZones)}
              title="Mostrar zonas de golpe"
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
            >
              {showZones ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => setMinimized(!minimized)}
              title={minimized ? 'Expandir câmera' : 'Minimizar câmera'}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
            >
              {minimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Video Canvas & Motion Overlay */}
        {!minimized && (
          <div className="relative aspect-[4/3] bg-black overflow-hidden">
            {/* Hidden Video Source Element */}
            <video
              ref={videoRef}
              playsInline
              muted
              className="hidden"
            />

            {/* Live Processed Motion Vision Canvas */}
            <canvas
              ref={canvasRef}
              width={160}
              height={120}
              className="w-full h-full object-cover transform -scale-x-100"
            />

            {/* Optical Swing Gesture Detection Zones Overlay */}
            {showZones && (
              <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-1.5 text-[9px] font-bold text-center select-none">
                {/* Upper Zone: Serve / Smash */}
                <div className={`py-1 rounded border ${motionData.isServingGesture ? 'bg-yellow-500/40 border-yellow-400 text-yellow-200' : 'bg-black/30 border-white/20 text-slate-300'}`}>
                  ↑ SACAR / SMASH
                </div>

                {/* Left & Right Swing Zones */}
                <div className="flex justify-between items-center my-auto px-1">
                  <div className={`px-2 py-3 rounded border ${motionData.detectedGesture === 'BACKHAND' ? 'bg-cyan-500/50 border-cyan-400 text-cyan-200' : 'bg-black/30 border-white/20 text-slate-300'}`}>
                    ← BACKHAND
                  </div>
                  <div className="text-[10px] text-emerald-400 bg-slate-950/70 px-2 py-1 rounded border border-emerald-500/30">
                    CENTRO
                  </div>
                  <div className={`px-2 py-3 rounded border ${motionData.detectedGesture === 'FOREHAND' ? 'bg-emerald-500/50 border-emerald-400 text-emerald-200' : 'bg-black/30 border-white/20 text-slate-300'}`}>
                    FOREHAND →
                  </div>
                </div>

                {/* Bottom Body Center of Gravity Indicator */}
                <div className="bg-slate-950/80 py-0.5 rounded text-[8px] text-slate-300 border border-slate-800">
                  POSIÇÃO CORPORAL: {motionData.playerX < -0.2 ? '← ESQUERDA' : motionData.playerX > 0.2 ? 'DIREITA →' : 'CENTRO'}
                </div>
              </div>
            )}

            {/* Gesture Notification Badge */}
            {motionData.detectedGesture !== 'IDLE' && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-yellow-400 text-slate-950 font-black text-sm px-3 py-1 rounded-full shadow-2xl uppercase tracking-wider animate-bounce pointer-events-none">
                {motionData.detectedGesture === 'SERVE_HIT' ? 'SAQUE POTENTE!' : motionData.detectedGesture}!
              </div>
            )}

            {/* Warning if camera error */}
            {cameraError && (
              <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-3 text-center text-xs">
                <span className="text-amber-400 font-bold mb-1">Câmera não conectada</span>
                <span className="text-slate-400 text-[10px] mb-2">Use o teclado (Setas e Espaço) ou clique nos botões abaixo.</span>
              </div>
            )}
          </div>
        )}

        {/* Sensitivity & Quick Stroke Buttons (Great for Testing or TV Remote) */}
        {!minimized && (
          <div className="p-2.5 bg-slate-900 border-t border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-300">
              <span>Sensibilidade da Câmera</span>
              <span className="text-emerald-400 font-bold">{Math.round(sensitivity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={sensitivity}
              onChange={(e) => onSensitivityChange(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />

            {/* Quick action buttons for living room / accessibility */}
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              <button
                onClick={() => onManualStroke('BACKHAND')}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] py-1.5 rounded font-bold border border-slate-700 active:scale-95 transition"
              >
                Backhand (←)
              </button>
              <button
                onClick={() => onManualStroke('SERVE_HIT')}
                className="bg-emerald-700 hover:bg-emerald-600 text-white text-[10px] py-1.5 rounded font-bold active:scale-95 transition"
              >
                Sacar (↑/Espaço)
              </button>
              <button
                onClick={() => onManualStroke('FOREHAND')}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] py-1.5 rounded font-bold border border-slate-700 active:scale-95 transition"
              >
                Forehand (→)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
