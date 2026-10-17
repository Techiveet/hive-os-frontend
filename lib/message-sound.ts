/** One short chime per received message, shared by websocket and poll delivery. */
let audio: AudioContext | null = null;
let lastPlayed = 0;
const seen = new Set<string>();

export function unlockMessageSound(): void {
  try {
    audio ??= new AudioContext();
    if (audio.state === "suspended") void audio.resume().catch(() => {});
  } catch {
    // Browsers without Web Audio still receive visual notifications.
  }
}

export function playMessageSound(key: string): void {
  if (seen.has(key)) return;
  seen.add(key);
  if (seen.size > 512) seen.delete(seen.values().next().value!);
  if (!audio || audio.state !== "running" || Date.now() - lastPlayed < 800) return;
  lastPlayed = Date.now();
  try {
    const start = audio.currentTime;
    const oscillator = audio.createOscillator();
    const volume = audio.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(740, start);
    oscillator.frequency.setValueAtTime(988, start + 0.09);
    volume.gain.setValueAtTime(0, start);
    volume.gain.linearRampToValueAtTime(0.08, start + 0.015);
    volume.gain.exponentialRampToValueAtTime(0.001, start + 0.24);
    oscillator.connect(volume);
    volume.connect(audio.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.25);
    oscillator.onended = () => { oscillator.disconnect(); volume.disconnect(); };
  } catch {
    // A suspended audio device must not interrupt chat delivery.
  }
}
