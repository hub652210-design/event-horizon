/**
 * CineOrbit High-End Cinematic Audio Synthesizer
 * Synthesizes deep, atmospheric space-time drones and celestial resonant sweeps
 * dynamically using the browser's Web Audio API. 
 * Supports autoplay bypassing on first click/keypress and volume controls.
 */

class CinematicAudio {
  private ctx: AudioContext | null = null;
  private primaryGain: GainNode | null = null;
  private lfo: OscillatorNode | null = null;
  private droneOscs: OscillatorNode[] = [];
  private resonantFilters: BiquadFilterNode[] = [];
  private noiseNode: AudioWorkletNode | ScriptProcessorNode | null = null;
  private isStarted = false;
  private muted = false;
  private masterVolume = 0.25; // elegant soft default volume

  constructor() {
    // Proactively register click event listener to unlock Audio Context as requested
    if (typeof window !== 'undefined') {
      const unlockEvents = ['click', 'mousedown', 'keydown', 'touchstart'];
      const unlockHandler = () => {
        this.unlockAndStart();
        unlockEvents.forEach(evt => window.removeEventListener(evt, unlockHandler));
      };
      unlockEvents.forEach(evt => window.addEventListener(evt, unlockHandler, { passive: true }));
    }
  }

  /**
   * Safe initialization of Audio Context and Synth nodes
   */
  private init() {
    if (this.ctx) return;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      console.warn('CineOrbit Audio: Web Audio API is not supported in this browser environment.');
      return;
    }

