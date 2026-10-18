/**
 * Computer Vision Motion & Gesture Detector for TV / Living Room Tennis.
 * Tracks player body position (left/right running) and swing strokes (forehand, backhand, serve, smash)
 * using frame differencing and optical mass tracking.
 */

import { GestureType, MotionData } from '../types';

export interface MotionDetectorCallbacks {
  onMotionUpdate: (data: MotionData) => void;
  onStrokeDetected: (gesture: GestureType, power: number) => void;
  onFitnessUpdate: (calories: number, swings: number) => void;
  onCameraReady?: (ready: boolean, error?: string) => void;
}

export class MotionDetector {
  private videoEl: HTMLVideoElement | null = null;
  private canvasEl: HTMLCanvasElement | null = null;
  private debugCanvasEl: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private debugCtx: CanvasRenderingContext2D | null = null;

  private stream: MediaStream | null = null;
  private isRunning: boolean = false;
  private animFrameId: number | null = null;

  // Analysis dimensions
  private readonly width = 160;
  private readonly height = 120;

  // Historical frame buffers for temporal difference
  private prevFrameData: Uint8ClampedArray | null = null;
  private bgFrameData: Float32Array | null = null;

  // Tracked player position (-1 left to +1 right)
  private currentX: number = 0;
  private targetX: number = 0;
  private currentZ: number = 0;

  // Gesture detection state
  private lastGestureTime: number = 0;
  private cooldownMs: number = 380;
  private swingsCount: number = 0;
  private caloriesBurned: number = 0;

  // Sensitivity settings
  public sensitivity: number = 1.0; // 0.5 to 2.0
  public mirrored: boolean = true;

  private callbacks: MotionDetectorCallbacks;

  constructor(callbacks: MotionDetectorCallbacks) {
    this.callbacks = callbacks;
  }

  public async start(videoElement: HTMLVideoElement, previewCanvas?: HTMLCanvasElement): Promise<boolean> {
    this.videoEl = videoElement;
    if (previewCanvas) {
      this.debugCanvasEl = previewCanvas;
      this.debugCtx = previewCanvas.getContext('2d');
    }

    // Hidden processing canvas
    this.canvasEl = document.createElement('canvas');
    this.canvasEl.width = this.width;
    this.canvasEl.height = this.height;
    this.ctx = this.canvasEl.getContext('2d', { willReadFrequently: true });

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
          frameRate: { ideal: 30 }
        },
        audio: false
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.videoEl.srcObject = this.stream;
      await this.videoEl.play();

      this.isRunning = true;
      this.prevFrameData = null;
      this.bgFrameData = null;

      if (this.callbacks.onCameraReady) {
        this.callbacks.onCameraReady(true);
      }

