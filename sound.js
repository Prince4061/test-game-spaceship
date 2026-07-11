// sound.js - Web Audio API Sound Synthesizer for Cosmic Vanguard

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.bgmNode = null;
        this.bgmOscs = [];
        this.bgmGain = null;
        this.isBgmPlaying = false;
        this.masterVolume = 0.3; // Default master volume
    }

    init() {
        if (this.ctx) return;
        // Initialize AudioContext
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContextClass();
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        if (this.muted) {
            if (this.bgmGain) {
                this.bgmGain.gain.setValueAtTime(0, this.ctx.currentTime);
            }
        } else {
            if (this.bgmGain) {
                this.bgmGain.gain.setValueAtTime(0.08 * this.masterVolume, this.ctx.currentTime);
            }
        }
        return this.muted;
    }

    // Play standard laser shoot sound
    playLaser(type = 'default') {
        if (this.muted || !this.ctx) return;
        this.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        const now = this.ctx.currentTime;

        if (type === 'heavy') {
            // Low-pitch powerful blast
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(280, now);
            osc.frequency.exponentialRampToValueAtTime(40, now + 0.3);
            
            gain.gain.setValueAtTime(0.3 * this.masterVolume, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            
            osc.start(now);
            osc.stop(now + 0.3);
        } else if (type === 'rapid') {
            // Short high-pitched zap
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(150, now + 0.1);
            
            gain.gain.setValueAtTime(0.15 * this.masterVolume, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            
            osc.start(now);
            osc.stop(now + 0.1);
        } else {
            // Default laser
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(80, now + 0.18);
            
            gain.gain.setValueAtTime(0.2 * this.masterVolume, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
            
            osc.start(now);
            osc.stop(now + 0.18);
        }
    }

    // Play explosion sound using synthesized noise
    playExplosion(intensity = 'medium') {
        if (this.muted || !this.ctx) return;
        this.resume();

        const now = this.ctx.currentTime;
        let duration = 0.4;
        let noiseVolume = 0.3;
        let rumbleFreq = 100;

        if (intensity === 'large') {
            duration = 1.0;
            noiseVolume = 0.5;
            rumbleFreq = 60;
        } else if (intensity === 'small') {
            duration = 0.2;
            noiseVolume = 0.15;
            rumbleFreq = 200;
        }

        // Generate white noise buffer
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noiseNode = this.ctx.createBufferSource();
        noiseNode.buffer = buffer;

        // Low-pass filter to give it an explosion "thump"
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(rumbleFreq * 4, now);
        filter.frequency.exponentialRampToValueAtTime(20, now + duration);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(noiseVolume * this.masterVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        // Add a low oscillator rumble for heavy explosions
        if (intensity === 'large' || intensity === 'medium') {
            const osc = this.ctx.createOscillator();
            const oscGain = this.ctx.createGain();
            
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(rumbleFreq, now);
            osc.frequency.linearRampToValueAtTime(20, now + duration * 0.8);
            
            oscGain.gain.setValueAtTime(0.4 * this.masterVolume, now);
            oscGain.gain.exponentialRampToValueAtTime(0.01, now + duration * 0.8);
            
            osc.connect(oscGain);
            oscGain.connect(filter);
            
            osc.start(now);
            osc.stop(now + duration * 0.8);
        }

        noiseNode.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        noiseNode.start(now);
        noiseNode.stop(now + duration);
    }

    // Play player damage hit sound
    playHit() {
        if (this.muted || !this.ctx) return;
        this.resume();

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(30, now + 0.15);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(180, now);

        gain.gain.setValueAtTime(0.4 * this.masterVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.15);
    }

    // Play power-up collected sound (rising arpeggio)
    playPowerUp() {
        if (this.muted || !this.ctx) return;
        this.resume();

        const now = this.ctx.currentTime;
        const notes = [261.63, 329.63, 392.00, 523.25, 659.25]; // C E G C E
        
        notes.forEach((freq, index) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + index * 0.06);
            
            gain.gain.setValueAtTime(0.0, now);
            gain.gain.setValueAtTime(0.12 * this.masterVolume, now + index * 0.06);
            gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.06 + 0.25);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start(now + index * 0.06);
            osc.stop(now + index * 0.06 + 0.25);
        });
    }

    // Play UI button click
    playClick() {
        if (this.muted || !this.ctx) return;
        this.resume();

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(1000, now);
        osc.frequency.setValueAtTime(2000, now + 0.02);

        gain.gain.setValueAtTime(0.08 * this.masterVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.05);
    }

    // Play screen-clear bomb sound (deep dropping resonance)
    playBomb() {
        if (this.muted || !this.ctx) return;
        this.resume();

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 1.2);

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(150, now);
        osc2.frequency.linearRampToValueAtTime(20, now + 1.2);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, now);
        filter.frequency.exponentialRampToValueAtTime(40, now + 1.2);

        gain.gain.setValueAtTime(0.5 * this.masterVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

        osc.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc2.start(now);
        osc.stop(now + 1.2);
        osc2.stop(now + 1.2);
    }

    // Synthesize background ambient spatial music
    startBGM() {
        if (this.isBgmPlaying || !this.ctx) return;
        this.resume();
        this.isBgmPlaying = true;

        this.bgmGain = this.ctx.createGain();
        this.bgmGain.gain.setValueAtTime(this.muted ? 0 : 0.08 * this.masterVolume, this.ctx.currentTime);
        this.bgmGain.connect(this.ctx.destination);

        const playSpaceChord = () => {
            if (!this.isBgmPlaying) return;

            const now = this.ctx.currentTime;
            
            // Retro minor chords (C min 9, F min 9, G min 9, Ab maj 7)
            const chords = [
                [130.81, 155.56, 196.00, 233.08, 293.66], // C3, Eb3, G3, Bb3, D4
                [174.61, 207.65, 261.63, 311.13, 392.00], // F3, Ab3, C4, Eb4, G4
                [196.00, 233.08, 293.66, 349.23, 440.00], // G3, Bb3, D4, F4, A4
                [207.65, 261.63, 311.13, 392.00, 466.16]  // Ab3, C4, Eb4, G4, Bb4
            ];
            
            // Select random chord from space progression
            const chord = chords[Math.floor(Math.random() * chords.length)];
            const chordOscs = [];

            chord.forEach((freq, idx) => {
                const osc = this.ctx.createOscillator();
                const oscGain = this.ctx.createGain();
                
                // Slow ambient swell
                osc.type = (idx % 2 === 0) ? 'sine' : 'triangle';
                osc.frequency.setValueAtTime(freq, now);
                
                // Add minor vibrato
                const lfo = this.ctx.createOscillator();
                const lfoGain = this.ctx.createGain();
                lfo.frequency.value = 1 + Math.random() * 2; // 1-3Hz
                lfoGain.gain.value = freq * 0.008; // subtle
                lfo.connect(lfoGain);
                lfoGain.connect(osc.frequency);
                lfo.start(now);
                
                oscGain.gain.setValueAtTime(0, now);
                oscGain.gain.linearRampToValueAtTime(0.2, now + 1.5 + Math.random() * 0.5); // Slow attack
                oscGain.gain.setValueAtTime(0.2, now + 4.5);
                oscGain.gain.exponentialRampToValueAtTime(0.001, now + 6.0); // Slow decay
                
                osc.connect(oscGain);
                oscGain.connect(this.bgmGain);
                
                osc.start(now);
                osc.stop(now + 6.0);
                lfo.stop(now + 6.0);

                chordOscs.push(osc);
            });

            this.bgmOscs = chordOscs;

            // Schedule the next chord in 5.2 seconds for overlay crossfade
            this.bgmTimeout = setTimeout(playSpaceChord, 5200);
        };

        playSpaceChord();
    }

    stopBGM() {
        this.isBgmPlaying = false;
        if (this.bgmTimeout) clearTimeout(this.bgmTimeout);
        this.bgmOscs.forEach(osc => {
            try { osc.stop(); } catch(e) {}
        });
        this.bgmOscs = [];
        if (this.bgmGain) {
            this.bgmGain.disconnect();
            this.bgmGain = null;
        }
    }
}

// Export a single instance
window.sound = new SoundEngine();
export default window.sound;
