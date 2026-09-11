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

export const playRiff = (accurate: boolean) => {
  const audio = getContext();
  if (!audio) return;
  resumeAudio(audio);
  const start = audio.currentTime;
  note(accurate ? 392 : 233, start, 0.16, 0.06);
  if (accurate) note(523, start + 0.09, 0.22, 0.05);
};

export const playOutcome = (caught: boolean) => {
  const audio = getContext();
  if (!audio) return;
  resumeAudio(audio);
  const start = audio.currentTime;
  const notes = caught ? [392, 494, 587] : [247, 196];
  notes.forEach((frequency, index) => note(frequency, start + index * 0.12, 0.2, 0.05));
};
