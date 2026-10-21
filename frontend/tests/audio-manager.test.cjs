const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const frontend = path.resolve(__dirname, '..');
const soundsSource = fs.readFileSync(path.join(frontend, 'sounds.js'), 'utf8');

function hasMpegFrame(filePath) {
  const bytes = fs.readFileSync(filePath);
  const hasId3 = bytes.subarray(0, 3).toString() === 'ID3';
  const frameOffset = hasId3
    ? 10 + ((bytes[6] & 0x7f) << 21) + ((bytes[7] & 0x7f) << 14) + ((bytes[8] & 0x7f) << 7) + (bytes[9] & 0x7f)
    : 0;
  return bytes[frameOffset] === 0xff && (bytes[frameOffset + 1] & 0xe0) === 0xe0;
}

function createSoundManager({ saved = 'on', resumeReject = false } = {}) {
  const pageListeners = new Map();
  const dispatched = [];
  const tracks = [];
  const oscillators = [];
  const attrs = new Map();
  const buttonListeners = new Map();
  const button = {
    title: '',
    textContent: '',
    setAttribute(name, value) { attrs.set(name, String(value)); },
    getAttribute(name) { return attrs.get(name) ?? null; },
    removeAttribute(name) { attrs.delete(name); },
    querySelector() { return null; },
    addEventListener(name, handler) { buttonListeners.set(name, handler); },
    click() { buttonListeners.get('click')?.(); },
  };
  class MockAudio {
    constructor(url) {
      this.src = url;
      this.paused = true;
      this.volume = 0;
      this.playCount = 0;
      this.pauseCount = 0;
      this.events = new Map();
      tracks.push(this);
    }
    play() { this.playCount += 1; this.paused = false; return Promise.resolve(); }
    pause() { this.pauseCount += 1; this.paused = true; }
    addEventListener(name, handler) { this.events.set(name, handler); }
    emit(name) { this.events.get(name)?.(); }
  }
  class MockAudioContext {
    constructor() { this.state = 'suspended'; this.currentTime = 0; this.sampleRate = 44100; this.destination = {}; }
    createGain() {
      return { gain: { value: 0, setTargetAtTime() {}, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} };
    }
    createOscillator() {
      const oscillator = { frequency: { setValueAtTime() {} }, connect() {}, start() {}, stop() {} };
      oscillators.push(oscillator);
      return oscillator;
    }
    resume() {
      if (resumeReject) return Promise.reject(Object.assign(new Error('blocked'), { name: 'NotAllowedError' }));
      this.state = 'running';
      return Promise.resolve();
    }
    close() { this.state = 'closed'; return Promise.resolve(); }
  }
  const window = {
    AudioContext: MockAudioContext,
    DearPipSounds: undefined,
    addEventListener(name, handler, options) {
      if (!pageListeners.has(name)) pageListeners.set(name, []);
      pageListeners.get(name).push({ handler, once: Boolean(options?.once) });
    },
    dispatchEvent(event) { dispatched.push(event); },
  };
  const document = {
    baseURI: 'https://example.test/',
    documentElement: { dataset: { mood: 'night' } },
    body: { dataset: { mood: 'night' }, classList: { contains: () => false } },
    querySelector(selector) { return selector === '#soundToggle' ? button : null; },
  };
  const localStorage = {
    getItem() { return saved; },
    setItem(_key, value) { saved = value; },
  };
  const context = {
    window, document, localStorage, Audio: MockAudio, URL, CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options?.detail; } },
    performance: { now: () => 1000 },
    requestAnimationFrame: () => 1,
    cancelAnimationFrame() {},
    console: { info() {}, error() {} },
    Object, Math, Set, WeakSet, Promise,
  };
  vm.runInNewContext(soundsSource, context, { filename: 'sounds.js' });
  function dispatchPageEvent(name) {
    const listeners = pageListeners.get(name) || [];
    for (const entry of [...listeners]) {
      entry.handler();
      if (entry.once) listeners.splice(listeners.indexOf(entry), 1);
    }
  }
  return { window, button, tracks, oscillators, attrs, dispatched, dispatchPageEvent, getSaved: () => saved };
}

test('all page and shared audio paths resolve, and decorative media does not autoplay', () => {
  const pages = fs.readdirSync(frontend).filter((name) => name.endsWith('.html'));
  assert.ok(pages.length >= 7, 'all project pages are included in the audit');
  for (const page of pages) {
    const html = fs.readFileSync(path.join(frontend, page), 'utf8');
    for (const [, asset] of html.matchAll(/<audio\b[^>]*\bsrc="([^"]+)"/g)) {
      assert.ok(fs.existsSync(path.join(frontend, asset)), `${page} references missing audio ${asset}`);
      assert.doesNotMatch(html.match(new RegExp(`<audio\\b[^>]*src="${asset.replaceAll('.', '\\.')}"[^>]*>`))?.[0] || '', /\bautoplay\b/);
    }
  }
  for (const asset of ['assets/day-ambience.mp3', 'assets/night-ambience.mp3']) {
    assert.ok(fs.existsSync(path.join(frontend, asset)), `shared ambience ${asset} exists`);
    assert.ok(hasMpegFrame(path.join(frontend, asset)), `shared ambience ${asset} contains an MPEG audio frame`);
  }
  const lullabyManifest = JSON.parse(fs.readFileSync(path.join(frontend, 'assets/lullaby-lab/audio/asset-manifest.json'), 'utf8'));
  for (const recording of lullabyManifest.recordings) {
    assert.ok(fs.existsSync(path.join(frontend, recording.localPath)), `${recording.layer} path resolves`);
  }
  for (const [, name] of soundsSource.matchAll(/makeAmbienceTrack\('([^']+)'\)/g)) {
    assert.ok(fs.existsSync(path.join(frontend, 'assets', name)), `shared ambience ${name} exists`);
  }
});

