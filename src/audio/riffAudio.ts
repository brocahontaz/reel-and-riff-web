let context: AudioContext | undefined;

const getContext = (): AudioContext | undefined => {
  if (context) return context;
  try {
    const constructors = globalThis as typeof globalThis & {
      webkitAudioContext?: typeof AudioContext;
    };
    const AudioContextConstructor = globalThis.AudioContext ?? constructors.webkitAudioContext;
    if (!AudioContextConstructor) return undefined;
    context = new AudioContextConstructor();
    return context;
  } catch {
    return undefined;
  }
};

export const resumeAudio = (audio: Pick<AudioContext, 'state' | 'resume'>) => {
  if (audio.state === 'suspended') void audio.resume().catch(() => undefined);
};

const note = (frequency: number, start: number, duration: number, volume: number) => {
  const audio = getContext();
  if (!audio) return;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = 'triangle';
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
};

/**
 * A rising riff: each consecutive on-beat hit climbs one semitone (capped), so
 * a clean fight sounds like a melody climbing toward the catch.
 */
export const playRiff = (accurate: boolean, combo = 0) => {
  const audio = getContext();
  if (!audio) return;
  resumeAudio(audio);
  const step = Math.max(0, Math.min(8, Math.round(combo)));
  const root = 392 * Math.pow(2, step / 12);
  const start = audio.currentTime;
  note(accurate ? root : 233, start, 0.16, 0.06);
  if (accurate) note(root * 1.3346, start + 0.09, 0.22, 0.05);
};

export const playCoins = () => {
  const audio = getContext();
  if (!audio) return;
  resumeAudio(audio);
  const start = audio.currentTime;
  note(880, start, 0.12, 0.04);
  note(1318, start + 0.08, 0.18, 0.035);
};

export const playOutcome = (caught: boolean) => {
  const audio = getContext();
  if (!audio) return;
  resumeAudio(audio);
  const start = audio.currentTime;
  const notes = caught ? [392, 494, 587] : [247, 196];
  notes.forEach((frequency, index) => note(frequency, start + index * 0.12, 0.2, 0.05));
};