    this.ctx = new AudioContextClass();
    this.primaryGain = this.ctx.createGain();
    this.primaryGain.gain.setValueAtTime(this.muted ? 0 : this.masterVolume, this.ctx.currentTime);
    this.primaryGain.connect(this.ctx.destination);
  }

  /**
   * Unlock AudioContext and begin playing synthesized cinematic cosmic drone
   */
  private async unlockAndStart() {
    try {
      this.init();
      if (!this.ctx) return;

      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }

      if (!this.isStarted) {
        this.startCinematicSynth();
      }
    } catch (err) {
      console.error('CineOrbit Audio AutoPlay Unlock error:', err);
    }
  }

  /**
   * Triggers the continuous cinematic space synthesis
   */
  private startCinematicSynth() {
    const ctx = this.ctx;
    const gainNode = this.primaryGain;
    if (!ctx || !gainNode || this.isStarted) return;

    this.isStarted = true;

    try {
      const now = ctx.currentTime;

      // 1. COSMIC SPACESHIP DEEP HUM (Detuned Low Frequencies)
      // Detuned sine and triangle base at Sub C (~32Hz and ~48Hz) for beautiful sub-bass chest presence
      const freq1 = 32.70; // C1
      const freq2 = 49.00; // G1

      const osc1 = ctx.createOscillator();
      const osc1Gain = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(freq1, now);
      osc1Gain.gain.setValueAtTime(0.4, now); // strong humble base
      osc1.connect(osc1Gain);
      osc1Gain.connect(gainNode);

      const osc2 = ctx.createOscillator();
      const osc2Gain = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq2 + 0.35, now); // Slight detuned offset
      osc2Gain.gain.setValueAtTime(0.2, now);
      osc2.connect(osc2Gain);
      osc2Gain.connect(gainNode);

      this.droneOscs.push(osc1, osc2);
      osc1.start(now);
      osc2.start(now);

      // 2. CELESTIAL RESONANT SWEEPS (Minor 7th Cinematic Atmosphere)
      // Generates atmospheric chord sweeps pulsing slowly over 15-20 second intervals
      // Chord: C3, G3, Bb3, D4, Eb4
      const chord = [130.81, 196.00, 233.08, 293.66, 311.13];
      
      chord.forEach((freq, idx) => {
        const chordOsc = ctx.createOscillator();
        const chordGain = ctx.createGain();
        const fFilter = ctx.createBiquadFilter();

        chordOsc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        chordOsc.frequency.setValueAtTime(freq, now);

        // Low Pass resonant filter to isolate frequencies
        fFilter.type = 'lowpass';
        fFilter.Q.setValueAtTime(8, now); // Resonant flavor peak
        fFilter.frequency.setValueAtTime(freq * 1.5, now);

        // Slow pulsing gain lfo style
        chordGain.gain.setValueAtTime(0.0, now);

        chordOsc.connect(fFilter);
        fFilter.connect(chordGain);
        chordGain.connect(gainNode);

        // Start slow automated loop for each note to make sweeps overlapping
        this.runPulsingAutomation(chordGain.gain, fFilter.frequency, freq, idx);

        this.droneOscs.push(chordOsc);
        this.resonantFilters.push(fFilter);
        chordOsc.start(now);
      });

      // 3. SOLAR WIND COSMIC HISS
      // Standard pink/white noise simulation through script processor to emulate gentle room space atmosphere
      if (ctx.createScriptProcessor) {
        const processor = ctx.createScriptProcessor(4096, 1, 1);
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.04, now); // extremely subtle

        // Soft bandpass filter center around 1.2kHz for gentle air sound
        const bpFilter = ctx.createBiquadFilter();
        bpFilter.type = 'bandpass';
        bpFilter.Q.setValueAtTime(1.0, now);
        bpFilter.frequency.setValueAtTime(1200, now);

        processor.onaudioprocess = (e) => {
          const output = e.outputBuffer.getChannelData(0);
          for (let i = 0; i < output.length; i++) {
            // White noise generation
            output[i] = Math.random() * 2 - 1;
          }
        };

        processor.connect(bpFilter);
        bpFilter.connect(noiseGain);
        noiseGain.connect(gainNode);

        this.noiseNode = processor;
        
        // Automated slow cutoff filter sweep for wind gusting effect
        this.runWindAutomation(bpFilter.frequency);
      }

    } catch (err) {
      console.warn('Failed to start Cinematic Audio generators:', err);
    }
  }

  /**
   * Pulses gain and resonant frequency automated to synthesize swelling, breathing pad chords
   */
  private runPulsingAutomation(
    gainParam: AudioParam, 
    freqParam: AudioParam, 
    baseFreq: number, 
    index: number
  ) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    
    const pulseCycle = () => {
      if (!this.isStarted || !this.ctx) return;
      const now = ctx.currentTime;
      
      // Detuned delay offsets for cinematic evolution
      const cycleDuration = 12 + index * 3.5;
      const activeDuration = cycleDuration * 0.45;
      
      // Gain Envelope
      gainParam.setValueAtTime(0.001, now);
      gainParam.exponentialRampToValueAtTime(0.04 + (4 - index) * 0.015, now + activeDuration); 
      gainParam.exponentialRampToValueAtTime(0.001, now + cycleDuration);

      // Resonant Cutoff Filter Sweep Envelope
      freqParam.setValueAtTime(baseFreq * 1.1, now);
      freqParam.exponentialRampToValueAtTime(baseFreq * 3.5, now + activeDuration);
      freqParam.exponentialRampToValueAtTime(baseFreq * 1.1, now + cycleDuration);

      setTimeout(pulseCycle, cycleDuration * 1000);
    };

    pulseCycle();
  }

  /**
   * Synthesizes slow shifting wind currents
   */
  private runWindAutomation(freqParam: AudioParam) {
    if (!this.ctx) return;
    const ctx = this.ctx;

    const windCycle = () => {
      if (!this.isStarted || !this.ctx) return;
      const now = ctx.currentTime;
      const duration = 18 + Math.random() * 8;
      
      freqParam.setValueAtTime(600 + Math.random() * 300, now);
      freqParam.exponentialRampToValueAtTime(1400 + Math.random() * 400, now + duration * 0.5);
      freqParam.exponentialRampToValueAtTime(600 + Math.random() * 300, now + duration);

      setTimeout(windCycle, duration * 1000);
    };

    windCycle();
  }

  /**
   * Set general mute status
   */
  public setMuted(muted: boolean) {
    this.muted = muted;
    if (this.primaryGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.primaryGain.gain.setValueAtTime(muted ? 0 : this.masterVolume, now);
    }
  }

  /**
   * Toggle mute and return state
   */
  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  /**
   * Returns current mute status
   */
  public getMuteStatus(): boolean {
    return this.muted;
  }

  /**
   * Master triggers to forcefully wake up / start on loading
   */
  public forceStart() {
    this.unlockAndStart();
  }

  /**
   * Full cleanup on logout or destroy
   */
  public stop() {
    try {
      this.isStarted = false;
      this.droneOscs.forEach(o => {
        try { o.stop(); } catch(e){}
      });
      this.droneOscs = [];
      this.resonantFilters = [];
      if (this.noiseNode) {
        this.noiseNode.disconnect();
        this.noiseNode = null;
      }
      if (this.ctx) {
        this.ctx.close();
        this.ctx = null;
        this.primaryGain = null;
      }
    } catch (e) {
      console.warn('Error closing cinematic synthesizer loops:', e);
    }
  }
}

// Single instanced global coordinator
export const cinematicAudio = new CinematicAudio();
