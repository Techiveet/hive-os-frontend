import assert from "node:assert/strict";
import { playMessageSound, unlockMessageSound } from "../lib/message-sound";

let starts = 0;
let clock = 10000;
const originalNow = Date.now;
Date.now = () => clock;
class TestAudioContext {
  state = "running";
  currentTime = 0;
  destination = {};
  resume() { return Promise.resolve(); }
  createOscillator() {
    return { type: "", frequency: { setValueAtTime() {} }, connect() {}, disconnect() {}, start() { starts++; }, stop() {}, onended: null };
  }
  createGain() {
    return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() {} };
  }
}
Object.assign(globalThis, { AudioContext: TestAudioContext });
try {
  playMessageSound("before-interaction");
  assert.equal(starts, 0, "Never create or play audio before user interaction");
  unlockMessageSound();
  playMessageSound("visitor:reply-1");
  assert.equal(starts, 1);
  clock += 1000;
  playMessageSound("visitor:reply-1");
  assert.equal(starts, 1, "Socket + poll duplicate must not replay a chime");
  playMessageSound("staff:notification-1");
  assert.equal(starts, 2, "A separate received message plays");
  playMessageSound("staff:burst-message");
  assert.equal(starts, 2, "Burst delivery is rate limited");
  clock += 1000;
  playMessageSound("staff:burst-message");
  assert.equal(starts, 2, "Suppressed burst must not replay later");
  playMessageSound("visitor:reply-2");
  assert.equal(starts, 3);
  console.log("PASS: gesture gate, received-message sound, duplicate and burst protection");
} finally {
  Date.now = originalNow;
}