      this.processLoop();
      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Falha ao acessar câmera';
      console.warn('Camera error, running in simulated/keyboard mode:', errorMsg);
      if (this.callbacks.onCameraReady) {
        this.callbacks.onCameraReady(false, errorMsg);
      }
      return false;
    }
  }

  public stop() {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (this.videoEl) {
      this.videoEl.srcObject = null;
    }
  }

  public setSensitivity(val: number) {
    this.sensitivity = Math.max(0.4, Math.min(2.5, val));
  }

  // Fallback keyboard / manual triggering for accessibility & TV remote
  public triggerManualStroke(type: GestureType, power: number = 0.85) {
    this.swingsCount++;
    this.caloriesBurned += 0.22;
    this.callbacks.onStrokeDetected(type, power);
    this.callbacks.onFitnessUpdate(Math.floor(this.caloriesBurned), this.swingsCount);
  }

  public setManualPosition(x: number) {
    this.targetX = Math.max(-1, Math.min(1, x));
  }

  private processLoop = () => {
    if (!this.isRunning) return;

    this.analyzeCurrentFrame();
    this.animFrameId = requestAnimationFrame(this.processLoop);
  };

  private analyzeCurrentFrame() {
    if (!this.videoEl || !this.ctx || this.videoEl.readyState < 2) return;

    const w = this.width;
    const h = this.height;

    // Draw video frame to small offscreen canvas
    this.ctx.drawImage(this.videoEl, 0, 0, w, h);
    const imgData = this.ctx.getImageData(0, 0, w, h);
    const pixels = imgData.data;

    if (!this.prevFrameData) {
      this.prevFrameData = new Uint8ClampedArray(pixels.length);
      this.prevFrameData.set(pixels);
      return;
    }

    let totalMotion = 0;
    let motionSumX = 0;
    let motionSumY = 0;

    let leftZoneMotion = 0;
    let rightZoneMotion = 0;
    let topZoneMotion = 0;

    // Create debug motion visualization buffer if debug canvas is active
    let debugImgData: ImageData | null = null;
    if (this.debugCanvasEl && this.debugCtx) {
      debugImgData = this.debugCtx.createImageData(w, h);
    }

    // Motion threshold scaled by sensitivity
    const threshold = 28 / this.sensitivity;

    // Analyze pixel changes
    for (let i = 0; i < pixels.length; i += 4) {
      const rDiff = Math.abs(pixels[i] - this.prevFrameData[i]);
      const gDiff = Math.abs(pixels[i + 1] - this.prevFrameData[i + 1]);
      const bDiff = Math.abs(pixels[i + 2] - this.prevFrameData[i + 2]);
      const diff = (rDiff + gDiff + bDiff) / 3;

      const pxIndex = i / 4;
      let x = pxIndex % w;
      const y = Math.floor(pxIndex / w);

      // Invert X if mirrored (natural mirror view on TV)
      if (this.mirrored) {
        x = w - 1 - x;
      }

      if (diff > threshold) {
        totalMotion += diff;
        motionSumX += x * diff;
        motionSumY += y * diff;

        // Regional motion analysis
        if (y < h * 0.38) {
          topZoneMotion += diff;
        }

        if (x < w * 0.38) {
          leftZoneMotion += diff; // Player's left side (backhand for righty, or forehand)
        } else if (x > w * 0.62) {
          rightZoneMotion += diff; // Player's right side (forehand for righty)
        }

        if (debugImgData) {
          const outIdx = (y * w + (this.mirrored ? (w - 1 - (pxIndex % w)) : (pxIndex % w))) * 4;
          debugImgData.data[outIdx] = 34;      // Green neon glow
          debugImgData.data[outIdx + 1] = 220;
          debugImgData.data[outIdx + 2] = 120;
          debugImgData.data[outIdx + 3] = 230;
        }
      } else if (debugImgData) {
        // Dim background video preview
        const outIdx = (y * w + (this.mirrored ? (w - 1 - (pxIndex % w)) : (pxIndex % w))) * 4;
        debugImgData.data[outIdx] = Math.floor(pixels[i] * 0.35);
        debugImgData.data[outIdx + 1] = Math.floor(pixels[i + 1] * 0.35);
        debugImgData.data[outIdx + 2] = Math.floor(pixels[i + 2] * 0.35);
        debugImgData.data[outIdx + 3] = 255;
      }
    }

    // Save previous frame for next loop
    this.prevFrameData.set(pixels);

    // Render motion debug to HUD PIP canvas
    if (this.debugCanvasEl && this.debugCtx && debugImgData) {
      this.debugCtx.putImageData(debugImgData, 0, 0);

      // Draw zone guidelines & labels
      this.debugCtx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      this.debugCtx.lineWidth = 1;
      this.debugCtx.beginPath();
      // Vertical divider lines
      this.debugCtx.moveTo(w * 0.38, 0);
      this.debugCtx.lineTo(w * 0.38, h);
      this.debugCtx.moveTo(w * 0.62, 0);
      this.debugCtx.lineTo(w * 0.62, h);
      // Horizontal top zone
      this.debugCtx.moveTo(0, h * 0.38);
      this.debugCtx.lineTo(w, h * 0.38);
      this.debugCtx.stroke();

      // Draw detected player position marker
      if (totalMotion > 1200) {
        const markerX = (this.currentX + 1) * 0.5 * w;
        this.debugCtx.fillStyle = '#22c55e';
        this.debugCtx.beginPath();
        this.debugCtx.arc(markerX, h * 0.85, 5, 0, Math.PI * 2);
        this.debugCtx.fill();
      }
    }

    // Normalize motion values
    const motionIntensity = Math.min(1.0, totalMotion / (w * h * 8));

    // Calculate player horizontal center if there is sufficient body motion
    if (totalMotion > 1200 * this.sensitivity) {
      const detectedCenterX = motionSumX / totalMotion;
      // Map from [0, w] to [-1.0, 1.0]
      const normalizedX = ((detectedCenterX / w) - 0.5) * 2.4; // Expand center reach
      this.targetX = Math.max(-1.0, Math.min(1.0, normalizedX));
    }

    // Smooth movement towards target
    this.currentX += (this.targetX - this.currentX) * 0.18;

    // Fitness calorie tracking
    if (motionIntensity > 0.05) {
      this.caloriesBurned += motionIntensity * 0.012;
      this.callbacks.onFitnessUpdate(Math.floor(this.caloriesBurned), this.swingsCount);
    }

    // Stroke / Gesture Classification
    const now = performance.now();
    let detectedGesture: GestureType = 'IDLE';
    let gestureSpeed = 0;

    const strokeThreshold = 3800 * this.sensitivity;

    if (now - this.lastGestureTime > this.cooldownMs) {
      // 1. High overhead movement: Serve or Smash
      if (topZoneMotion > strokeThreshold * 0.75) {
        const power = Math.min(1.0, topZoneMotion / (strokeThreshold * 2.2));
        detectedGesture = 'SERVE_HIT';
        gestureSpeed = power;
        this.lastGestureTime = now;
        this.swingsCount++;
        this.caloriesBurned += 0.35;
        this.callbacks.onStrokeDetected('SERVE_HIT', power);
      }
      // 2. Right-side dynamic swing (Forehand)
      else if (rightZoneMotion > strokeThreshold && rightZoneMotion > leftZoneMotion * 1.35) {
        const power = Math.min(1.0, rightZoneMotion / (strokeThreshold * 2.5));
        detectedGesture = 'FOREHAND';
        gestureSpeed = power;
        this.lastGestureTime = now;
        this.swingsCount++;
        this.caloriesBurned += 0.28;
        this.callbacks.onStrokeDetected('FOREHAND', power);
      }
      // 3. Left-side dynamic swing (Backhand)
      else if (leftZoneMotion > strokeThreshold && leftZoneMotion > rightZoneMotion * 1.35) {
        const power = Math.min(1.0, leftZoneMotion / (strokeThreshold * 2.5));
        detectedGesture = 'BACKHAND';
        gestureSpeed = power;
        this.lastGestureTime = now;
        this.swingsCount++;
        this.caloriesBurned += 0.28;
        this.callbacks.onStrokeDetected('BACKHAND', power);
      }
    }

    // Emit live motion frame
    this.callbacks.onMotionUpdate({
      playerX: this.currentX,
      playerZ: this.currentZ,
      detectedGesture,
      gestureSpeed,
      motionIntensity,
      isServingGesture: topZoneMotion > strokeThreshold * 0.7,
      isSmashGesture: topZoneMotion > strokeThreshold * 1.2,
      lastGestureTime: this.lastGestureTime
    });
  }

  public resetFitness() {
    this.swingsCount = 0;
    this.caloriesBurned = 0;
  }
}
