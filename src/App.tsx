import React, { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { TennisScene } from './three/tennisScene';
import { MotionDetector } from './vision/motionDetector';
import { soundManager } from './audio/soundManager';
import { ScoreBoard } from './components/ScoreBoard';
import { CameraHUD } from './components/CameraHUD';
import { TVControlDock } from './components/TVControlDock';
import { InstructionsModal } from './components/InstructionsModal';
import { VictoryModal } from './components/VictoryModal';
import { PhoneConnectModal } from './components/PhoneConnectModal';
import PhoneController from './components/PhoneController';
import { CourtSurface, Difficulty, GestureType, MatchStats, MotionData, TennisScore } from './types';
import { Play, Sparkles, Tv, Smartphone } from 'lucide-react';

export default function App() {
  // Check if URL is phone controller mode (?mode=phone)
  const [isPhoneMode, setIsPhoneMode] = useState<boolean>(false);

  const canvasMountRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const sceneRef = useRef<TennisScene | null>(null);
  const detectorRef = useRef<MotionDetector | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Game UI State
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  const [cameraReady, setCameraReady] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | undefined>(undefined);
  const [sensitivity, setSensitivity] = useState<number>(1.1);

  const [surface, setSurface] = useState<CourtSurface>('HARD_COURT');
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');
  const [isMusicPlaying, setIsMusicPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [showPhoneModal, setShowPhoneModal] = useState<boolean>(false);
  const [phoneConnected, setPhoneConnected] = useState<boolean>(false);
  const [roomCode, setRoomCode] = useState<string>('');
  const [matchWinner, setMatchWinner] = useState<'player' | 'opponent' | null>(null);

  // Match Telemetry
  const [score, setScore] = useState<TennisScore>({
    playerPoints: 0,
    opponentPoints: 0,
    playerGames: 0,
    opponentGames: 0,
    playerSets: 0,
    opponentSets: 0,
    isDeuce: false,
    advantage: null,
    server: 'player',
    serveFaultCount: 0
  });

  const [ballSpeed, setBallSpeed] = useState<number>(0);
  const [rallyCount, setRallyCount] = useState<number>(0);
  const [commentary, setCommentary] = useState<string>('BEM-VINDO AO GRAND SLAM MOTION TV!');

  const [calories, setCalories] = useState<number>(0);
  const [swings, setSwings] = useState<number>(0);

  const [motionData, setMotionData] = useState<MotionData>({
    playerX: 0,
    playerZ: 0,
    detectedGesture: 'IDLE',
    gestureSpeed: 0,
    motionIntensity: 0,
    isServingGesture: false,
    isSmashGesture: false,
    lastGestureTime: 0
  });

  const [matchStats, setMatchStats] = useState<MatchStats>({
    aces: 0,
    winners: 0,
    swingsCount: 0,
    caloriesBurned: 0,
    maxRally: 0,
    currentRally: 0,
    matchDurationSec: 0
  });

  // Check URL parameters on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'phone') {
      setIsPhoneMode(true);
    }

    // Generate random 4-char room code for TV
    const generatedCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    setRoomCode(generatedCode);
  }, []);

  // Socket.io TV server connection
  useEffect(() => {
    if (isPhoneMode) return;

    const newSocket = io();
    socketRef.current = newSocket;

    newSocket.on('connect', () => {
      if (roomCode) {
        newSocket.emit('tv_create_room', roomCode);
      }
    });

    newSocket.on('phone_connected', () => {
      setPhoneConnected(true);
      setShowPhoneModal(false);
      soundManager.playScoreChime();
      setCommentary('CELULAR RAQUETE CONECTADO COM SUCESSO!');
    });

    newSocket.on('phone_disconnected', () => {
      setPhoneConnected(false);
      setCommentary('CELULAR DESCONECTADO.');
    });

    newSocket.on('tv_receive_swing', ({ gesture, power }) => {
      handleManualStroke(gesture, power);
    });

    newSocket.on('tv_receive_motion', ({ beta, gamma }) => {
      // Map gamma (-90 to 90) to player X position (-1 to 1)
      const mappedX = Math.max(-1, Math.min(1, gamma / 40));
      if (sceneRef.current) {
        sceneRef.current.updatePlayerMotion(mappedX);
      }
      setMotionData(prev => ({ ...prev, playerX: mappedX }));
    });

    return () => {
      newSocket.disconnect();
    };
  }, [roomCode, isPhoneMode]);

  // Keep latest callbacks in ref for stable WebGL loop
  const callbacksRef = useRef({
    onScoreUpdate: (newScore: TennisScore) => {
      setScore(newScore);
    },
    onPointEnd: (winner: 'player' | 'opponent', reason: string, isAce: boolean) => {
      setCommentary(`${winner === 'player' ? 'PONTO SEU!' : 'PONTO DO ADVERSÁRIO!'} ${reason}`);
      setMatchStats(prev => ({
        ...prev,
        aces: prev.aces + (isAce && winner === 'player' ? 1 : 0),
        winners: prev.winners + (winner === 'player' ? 1 : 0)
      }));
    },
    onGameWon: (winner: 'player' | 'opponent', pGames: number, oGames: number) => {
      setCommentary(`GAME! ${winner === 'player' ? 'VOCÊ VENCEU O GAME!' : 'O ADVERSÁRIO VENCEU O GAME!'}`);
      setScore(prev => ({ ...prev, playerGames: pGames, opponentGames: oGames }));
    },
    onMatchWon: (winner: 'player' | 'opponent') => {
      setMatchWinner(winner);
    },
    onRallyCount: (count: number) => {
      setRallyCount(count);
      setMatchStats(prev => ({
        ...prev,
        currentRally: count,
        maxRally: Math.max(prev.maxRally, count)
      }));
    },
    onBallSpeed: (kmh: number) => {
      setBallSpeed(kmh);
    },
    onCommentary: (text: string) => {
      setCommentary(text);
    }
  });

  // Initialize Three.js 3D Scene once
  useEffect(() => {
    if (isPhoneMode || !canvasMountRef.current) return;

    const scene = new TennisScene(canvasMountRef.current, {
      onScoreUpdate: (s) => callbacksRef.current.onScoreUpdate(s),
      onPointEnd: (w, r, a) => callbacksRef.current.onPointEnd(w, r, a),
      onGameWon: (w, p, o) => callbacksRef.current.onGameWon(w, p, o),
      onMatchWon: (w) => callbacksRef.current.onMatchWon(w),
      onRallyCount: (c) => callbacksRef.current.onRallyCount(c),
      onBallSpeed: (kmh) => callbacksRef.current.onBallSpeed(kmh),
      onCommentary: (txt) => callbacksRef.current.onCommentary(txt)
    });

    sceneRef.current = scene;

    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, [isPhoneMode]);

  // Keyboard Assist for TV Remote or manual testing
  useEffect(() => {
    let keyX = 0;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;

      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        keyX = Math.max(-1, keyX - 0.35);
        if (sceneRef.current) sceneRef.current.updatePlayerMotion(keyX);
        if (detectorRef.current) detectorRef.current.setManualPosition(keyX);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        keyX = Math.min(1, keyX + 0.35);
        if (sceneRef.current) sceneRef.current.updatePlayerMotion(keyX);
        if (detectorRef.current) detectorRef.current.setManualPosition(keyX);
      } else if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        handleManualStroke('SERVE_HIT', 0.95);
      } else if (e.key === 'f' || e.key === 'F') {
        handleManualStroke('FOREHAND', 0.9);
      } else if (e.key === 'b' || e.key === 'B') {
        handleManualStroke('BACKHAND', 0.9);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Start Camera & Audio on user click
  const startGame = useCallback(async () => {
    setHasStarted(true);

    // Start energetic sports synth music
    soundManager.startMusic();
    setIsMusicPlaying(true);

    // Initialize camera motion detector as fallback / alternative
    if (videoRef.current) {
      const detector = new MotionDetector({
        onMotionUpdate: (data) => {
          if (!phoneConnected) {
            setMotionData(data);
            if (sceneRef.current) {
              sceneRef.current.updatePlayerMotion(data.playerX);
            }
          }
        },
        onStrokeDetected: (gesture, power) => {
          if (!phoneConnected) {
            handleManualStroke(gesture, power);
          }
        },
        onFitnessUpdate: (cal, sw) => {
          setCalories(cal);
          setSwings(sw);
          setMatchStats(prev => ({
            ...prev,
            caloriesBurned: cal,
            swingsCount: sw
          }));
        },
        onCameraReady: (ready, err) => {
          setCameraReady(ready);
          setCameraError(err);
        }
      });

      detector.setSensitivity(sensitivity);
      detectorRef.current = detector;
      await detector.start(videoRef.current, previewCanvasRef.current || undefined);
    }
  }, [sensitivity, phoneConnected]);

  const handleSensitivityChange = (val: number) => {
    setSensitivity(val);
    if (detectorRef.current) {
      detectorRef.current.setSensitivity(val);
    }
  };

  const handleManualStroke = (type: GestureType, power: number = 0.9) => {
    if (sceneRef.current) {
      sceneRef.current.triggerPlayerStroke(type, power);
    }
    setSwings(s => s + 1);
    setCalories(c => c + 0.25);
    setMatchStats(prev => ({
      ...prev,
      swingsCount: prev.swingsCount + 1,
      caloriesBurned: prev.caloriesBurned + 0.25
    }));
  };

  const handleSurfaceChange = (newSurface: CourtSurface) => {
    setSurface(newSurface);
    if (sceneRef.current) {
      sceneRef.current.setCourtSurface(newSurface);
    }
  };

  const handleDifficultyChange = (newDiff: Difficulty) => {
    setDifficulty(newDiff);
    if (sceneRef.current) {
      sceneRef.current.setDifficulty(newDiff);
    }
  };

  const handleToggleMusic = () => {
    const isPlaying = soundManager.toggleMusic();
    setIsMusicPlaying(isPlaying);
  };

  const handleToggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    soundManager.setMuted(newMuted);
  };

  const handleResetMatch = () => {
    setMatchWinner(null);
    setCalories(0);
    setSwings(0);
    setBallSpeed(0);
    setRallyCount(0);
    setCommentary('PARTIDA REINICIADA! SEU SAQUE!');
    if (sceneRef.current) {
      sceneRef.current.resetMatch();
    }
    if (detectorRef.current) {
      detectorRef.current.resetFitness();
    }
  };

  // If URL has ?mode=phone, render the Mobile Racket Controller view
  if (isPhoneMode) {
    return <PhoneController />;
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#060913] select-none">
      {/* 1. Dedicated WebGL 3D Canvas Mount (100% Unobstructed Center Viewport) */}
      <div ref={canvasMountRef} className="absolute inset-0 z-0 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* 2. Welcome / Game Start Overlay (Demands User Gesture to initialize Camera & Audio) */}
      {!hasStarted && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/85 backdrop-blur-md font-display">
          <div className="bg-slate-900/95 border-2 border-emerald-500/60 rounded-3xl max-w-xl w-full p-6 md:p-8 shadow-2xl text-center text-slate-100">
            {/* Header Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-4">
              <Tv className="w-3.5 h-3.5" /> Otimizado para Smart TVs & Celular Raquete
            </div>

            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white mb-2 leading-none">
              TENNIS MOTION <span className="text-emerald-400">3D</span>
            </h1>
            <p className="text-slate-300 text-sm md:text-base mb-6">
              Jogue tênis na sua televisão usando o seu <strong className="text-yellow-300">celular como raquete</strong> (via sensor de movimento) ou a câmera!
            </p>

            {/* Quick 3-Step Preview */}
            <div className="grid grid-cols-3 gap-2.5 mb-6 text-left">
              <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800">
                <span className="text-xs font-black text-yellow-400 block mb-1">1. ESCANEIE O QR</span>
                <span className="text-[11px] text-slate-400">Conecte seu celular para usá-lo de raquete.</span>
              </div>
              <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800">
                <span className="text-xs font-black text-emerald-400 block mb-1">2. MOVIMENTE O CELULAR</span>
                <span className="text-[11px] text-slate-400">Incline o celular para correr pela quadra.</span>
              </div>
              <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800">
                <span className="text-xs font-black text-sky-400 block mb-1">3. GOLPEIE</span>
                <span className="text-[11px] text-slate-400">Balance o celular para rebater e sacar!</span>
              </div>
            </div>

            {/* Start Button */}
            <button
              onClick={startGame}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xl flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/30 transition cursor-pointer transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <Play className="w-6 h-6 fill-current" />
              ENTRAR NA QUADRA E JOGAR
            </button>

            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
              <Smartphone className="w-4 h-4 text-yellow-400" />
              <span>Você poderá parear seu celular na próxima tela.</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Grand Slam TV Scoreboard & Commentary */}
      {hasStarted && (
        <ScoreBoard
          score={score}
          ballSpeed={ballSpeed}
          rallyCount={rallyCount}
          commentary={commentary}
        />
      )}

      {/* 4. Camera Motion Vision & Fitness HUD (Left Corner) with Phone Connect Button */}
      {hasStarted && (
        <div className="absolute bottom-20 left-6 z-30 flex flex-col gap-2 font-display">
          {/* Phone Connect Button Badge */}
          <button
            onClick={() => setShowPhoneModal(true)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl shadow-xl font-bold text-xs border transition cursor-pointer ${
              phoneConnected
                ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300'
                : 'bg-yellow-500 hover:bg-yellow-400 text-slate-950 border-yellow-400 animate-pulse'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>{phoneConnected ? '📱 Celular Conectado como Raquete' : '📱 Usar Celular como Raquete (QR Code)'}</span>
          </button>

          <CameraHUD
            videoRef={videoRef}
            canvasRef={previewCanvasRef}
            motionData={motionData}
            calories={calories}
            swings={swings}
            cameraReady={cameraReady}
            cameraError={cameraError}
            sensitivity={sensitivity}
            onSensitivityChange={handleSensitivityChange}
            onManualStroke={(gesture) => handleManualStroke(gesture, 0.9)}
          />
        </div>
      )}

      {/* 5. Sleek Collapsible Bottom Dock (Three.js skill directive) */}
      {hasStarted && (
        <TVControlDock
          surface={surface}
          onSurfaceChange={handleSurfaceChange}
          difficulty={difficulty}
          onDifficultyChange={handleDifficultyChange}
          isMusicPlaying={isMusicPlaying}
          onToggleMusic={handleToggleMusic}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onResetMatch={handleResetMatch}
          onOpenHelp={() => setShowHelp(true)}
        />
      )}

      {/* 6. Gesture & TV Instructions Modal */}
      <InstructionsModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
      />

      {/* 7. Phone QR Code Connect Modal */}
      <PhoneConnectModal
        isOpen={showPhoneModal}
        onClose={() => setShowPhoneModal(false)}
        roomCode={roomCode}
      />

      {/* 8. Victory / Match Won Modal */}
      {matchWinner && (
        <VictoryModal
          winner={matchWinner}
          stats={matchStats}
          onRematch={handleResetMatch}
        />
      )}
    </div>
  );
}