test('saved sound-on preference does not start audio until a user gesture', async () => {
  const manager = createSoundManager({ saved: 'on' });
  assert.equal(manager.button.getAttribute('aria-pressed'), 'true');
  assert.match(manager.button.textContent, /Sound on/);
  assert.equal(manager.tracks.length, 2);
  assert.equal(manager.tracks.reduce((sum, track) => sum + track.playCount, 0), 0);
  manager.window.DearPipSounds.setAmbienceTheme('night');
  assert.equal(manager.tracks.reduce((sum, track) => sum + track.playCount, 0), 0, 'theme initialization does not start ambience');
  manager.dispatchPageEvent('pointerdown');
  await Promise.resolve();
  assert.equal(manager.tracks.reduce((sum, track) => sum + track.playCount, 0), 1);
  manager.window.DearPipSounds.setAmbienceTheme('dawn');
  await Promise.resolve();
  assert.equal(manager.tracks.reduce((sum, track) => sum + track.playCount, 0), 2, 'theme change crossfades to its own track');
});

test('shared mute state stops and restarts ambience only on the sound control gesture', async () => {
  const manager = createSoundManager({ saved: 'off' });
  assert.equal(manager.button.getAttribute('aria-pressed'), 'false');
  assert.match(manager.button.textContent, /Sound off/);
  manager.button.click();
  assert.equal(manager.getSaved(), 'on');
  assert.equal(manager.button.getAttribute('aria-pressed'), 'true');
  await Promise.resolve();
  assert.equal(manager.tracks.reduce((sum, track) => sum + track.playCount, 0), 1);
  manager.button.click();
  assert.equal(manager.getSaved(), 'off');
  assert.equal(manager.button.getAttribute('aria-pressed'), 'false');
  assert.ok(manager.tracks.every((track) => track.paused && track.volume === 0));
});

test('shared mute subscription publishes the authoritative muted state on initialization and changes', () => {
  const manager = createSoundManager({ saved: 'off' });
  const states = [];
  const unsubscribe = manager.window.DearPipSounds.subscribeMute((muted) => states.push(muted));

  assert.equal(manager.window.DearPipSounds.isMuted(), true);
  assert.deepEqual(states, [true], 'an initially disabled shared control is reported as muted');

  manager.button.click();
  assert.equal(manager.window.DearPipSounds.isMuted(), false);
  assert.deepEqual(states, [true, false], 'enabling shared sound reports unmuted without ambiguous inversion');

  manager.button.click();
  assert.equal(manager.window.DearPipSounds.isMuted(), true);
  assert.deepEqual(states, [true, false, true]);
  unsubscribe();
  manager.button.click();
  assert.deepEqual(states, [true, false, true], 'unsubscribed listeners no longer receive updates');
});

test('effect playback reports a rejected resume and returns failure instead of false success', async () => {
  const manager = createSoundManager({ saved: 'on', resumeReject: true });
  const played = await manager.window.DearPipSounds.play('theme-toggle');
  assert.equal(played, false);
  const failure = manager.dispatched.find((event) => event.type === 'dearpip:sounderror');
  assert.ok(failure);
  assert.equal(failure.detail.errorName, 'NotAllowedError');
  assert.match(manager.button.getAttribute('aria-description'), /could not play/);
});

test('effect playback schedules its registered notes once after a successful resume', async () => {
  const manager = createSoundManager({ saved: 'on' });
  const pending = manager.window.DearPipSounds.play('theme-toggle');
  assert.equal(manager.window.DearPipSounds.play('theme-toggle'), false, 'rapid duplicate cues are suppressed');
  const played = await pending;
  assert.equal(played, true);
  assert.equal(manager.oscillators.length, 2);
  assert.equal(manager.button.getAttribute('aria-description'), null);
  manager.dispatchPageEvent('pagehide');
  assert.ok(manager.tracks.every((track) => track.paused));
  const refreshed = createSoundManager({ saved: manager.getSaved() });
  assert.equal(refreshed.tracks.reduce((sum, track) => sum + track.playCount, 0), 0, 'refresh does not leave stale audio playing');
});

test('missing or undecodable shared ambience reports an accessible error', () => {
  const manager = createSoundManager({ saved: 'on' });
  manager.tracks[0].error = { message: 'missing asset' };
  manager.tracks[0].emit('error');
  const failure = manager.dispatched.find((event) => event.type === 'dearpip:sounderror');
  assert.ok(failure);
  assert.match(failure.detail.label, /day-ambience\.mp3/);
  assert.match(manager.button.getAttribute('aria-description'), /could not play/);
});
