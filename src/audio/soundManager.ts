/**
 * Procedural Web Audio API sound effects and energetic sports synth music
 * Zero external file dependencies - 100% generated in real-time.
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private isMusicPlaying: boolean = false;
  private musicTimer: number | null = null;
  private musicStep: number = 0;
  private sfxVolume: number = 0.8;
  private musicVolume: number = 0.55;
  private muted: boolean = false;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : 1, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 1, this.ctx.currentTime);
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMusicVolume(vol: number) {
    this.musicVolume = Math.max(0, Math.min(1, vol));
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
    }
  }

  public setSfxVolume(vol: number) {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
    }
  }

  // --- SOUND EFFECTS ---

  public playRacketHit(power = 1.0, isSmash = false) {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.muted) return;

    const t = this.ctx.currentTime;
    
    // Impact thwack: Bandpass filtered noise burst
    const bufferSize = this.ctx.sampleRate * 0.08;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(isSmash ? 1600 : 1200, t);
    noiseFilter.Q.setValueAtTime(3.0, t);

    const noiseGain = this.ctx.createGain();
    const noiseVol = Math.min(1.0, 0.6 * power + (isSmash ? 0.3 : 0));
    noiseGain.gain.setValueAtTime(noiseVol, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noise.start(t);

    // Resonant string vibration ping
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    const baseFreq = isSmash ? 520 : (380 + Math.random() * 40);
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, t + 0.12);

    oscGain.gain.setValueAtTime(0.5 * power, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.13);
  }

  public playBounce(speedRatio = 1.0) {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.muted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const freq = 140 + Math.min(100, speedRatio * 40);
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.09);

    const vol = Math.min(0.8, 0.45 * Math.sqrt(speedRatio));
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  public playNetHit() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.muted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(90, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.15);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  public playServeWhoosh() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.muted) return;

    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.22;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1);
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(400, t);
    filter.frequency.exponentialRampToValueAtTime(1400, t + 0.12);
    filter.frequency.exponentialRampToValueAtTime(300, t + 0.22);
    filter.Q.setValueAtTime(4, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.4, t + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(t);
  }

  public playCrowdCheer(isHuge = false) {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.muted) return;

    const t = this.ctx.currentTime;
    const duration = isHuge ? 2.5 : 1.6;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(2, bufferSize, this.ctx.sampleRate);
    
    for (let c = 0; c < 2; c++) {
      const data = buffer.getChannelData(c);
      let last = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // Pink-like filter
        last = (last * 0.94) + (white * 0.06);
        data[i] = last * 3.5;
      }
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(900, t);
    filter.Q.setValueAtTime(1.2, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(isHuge ? 0.65 : 0.4, t + 0.35);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(t);
  }

  public playCrowdOoh() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.muted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.4);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.5);
  }

  public playScoreChime() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.muted) return;

    const t = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.06);

      gain.gain.setValueAtTime(0.25, t + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.06 + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t + idx * 0.06);
      osc.stop(t + idx * 0.06 + 0.36);
    });
  }

  public playWhistle() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.muted) return;

    const t = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'sine';
    osc1.frequency.setValueAtTime(2600, t);
    osc2.frequency.setValueAtTime(2680, t); // beat effect

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGain);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.26);
    osc2.stop(t + 0.26);
  }

  public announceVoice(text: string) {
    if (this.muted) return;
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'pt-BR';
        utterance.rate = 1.15;
        utterance.pitch = 1.05;
        utterance.volume = Math.min(1.0, this.sfxVolume * 1.2);
        window.speechSynthesis.speak(utterance);
      }
    } catch {
      // Speech synth fallback
    }
  }

  // --- ENERGETIC PROCEDURAL BACKGROUND MUSIC (128 BPM SPORTS BEAT) ---

  public startMusic() {
    this.initContext();
    if (this.isMusicPlaying) return;
    this.isMusicPlaying = true;
    this.musicStep = 0;

    const bpm = 126;
    const stepDurationMs = (60 / bpm / 4) * 1000; // 16th note step

    // Chord progression in A minor: Am -> F -> C -> G
    const bassNotes = [110, 110, 87.31, 87.31, 130.81, 130.81, 98, 98]; // A2, F2, C3, G2
    const leadNotes = [440, 523.25, 659.25, 587.33, 523.25, 440, 392, 440];

    this.musicTimer = window.setInterval(() => {
      if (!this.ctx || !this.musicGain || this.muted || !this.isMusicPlaying) return;

      const t = this.ctx.currentTime;
      const step16 = this.musicStep % 16;
      const bar = Math.floor((this.musicStep / 16) % 4);

      // Kick drum on 1, 5, 9, 13 (4-on-the-floor driving sport rhythm)
      if (step16 % 4 === 0) {
        const kickOsc = this.ctx.createOscillator();
        const kickGain = this.ctx.createGain();
        kickOsc.type = 'sine';
        kickOsc.frequency.setValueAtTime(140, t);
        kickOsc.frequency.exponentialRampToValueAtTime(42, t + 0.08);

        kickGain.gain.setValueAtTime(0.5, t);
        kickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

        kickOsc.connect(kickGain);
        kickGain.connect(this.musicGain);
        kickOsc.start(t);
        kickOsc.stop(t + 0.17);
      }

      // Snare / Clap on beats 5 and 13 (step 4 and 12)
      if (step16 === 4 || step16 === 12) {
        const snareBuffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.12), this.ctx.sampleRate);
        const sData = snareBuffer.getChannelData(0);
        for (let i = 0; i < sData.length; i++) {
          sData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sData.length * 0.2));
        }
        const snareNoise = this.ctx.createBufferSource();
        snareNoise.buffer = snareBuffer;

        const sFilter = this.ctx.createBiquadFilter();
        sFilter.type = 'highpass';
        sFilter.frequency.setValueAtTime(800, t);

        const sGain = this.ctx.createGain();
        sGain.gain.setValueAtTime(0.35, t);
        sGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

        snareNoise.connect(sFilter);
        sFilter.connect(sGain);
        sGain.connect(this.musicGain);
        snareNoise.start(t);
      }

      // Offbeat Hi-Hats on odd eighth notes (steps 2, 6, 10, 14)
      if (step16 % 2 === 0) {
        const hatBuffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.04), this.ctx.sampleRate);
        const hData = hatBuffer.getChannelData(0);
        for (let i = 0; i < hData.length; i++) {
          hData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (hData.length * 0.1));
        }
        const hatNoise = this.ctx.createBufferSource();
        hatNoise.buffer = hatBuffer;

        const hFilter = this.ctx.createBiquadFilter();
        hFilter.type = 'highpass';
        hFilter.frequency.setValueAtTime(6000, t);

        const hGain = this.ctx.createGain();
        const hatVol = (step16 % 4 === 2) ? 0.22 : 0.12; // louder offbeat
        hGain.gain.setValueAtTime(hatVol, t);
        hGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

        hatNoise.connect(hFilter);
        hFilter.connect(hGain);
        hGain.connect(this.musicGain);
        hatNoise.start(t);
      }

      // Driving Bassline (Syncopated 16th notes)
      if (step16 === 0 || step16 === 3 || step16 === 6 || step16 === 8 || step16 === 10 || step16 === 14) {
        const bassOsc = this.ctx.createOscillator();
        const bassFilter = this.ctx.createBiquadFilter();
        const bassGain = this.ctx.createGain();

        const noteIndex = (bar * 2 + Math.floor(step16 / 8)) % bassNotes.length;
        const freq = bassNotes[noteIndex];

        bassOsc.type = 'sawtooth';
        bassOsc.frequency.setValueAtTime(freq, t);

        bassFilter.type = 'lowpass';
        bassFilter.frequency.setValueAtTime(450, t);
        bassFilter.frequency.exponentialRampToValueAtTime(180, t + 0.1);

        bassGain.gain.setValueAtTime(0.28, t);
        bassGain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);

        bassOsc.connect(bassFilter);
        bassFilter.connect(bassGain);
        bassGain.connect(this.musicGain);
        bassOsc.start(t);
        bassOsc.stop(t + 0.12);
      }

      // Melodic Synth Pluck / Arpeggio
      if (step16 % 4 === 2 || step16 === 7 || step16 === 15) {
        const leadOsc = this.ctx.createOscillator();
        const leadGain = this.ctx.createGain();
        const noteIdx = (this.musicStep) % leadNotes.length;
        const lFreq = leadNotes[noteIdx];

        leadOsc.type = 'triangle';
        leadOsc.frequency.setValueAtTime(lFreq, t);

        leadGain.gain.setValueAtTime(0.14, t);
        leadGain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

        leadOsc.connect(leadGain);
        leadGain.connect(this.musicGain);
        leadOsc.start(t);
        leadOsc.stop(t + 0.15);
      }

      this.musicStep++;
    }, stepDurationMs);
  }

  public stopMusic() {
    this.isMusicPlaying = false;
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  public toggleMusic(): boolean {
    if (this.isMusicPlaying) {
      this.stopMusic();
      return false;
    } else {
      this.startMusic();
      return true;
    }
  }

  public isPlayingMusic(): boolean {
    return this.isMusicPlaying;
  }
}

export const soundManager = new SoundManager();
