import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Sparkles, Zap, Smartphone, CheckCircle, Flame, Volume2, VolumeX } from 'lucide-react';
import { soundManager } from '../audio/soundManager';

export default function PhoneController() {
  const [roomCode, setRoomCode] = useState<string>('');
  const [joined, setJoined] = useState<boolean>(false);
  const [connectedTV, setConnectedTV] = useState<boolean>(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  const [lastAction, setLastAction] = useState<string>('PRONTO PARA JOGAR');
  const [powerLevel, setPowerLevel] = useState<number>(0.8);
  const [vibrationEnabled, setVibrationEnabled] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Motion sensor state
  const [permissionGranted, setPermissionGranted] = useState<boolean>(false);

  const socketRef = useRef<Socket | null>(null);
  const roomCodeRef = useRef<string>('');

  useEffect(() => {
    // Extract room code from URL query parameter ?room=XYZ
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room) {
      setRoomCode(room.toUpperCase());
      roomCodeRef.current = room.toUpperCase();
    }
  }, []);

  const connectToRoom = (codeToJoin?: string) => {
    const code = (codeToJoin || roomCode).trim().toUpperCase();
    if (!code) return;

    setRoomCode(code);
    roomCodeRef.current = code;

    const newSocket = io();
    setSocket(newSocket);
    socketRef.current = newSocket;

    newSocket.on('connect', () => {
      newSocket.emit('phone_join_room', code);
    });

    newSocket.on('joined_success', () => {
      setJoined(true);
      setConnectedTV(true);
      soundManager.playScoreChime();
    });

    newSocket.on('tv_disconnected', () => {
      setConnectedTV(false);
    });
  };

  // Request DeviceOrientation Permission for iOS 13+ / Android
  const requestMotionPermission = async () => {
    if (typeof (DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === 'function') {
      try {
        const response = await (DeviceMotionEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission();
        if (response === 'granted') {
          setPermissionGranted(true);
          setupMotionListeners();
        } else {
          alert('Permissão de sensor negada.');
        }
      } catch (err) {
        console.warn(err);
      }
    } else {
      setPermissionGranted(true);
      setupMotionListeners();
    }
  };

  const setupMotionListeners = () => {
    window.addEventListener('deviceorientation', (event) => {
      if (!socketRef.current || !roomCodeRef.current) return;

      const alpha = event.alpha || 0; // rotation around z
      const beta = event.beta || 0;   // tilt front/back (-180 to 180)
      const gamma = event.gamma || 0; // tilt left/right (-90 to 90)

      // Send orientation to TV for player movement and swing detection
      socketRef.current.emit('phone_motion_data', {
        roomCode: roomCodeRef.current,
        alpha,
        beta,
        gamma
      });

      // Detect aggressive swing gesture based on rapid beta/gamma tilt change
      if (Math.abs(beta) > 55 || Math.abs(gamma) > 45) {
        triggerSwing('FOREHAND', 0.9);
      }
    });
  };

  const triggerSwing = (gesture: 'FOREHAND' | 'BACKHAND' | 'SERVE_HIT', power: number = 0.85) => {
    if (!socketRef.current || !roomCodeRef.current) return;

    socketRef.current.emit('phone_swing_action', {
      roomCode: roomCodeRef.current,
      gesture,
      power
    });

    setLastAction(gesture === 'SERVE_HIT' ? 'SAQUE!' : (gesture === 'FOREHAND' ? 'FOREHAND!' : 'BACKHAND!'));

    if (vibrationEnabled && 'vibrate' in navigator) {
      navigator.vibrate(60);
    }
    soundManager.playRacketHit(power, gesture === 'SERVE_HIT');

    setTimeout(() => {
      setLastAction('PRONTO PARA JOGAR');
    }, 700);
  };

  return (
    <div className="fixed inset-0 bg-slate-950 text-slate-100 flex flex-col items-center justify-between p-6 font-display select-none overflow-hidden">
      {/* Header */}
      <div className="w-full flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Smartphone className="w-6 h-6 text-emerald-400" />
          <span className="font-black tracking-wider text-lg">CELULAR RAQUETE</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const muted = !isMuted;
              setIsMuted(muted);
              soundManager.setMuted(muted);
            }}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full max-w-sm flex-1 flex flex-col items-center justify-center text-center my-auto">
        {!joined ? (
          <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-3xl w-full shadow-2xl space-y-4">
            <h2 className="text-xl font-bold text-white">CONECTAR À TELEVISÃO</h2>
            <p className="text-xs text-slate-400">Digite o código de 4 dígitos exibido na tela da TV:</p>

            <input
              type="text"
              maxLength={4}
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="EX: A7X9"
              className="w-full bg-slate-950 border-2 border-slate-700 rounded-2xl py-3 text-center text-3xl font-black tracking-widest text-emerald-400 uppercase focus:border-emerald-500 outline-none"
            />

            <button
              onClick={() => connectToRoom()}
              className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-base shadow-lg shadow-emerald-500/25 transition cursor-pointer"
            >
              CONECTAR COMO RAQUETE
            </button>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center space-y-6">
            {/* Connection Status Badge */}
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>{connectedTV ? 'CONECTADO À TV' : 'AGUARDANDO TV...'}</span>
            </div>

            {/* Motion Sensor Permission Banner */}
            {!permissionGranted && (
              <button
                onClick={requestMotionPermission}
                className="w-full py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer animate-pulse"
              >
                <Sparkles className="w-4 h-4" />
                ATIVAR SENSORES DE MOVIMENTO DO CELULAR
              </button>
            )}

            {/* Action Feedback Display */}
            <div className="w-full py-6 px-4 bg-slate-900 border-2 border-emerald-500/30 rounded-3xl shadow-inner">
              <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">STATUS DO GOLPE</div>
              <div className="text-2xl font-black text-yellow-300 glow-neon-yellow">{lastAction}</div>
            </div>

            {/* Giant Racket Swing Buttons */}
            <div className="w-full grid grid-cols-2 gap-3">
              <button
                onTouchStart={() => triggerSwing('BACKHAND', powerLevel)}
                onClick={() => triggerSwing('BACKHAND', powerLevel)}
                className="py-8 bg-sky-600 hover:bg-sky-500 active:scale-95 rounded-3xl font-black text-white text-lg shadow-xl shadow-sky-600/30 flex flex-col items-center justify-center gap-2 transition cursor-pointer"
              >
                <span>← BACKHAND</span>
                <span className="text-[10px] font-normal text-sky-200">Esquerda</span>
              </button>

              <button
                onTouchStart={() => triggerSwing('FOREHAND', powerLevel)}
                onClick={() => triggerSwing('FOREHAND', powerLevel)}
                className="py-8 bg-emerald-600 hover:bg-emerald-500 active:scale-95 rounded-3xl font-black text-white text-lg shadow-xl shadow-emerald-600/30 flex flex-col items-center justify-center gap-2 transition cursor-pointer"
              >
                <span>FOREHAND →</span>
                <span className="text-[10px] font-normal text-emerald-200">Direita</span>
              </button>
            </div>

            {/* Serve Button */}
            <button
              onTouchStart={() => triggerSwing('SERVE_HIT', 1.0)}
              onClick={() => triggerSwing('SERVE_HIT', 1.0)}
              className="w-full py-5 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 active:scale-95 rounded-3xl font-black text-slate-950 text-lg shadow-xl shadow-yellow-500/30 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Zap className="w-5 h-5 fill-current" />
              SACAR / SMASH POTENTE
            </button>
          </div>
        )}
      </div>

      {/* Footer Instructions */}
      <div className="w-full text-center text-[11px] text-slate-500 pb-2">
        Tennis Motion 3D • Use seu smartphone como raquete na TV
      </div>
    </div>
  );
}
