const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const frontend = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(frontend, 'lullaby-lab.html'), 'utf8');
const script = fs.readFileSync(path.join(frontend, 'lullaby-lab.js'), 'utf8');
const css = fs.readFileSync(path.join(frontend, 'style.css'), 'utf8');
const manifestPath = path.join(frontend, 'assets', 'lullaby-lab', 'audio', 'asset-manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

function hasMpegFrame(filePath) {
  const bytes = fs.readFileSync(filePath);
  const hasId3 = bytes.subarray(0, 3).toString() === 'ID3';
  const frameOffset = hasId3
    ? 10 + ((bytes[6] & 0x7f) << 21) + ((bytes[7] & 0x7f) << 14) + ((bytes[8] & 0x7f) << 7) + (bytes[9] & 0x7f)
    : 0;
  return bytes[frameOffset] === 0xff && (bytes[frameOffset + 1] & 0xe0) === 0xe0;
}

test('Lullaby Lab registers all five installed recordings and keeps tones enabled', () => {
  for (const layer of ['rain', 'wind', 'crickets', 'fireplace', 'tones']) {
    assert.match(html, new RegExp(`data-audio-layer="${layer}"`));
  }
  for (const id of ['lullabyPlay', 'lullabyPause', 'lullabyStop', 'lullabyVolume', 'lullabySleepTimer']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  for (const minutes of [5, 15, 30, 60]) assert.match(html, new RegExp(`value="${minutes}"`));

  const expected = {
    rain: 'rain.mp3',
    wind: 'soft-wind.mp3',
    crickets: 'nighttime-crickets.mp3',
    fireplace: 'fireplace.mp3',
    tones: 'gentle-lullaby-tones.mp3',
  };
  for (const [layer, filename] of Object.entries(expected)) {
    const row = html.match(new RegExp(`<div class="lullaby-layer" data-audio-layer="${layer}">([\\s\\S]*?)<audio\\b([^>]*)>`));
    assert.ok(row, `${layer} row and audio element must exist`);
    assert.match(row[1], new RegExp(`data-layer-toggle="${layer}"(?![^>]*disabled)`));
    assert.match(row[1], /data-layer-volume="[^"]+"(?![^>]*disabled)/);
    assert.match(row[2], new RegExp(`src="assets/lullaby-lab/audio/normalized/${filename}"`));
    assert.match(row[2], /preload="none"/);
    assert.match(row[2], /\bloop\b/);
    const audioPath = path.join(frontend, 'assets', 'lullaby-lab', 'audio', 'normalized', filename);
    assert.ok(fs.existsSync(audioPath), `${filename} must exist`);
    assert.ok(hasMpegFrame(audioPath), `${filename} must contain an MPEG audio frame after its ID3 tag`);
  }
  const tones = html.match(/<div class="lullaby-layer" data-audio-layer="tones">([\s\S]*?)<\/div>/)?.[1] || '';
  assert.match(tones, /Gentle Lullaby Tones/);
  assert.match(tones, /data-layer-toggle="tones"(?![^>]*disabled)/);
  assert.match(tones, /data-layer-volume="[^"]+"(?![^>]*disabled)/);
  assert.match(tones, /src="assets\/lullaby-lab\/audio\/normalized\/gentle-lullaby-tones\.mp3"/);

  assert.match(script, /new AudioContextConstructor\(\)/);
  assert.match(script, /async function playMixer\(\)/);
  assert.match(script, /async function ensureAudioContext\(\)/);
  assert.match(script, /dear-pip-lullaby-mixer-v2/);
  assert.match(script, /startSleepTimer\(Number\(sleepTimer\.value\) \* 60000\)/);
  assert.match(script, /createMediaElementSource\(media\)/);
  assert.match(script, /gain\.connect\(masterGain\)/);
  assert.match(script, /masterGain\.gain\.setTargetAtTime\(siteMuted \? 0 : Number\(masterVolume\.value\)/);
  assert.match(script, /async function startMediaLayer\(layer\)/);
  assert.match(script, /await layer\.media\.play\(\)/);
  assert.match(script, /Promise\.all\(availableEnabled\.map/);
  assert.match(script, /media\?\.addEventListener\('error'/);
  assert.match(script, /function pauseMixer\(\)/);
  assert.match(script, /function stopMixer\(/);
  assert.match(script, /if \(toneLayer\?\.toggle\.checked && !toneLayer\.media\) playMixerTone\(\)/);
  assert.match(script, /function resetMixer\(\)/);
  assert.match(html, /id="lullabyReset"[^>]*>Reset mix/);
  assert.match(script, /let mixerState = 'stopped'/);
  assert.doesNotMatch(script, /let mixerPlaying|let mixerPaused/);
});

test('contained scene selector uses the available art and never starts audio on scene change', () => {
  const scenes = [...html.matchAll(/data-scene-(?:select|backdrop)="([^"]+)"/g)].map((match) => match[1]);
  const sceneButtons = [...html.matchAll(/data-scene-select="([^"]+)"/g)].map((match) => match[1]);
  const backdrops = [...html.matchAll(/data-scene-backdrop="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(sceneButtons, ['sleeping', 'rain', 'wind', 'fireplace']);
  assert.deepEqual(backdrops, ['sleeping', 'rain', 'wind', 'fireplace']);
  assert.equal(scenes.length, 8);

  const expectedImages = {
    sleeping: 'assets/lullaby-lab/images/pip_room_sleeping.jpg',
    rain: 'assets/lullaby-lab/images/pip_room_rain.png',
    wind: 'assets/lullaby-lab/images/pip_room_wind.png',
    fireplace: 'assets/lullaby-lab/images/pip_room_fireplace.png',
  };
  for (const [scene, asset] of Object.entries(expectedImages)) {
    assert.ok(fs.existsSync(path.join(frontend, asset)), `${asset} must exist`);
    assert.match(html, new RegExp(`data-scene-backdrop="${scene}"><img src="${asset.replaceAll('.', '\\.')}"`));
  }
  assert.equal(new Set(Object.values(expectedImages)).size, 4, 'each room uses its own matching illustration');

  assert.match(script, /sceneButtons\.forEach\(\(button\) => \{[\s\S]*?selectScene\(button\.dataset\.sceneSelect\)/);
  const selection = script.match(/function selectScene\(scene, announce = true\) \{[\s\S]*?\n\}/)?.[0] || '';
  assert.ok(selection);
  assert.match(selection, /classList\.toggle\('is-active'/);
  assert.doesNotMatch(selection, /playMixer\(|\.play\(/, 'choosing a scene must not autoplay ambience');
  assert.match(css, /\.lullaby-stage__backdrop\.is-active \{ opacity: 1; \}/);
  assert.match(html, /<body class="atlas-page lullaby-page">/);
  assert.match(html, /class="garden-day-atmosphere"/);
  assert.match(css, /\.lullaby-header \{[^}]*position: relative/);
  assert.match(css, /\.lullaby-main \{[^}]*width: min\(100% - 48px, 1280px\)/);
  assert.match(css, /\.lullaby-stage \{[^}]*aspect-ratio: 3 \/ 2/);
  assert.doesNotMatch(css, /\.lullaby-stage \{[^}]*height:\s*100dvh/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*?\.lullaby-scenes/);
});

test('light-mode background and Lullaby controls use shared Garden art and readable contrast', () => {
  const atmosphere = html.match(/<div class="garden-day-atmosphere"[\s\S]*?<\/div>\s*<a class="lullaby-skip"/)?.[0] || '';
  assert.equal((atmosphere.match(/garden-day-cloud garden-day-cloud--/g) || []).length, 3);
  assert.equal((atmosphere.match(/garden-day-butterfly garden-day-butterfly--/g) || []).length, 3);
  assert.match(css, /\.lullaby-page > \.garden-day-atmosphere\s*\{[^}]*position: fixed[^}]*z-index: 0/);
  assert.match(css, /html\[data-mood="dawn"\] \.lullaby-page > \.garden-day-atmosphere\s*\{[^}]*display: block; opacity: \.72/);
  assert.match(css, /html\[data-mood="dawn"\] \.lullaby-page::before \{ opacity: 0/);
  assert.match(css, /html\[data-mood="dawn"\] :is\(\.lullaby-settings, \.lullaby-scenes, \.lullaby-player\)\s*\{[^}]*background-color: rgba\(26, 21, 42, \.68\)/);
  assert.match(css, /html\[data-mood="dawn"\] \.lullaby-player \.lullaby-timer option/);
  assert.match(css, /html\[data-mood="dawn"\] \.lullaby-scenes button:focus-visible/);
  assert.match(css, /\.atlas-page::before\s*\{[^}]*animation: atlas-sky-glimmer/);
});

test('theme changes use short color-only transitions and keep a compact translucent sound panel', () => {
  const theme = fs.readFileSync(path.join(frontend, 'theme.js'), 'utf8');
  const applyMood = theme.match(/function applyMood\(mood, persist = false\) \{([\s\S]*?)\n  \}/)?.[1] || '';
  assert.ok(applyMood);
  assert.match(applyMood, /root\.dataset\.mood = currentMood/);
  assert.match(applyMood, /setAmbienceTheme\(currentMood\)/);
  assert.doesNotMatch(applyMood, /setTimeout|new Audio|\.play\(/, 'theme changes do not restart or rebuild audio');

  for (const selector of ['.lullaby-settings', '.lullaby-scenes', '.lullaby-player']) {
    const start = css.indexOf(`${selector} {`);
    assert.notEqual(start, -1, `${selector} base rule exists`);
    const rule = css.slice(start, css.indexOf('}', start) + 1);
    assert.match(rule, /backdrop-filter: blur\(9px\)/);
    assert.match(rule, /transition: background-color 120ms ease, border-color 120ms ease/);
    assert.doesNotMatch(rule, /transition:\s*all\b/);
  }
  assert.match(css, /\.lullaby-settings \{[^}]*width: min\(304px, 26vw\)[^}]*background: rgba\(26, 21, 42, \.66\)/);
  assert.match(css, /\.lullaby-settings \.lullaby-panel \{ padding: 12px/);
  assert.match(css, /\.lullaby-settings \.lullaby-layer \{[^}]*padding: 4px 0/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*?\.lullaby-settings \{[^}]*width: min\(300px, calc\(100% - 24px\)\)/);
});

test('reset mix restores documented defaults, stops audio, and leaves the room selected', () => {
  assert.match(script, /const defaultMixer = Object\.freeze\(\{\s*master: 0\.35,\s*timer: '0',\s*layers: Object\.freeze\(\{ rain: 0\.45, wind: 0\.3, crickets: 0\.25, fireplace: 0\.25, tones: 0\.35 \}\)/);
  const reset = script.match(/function resetMixer\(\) \{([\s\S]*?)\n\}/)?.[1] || '';
  assert.ok(reset);
  assert.match(reset, /stopMixer\(\)/);
  assert.match(reset, /toggle\.checked = false/);
  assert.match(reset, /range\.value = String\(defaultMixer\.layers\[name\]/);
  assert.match(reset, /masterVolume\.value = String\(defaultMixer\.master\)/);
  assert.match(reset, /sleepTimer\.value = defaultMixer\.timer/);
  assert.match(reset, /Mix reset\. No sounds are playing\./);
  assert.doesNotMatch(reset, /selectScene|dataset\.scene/);
  assert.match(script, /document\.querySelector\('#lullabyReset'\)\.addEventListener\('click', resetMixer\)/);
});

test('a page load starts stopped, restores no enabled layers or sleep timer, and never autoplays media', () => {
  const media = [...html.matchAll(/<audio\b([^>]*)>/g)].map((match) => match[1]);
  assert.equal(media.length, 5, 'one media element per installed layer');
  media.forEach((attributes) => {
    assert.match(attributes, /preload="none"/);
    assert.doesNotMatch(attributes, /\bautoplay\b/);
  });
  const preferences = script.match(/function applySavedPreferences\(\) \{([\s\S]*?)\n\}/)?.[1] || '';
  assert.ok(preferences);
  assert.doesNotMatch(preferences, /toggle\.checked|sleepTimer\.value/);
  assert.match(script, /let mixerState = 'stopped'/);
  assert.match(script, /sleepTimer\.value = '0';/);
  assert.match(script, /media\.autoplay = false;\s*media\.pause\(\)/);
  assert.match(script, /clearSleepTimer\(\);/);
  assert.match(script, /layerState\.forEach\(\(layer\) => \{[\s\S]*?media\.pause\(\)/);
});

test('shared sound mute controls the mixer without creating duplicate ambience playback', () => {
  assert.match(script, /let siteMuted = true/);
  assert.match(script, /subscribeMute\?\.\(\(muted\) => \{\s*siteMuted = muted/);
  assert.doesNotMatch(script, /DearPipSounds\.isEnabled\(\)/, 'Lullaby Lab uses the subscription as its only shared mute source');
  assert.match(script, /masterGain\.gain\.setTargetAtTime\(siteMuted \? 0 : Number\(masterVolume\.value\)/);
  const muteListener = script.match(/subscribeMute\?\.\(\(muted\) => \{([\s\S]*?)\n\}\)/)?.[1] || '';
  assert.ok(muteListener);
  assert.doesNotMatch(muteListener, /playMixer\(|\.play\(/, 'unmuting never starts a stopped mixer session');
  assert.match(script, /createMediaElementSource\(media\)/);
  assert.doesNotMatch(script, /new Audio\(|createElement\(['"]audio/);
  const sources = [...script.matchAll(/createMediaElementSource\(media\)/g)];
  assert.equal(sources.length, 1, 'each existing layer is connected once during audio initialization');

  const sounds = fs.readFileSync(path.join(frontend, 'sounds.js'), 'utf8');
  assert.match(sounds, /const mixerOwnsAmbience = document\.body\?\.classList\.contains\('lullaby-page'\)/);
  assert.match(sounds, /if \(!mixerOwnsAmbience\) \{[\s\S]*?new Audio\(/);
  assert.match(sounds, /function subscribeMute\(listener\)/);
  assert.match(sounds, /isMuted: \(\) => !enabled/);
  assert.match(sounds, /listener\(!enabled\)/);
  assert.match(sounds, /notifyMuteListeners\(\)/);
  assert.match(sounds, /subscribeMute, setAmbienceTheme/);
  assert.match(sounds, /masterGain\.gain\.setTargetAtTime\(enabled \? 0\.16 : 0/);
});

test('playback state, errors, and timer expiry stay synchronized', () => {
  assert.match(script, /if \(mixerState === 'playing' \|\| mixerState === 'starting'\) return/);
  assert.match(script, /const requestId = \+\+playRequestId/);
  assert.match(script, /requestId !== playRequestId/);
  assert.match(script, /function pauseMixer\(\) \{\s*if \(mixerState !== 'playing'\) return;[\s\S]*?mixerState = 'paused'/);
  assert.match(script, /function stopMixer\(message = ''\) \{\s*playRequestId \+= 1;\s*mixerState = 'stopped'/);
  assert.match(script, /function startSleepTimer\([\s\S]*?stopMixer\('Your sleep timer is complete\./);
  assert.match(script, /media\?\.addEventListener\('error'/);
  assert.match(script, /media\?\.addEventListener\('pause'/);
  assert.match(script, /!layer\.media\.paused && !layer\.media\.ended/);
  assert.match(script, /activeLayersStatus\.textContent = active\.length \? `Playing:/);
});

test('theme discovery uses direct touch and pointer controls with randomized targets', () => {
  assert.match(html, /id="lullabyGardenScene"[^>]*role="group"/);
  assert.doesNotMatch(html.match(/<div class="lullaby-garden-scene"[^>]*>/)?.[0] || '', /tabindex=/);
  assert.match(html, /id="lullabySearchStart"[^>]*>Light up the garden/);
  assert.match(html, /id="lullabyReplayDiscovery"/);
  assert.match(html, /id="lullabyTorchAimHandle"[^>]*type="button"[^>]*hidden[^>]*disabled/);
  assert.match(html, /id="lullabyTorchAimHandle"[^>]*hidden disabled>.*?<span>Aim<\/span>/);
  assert.match(html, /class="lullaby-torch-aim-handle"[^>]*aria-label="Drag this handle to aim Pip’s torch in any direction\."/);
  assert.match(html, /id="lullabyHiddenTarget"[^>]*data-star-index="0"[^>]*type="button"[^>]*aria-hidden="true"[^>]*disabled/);
  assert.equal((html.match(/data-star-index="\d"/g) || []).length, 5, 'five individual star controls remain in the DOM');
  assert.equal((html.match(/data-butterfly-index="\d"/g) || []).length, 3, 'three individual butterfly controls remain in the DOM');
  const torchPath = 'assets/lullaby-lab/images/pip-torch.png';
  const netPath = 'assets/lullaby-lab/images/pip-butterfly-net.png.png';
  for (const [mode, asset] of [['night', torchPath], ['day', netPath]]) {
    assert.ok(fs.existsSync(path.join(frontend, asset)), `${asset} must exist`);
    assert.match(html, new RegExp(`data-pip-art="${mode}" src="${asset.replaceAll('.', '\\.')}"`));
    const png = fs.readFileSync(path.join(frontend, asset));
    assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], `${asset} must be a PNG`);
    assert.equal(png.readUInt32BE(16), 1254, `${asset} width comes from the inspected sprite`);
    assert.equal(png.readUInt32BE(20), 1254, `${asset} height comes from the inspected sprite`);
  }
  assert.match(script, /new MutationObserver\(updateDiscoveryTheme\)/);
  assert.match(script, /Find a hidden butterfly/);
  assert.match(script, /Find a hidden star/);
  const themeUpdate = script.match(/function updateDiscoveryTheme\(\) \{([\s\S]*?)\n\}/)?.[1] || '';
  assert.ok(themeUpdate);
  assert.match(themeUpdate, /if \(changed\) resetDiscovery\(\)/);
  assert.doesNotMatch(themeUpdate, /generateTargetPositions|Math\.random/);
  assert.match(script, /gardenScene\.classList\.toggle\('is-day', isDay\)/);
  assert.match(script, /nightlight\.classList\.toggle\('is-day', isDay\)/);
  assert.match(script, /const targetZones = Object\.freeze\(/);
  assert.match(script, /const fallbackTargets = Object\.freeze\(/);
  assert.match(script, /function generateTargetPositions\(mode, random = Math\.random, scene = getSceneSize\(\), avoidPoints = \[\]\)/);
  assert.match(script, /for \(let attempt = 0; attempt < 30; attempt \+= 1\)/);
  assert.match(script, /function setTargetPosition\(\)[\s\S]*?getStarPosition\(index\)[\s\S]*?getButterflyPosition\(index\)/);
  assert.match(script, /let pipPosition = \{ x: 0\.28, y: 0\.7 \}/);
  assert.match(script, /function applyPipPosition\(\)[\s\S]*?Math\.max\(size\.width \/ 2[\s\S]*?Math\.min\(scene\.width - size\.width \/ 2/);
  assert.match(script, /function movePipTo\(point\)[\s\S]*?applyPipPosition\(\)/);
  assert.match(script, /art\.addEventListener\('pointerdown'/);
  assert.match(script, /art\.setPointerCapture\(event\.pointerId\)/);
  assert.match(script, /art\.addEventListener\('pointerdown',[\s\S]*?event\.preventDefault\(\)[\s\S]*?setPointerCapture/);
  assert.match(script, /gardenScene\.addEventListener\('pointermove'[\s\S]*?event\.pointerId === dragPointerId/);
  assert.doesNotMatch(script, /ArrowUp|ArrowDown|ArrowLeft|ArrowRight|WASD|event\.key/);
  assert.match(script, /function torchOrigin\(\)[\s\S]*?artRect\.width \* 0\.84[\s\S]*?artRect\.height \* 0\.14/);
  assert.match(script, /function netCatchPoint\(\)[\s\S]*?artRect\.width \* 0\.86[\s\S]*?artRect\.height \* 0\.25/);
  const torchCheck = script.match(/function torchContainsStar\(index\) \{([\s\S]*?)\n\}/)?.[1] || '';
  assert.ok(torchCheck);
  assert.match(torchCheck, /const target = getStarPosition\(index\)/);
  assert.match(script, /let torchAngle = -70 \* Math\.PI \/ 180/);
  assert.match(torchCheck, /Math\.cos\(torchAngle\)/);
  assert.match(torchCheck, /Math\.sin\(torchAngle\)/);
  assert.match(torchCheck, /alongBeam = dx \* directionX \+ dy \* directionY/);
  assert.match(torchCheck, /acrossBeam = Math\.abs\(dx \* directionY - dy \* directionX\)/);
  assert.match(torchCheck, /alongBeam >= 0 && alongBeam <= beamLength && acrossBeam <= halfWidthAtTarget/);
  assert.match(script, /function setNearTarget\(toolPoint\)[\s\S]*?activeStarPositions\.forEach[\s\S]*?activeButterflyPositions\.forEach[\s\S]*?collectedButterflies\.has\(index\)/);
  assert.match(script, /function updateTorchBeam\(\)[\s\S]*?--beam-width[\s\S]*?torchAngle \* 180 \/ Math\.PI/);
  assert.match(script, /function aimTorchAt\(point\)[\s\S]*?Math\.atan2\(point\.y - origin\.y, point\.x - origin\.x\)[\s\S]*?updateTorchBeam\(\)[\s\S]*?setNearTarget\(origin\)/);
  assert.match(script, /torchAimHandle\.addEventListener\('pointerdown'[\s\S]*?torchAiming = true[\s\S]*?setPointerCapture\(event\.pointerId\)[\s\S]*?aimTorchAt\(scenePoint\(event\)\)/);
  assert.match(script, /torchAimHandle\.addEventListener\('pointermove'[\s\S]*?torchAiming \|\| event\.pointerId !== aimPointerId/);
  assert.match(script, /\['pointerup', 'pointercancel', 'lostpointercapture'\][\s\S]*?stopTorchAiming\(event\.pointerId\)/);
  assert.doesNotMatch(script, /event\.pointerType === 'mouse' && aimPointerId === null/);
  assert.match(script, /function collectStar\(event\)[\s\S]*?illuminatedStars\.has\(index\)[\s\S]*?collectedStars\.add\(index\)/);
  assert.match(script, /const available = discoveryMode === 'night' && searchActive && \(collected \|\| illuminatedStars\.has\(index\)\)/);
  assert.match(script, /collectedStars\.size === hiddenTargets\.length/);
  assert.match(script, /Stars found: \$\{count\}\/\$\{hiddenTargets\.length\}/);
  assert.match(script, /function catchButterfly\(event\)[\s\S]*?nearbyButterflies\.has\(index\)[\s\S]*?collectedButterflies\.add\(index\)/);
  assert.match(script, /collectedButterflies\.size === butterflyTargets\.length/);
  assert.match(script, /function updateTargetAvailability\(\)[\s\S]*?discoveryMode === 'day' && searchActive && \(collected \|\| nearbyButterflies\.has\(index\)\)/);
  assert.match(script, /function resetDiscovery\(\)[\s\S]*?torchAngle = -70 \* Math\.PI \/ 180/);
  assert.match(script, /collectedStars\.clear\(\)[\s\S]*?illuminatedStars\.clear\(\)[\s\S]*?collectedButterflies\.clear\(\)[\s\S]*?nearbyButterflies\.clear\(\)/);
  assert.match(script, /function startDiscoveryRound\(\)[\s\S]*?resetDiscovery\(\)[\s\S]*?generateTargetPositions\('day'[\s\S]*?generateTargetPositions\('night'/);
  assert.match(script, /searchStart\.addEventListener\('click', startDiscoveryRound\)/);
  assert.match(script, /replayDiscovery\.addEventListener\('click', startDiscoveryRound\)/);
  assert.match(script, /new ResizeObserver\(updateDiscoveryGeometry\)\.observe\(gardenScene\)/);
  assert.match(script, /function updateDiscoveryGeometry\(\)[\s\S]*?updateTorchBeam\(\)[\s\S]*?setNearTarget/);
  assert.match(script, /hiddenTargets\.forEach\(\(star\) => star\.addEventListener\('click', collectStar\)\)/);
  assert.match(script, /butterflyTargets\.forEach\(\(butterfly\) => butterfly\.addEventListener\('click', catchButterfly\)\)/);
  assert.match(script, /function resetDiscovery\(\)[\s\S]*?pipPosition = \{ x: 0\.28, y: 0\.7 \}/);
  assert.match(css, /\.lullaby-garden-scene \{[\s\S]*?aspect-ratio: 16 \/ 9[\s\S]*?touch-action: pan-y/);
  assert.match(css, /\.lullaby-pip-art \{[\s\S]*?width: min\(19\.2%, 126px\)[\s\S]*?transform: translate\(-50%, -50%\)[\s\S]*?pointer-events: auto/);
  assert.match(css, /\.lullaby-butterfly-target \{ z-index: 5/);
  assert.match(css, /\.lullaby-butterfly-target \{[^}]*opacity: 0/);
  assert.match(css, /\.lullaby-garden-scene\.is-day \.lullaby-butterfly-target\.is-near,[\s\S]*?\.lullaby-garden-scene\.is-day \.lullaby-butterfly-target\.is-collected \{ opacity: 1/);
  assert.match(css, /\.lullaby-garden-scene\.is-day\.has-all-butterflies \.lullaby-butterfly-target\.is-collected \{ animation: lullaby-butterfly-flutter/);
  assert.match(css, /\.lullaby-hidden-target\.is-lit,[\s\S]*?\.lullaby-hidden-target\.is-collected \{ opacity: 1/);
  assert.doesNotMatch(css, /\.lullaby-garden-scene\.is-near \.lullaby-hidden-target/);
  assert.match(css, /\.lullaby-torch-aim-handle \{[\s\S]*?left: var\(--torch-tip-x[\s\S]*?touch-action: none/);
  assert.match(css, /\.lullaby-torch-aim-handle\[hidden\] \{ display: none/);
  assert.match(css, /\.lullaby-garden-scene\.has-all-stars \.lullaby-hidden-target\.is-collected/);
  assert.match(css, /\.lullaby-garden-scene\.is-day \.lullaby-hidden-target \{ opacity: 0/);
  assert.match(css, /\.lullaby-search-beam \{[\s\S]*?height: var\(--beam-width, 120px\)[\s\S]*?clip-path: polygon\(0 50%, 100% 0, 100% 100%\)/);
  assert.match(css, /\.lullaby-pip-art \{[\s\S]*?z-index: 4/);
  assert.match(css, /@media \(max-width: 680px\)[\s\S]*?\.lullaby-pip-art \{ width: min\(23\.4%, 126px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.lullaby-page \*/);
  assert.doesNotMatch(`${html}\n${script}`, /arrow keys|WASD|press Enter|\bUse Q and E\b/i);

  const zoneAndFallbackSource = script.slice(script.indexOf('const targetZones ='), script.indexOf('\nconst layerRows ='));
  const placementSource = script.slice(script.indexOf('function generateTargetPositions'), script.indexOf('\nfunction getStarPosition'));
  const placement = vm.runInNewContext(`${zoneAndFallbackSource}\n${placementSource}\n({ targetZones, fallbackTargets, generateTargetPositions })`);
  const scene = { width: 960, height: 540 };
  for (const [mode, expectedCount] of [['night', 5], ['day', 3]]) {
    let seed = 41;
    const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    const avoidPoint = { x: 269, y: 378 };
    const positions = placement.generateTargetPositions(mode, random, scene, [avoidPoint]);
    assert.equal(positions.length, expectedCount);
    assert.notDeepEqual(JSON.parse(JSON.stringify(positions)), JSON.parse(JSON.stringify(placement.fallbackTargets[mode])));
    for (const [index, target] of positions.entries()) {
      const zone = placement.targetZones[mode].find((candidate) => candidate.region === target.region && target.x >= candidate.x[0] && target.x <= candidate.x[1] && target.y >= candidate.y[0] && target.y <= candidate.y[1]);
      assert.ok(zone);
      assert.ok(Math.hypot(target.x * scene.width - avoidPoint.x, target.y * scene.height - avoidPoint.y) >= Math.min(scene.width, scene.height) * 0.14);
      for (const other of positions.slice(index + 1)) {
        assert.ok(Math.hypot((target.x - other.x) * scene.width, (target.y - other.y) * scene.height) >= Math.min(scene.width, scene.height) * 0.15);
      }
    }
  }
  let randomCalls = 0;
  const constantRandom = () => { randomCalls += 1; return 0.5; };
  const blockedCenters = placement.targetZones.night.map((zone) => ({ x: ((zone.x[0] + zone.x[1]) / 2) * scene.width, y: ((zone.y[0] + zone.y[1]) / 2) * scene.height }));
  const fallback = placement.generateTargetPositions('night', constantRandom, scene, blockedCenters);
  assert.deepEqual(JSON.parse(JSON.stringify(fallback)), JSON.parse(JSON.stringify(placement.fallbackTargets.night)));
  assert.ok(randomCalls <= 4 + 5 * 30 * 2, 'failed placement search has a finite attempt bound');
});

test('mixer reports global mute and recording failures without claiming audible playback', () => {
  const status = script.match(/function updateMixerStatus\(message = ''\) \{([\s\S]*?)\n\}/)?.[1] || '';
  assert.ok(status);
  assert.match(status, /siteMuted\s*\?\s*'Your sound layers are playing, but muted/);
  assert.match(script, /masterGain\.gain\.value = siteMuted \? 0 : Number\(masterVolume\.value\)/);
  assert.match(script, /masterGain\.gain\.setTargetAtTime\(volume, audioContext\.currentTime, 0\.035\)/);
  assert.match(script, /layer\.playError = error\?\.name === 'NotAllowedError'/);
  assert.match(script, /failedLayers\.map\(\(layer\) => `\$\{layerDisplayName\(layer\)\}: \$\{layer\.playError/);
  assert.match(script, /media\?\.addEventListener\('error', \(\) => markLayerUnavailable\(layer, `\$\{layerDisplayName\(layer\)\} could not load/);
  assert.match(script, /siteMuted = muted/);
  assert.match(script, /if \(mixerState === 'playing'\) updateMixerStatus\(\)/);
});

test('dream bubbles stay local, render as text, and provide bounded entry and removal', () => {
  assert.match(html, /maxlength="180"/);
  assert.match(html, /data-bubble-prompt=/);
  assert.match(html, /id="dreamBubbleClear"/);
  assert.match(html, /id="dreamBubbleCreate" type="submit"/);
  assert.match(html, /id="bubbleSound"/);
  assert.match(html, /id="bubbleSound"/);
  assert.match(html, /Play a tiny chime when a wish is added/);
  assert.match(script, /localStorage\.setItem\(bubbleStorageKey/);
  assert.match(script, /note\.textContent = bubble\.text\.length > 44/);
  assert.match(script, /slice\(0, 180\)/);
  const renderBubbles = script.match(/function renderBubbles\(freshId = 0\) \{([\s\S]*?)\n\}/)?.[1] || '';
  assert.ok(renderBubbles);
  assert.match(renderBubbles, /bubbles\.forEach\(\(bubble, index\)/, 'existing bubbles are retained when a new one is added');
  assert.match(renderBubbles, /lullaby-bubble__select/);
  assert.match(renderBubbles, /aria-expanded/);
  assert.match(renderBubbles, /selectedBubbleId = bubble\.id/);
  assert.match(renderBubbles, /bubbleDialogText\.textContent = bubble\.text/);
  assert.match(renderBubbles, /bubbleDialogComplete\.textContent = bubble\.completed \? 'Mark as not done' : 'Mark as done'/);
  assert.match(renderBubbles, /bubbleDialog\.showModal\(\)/);
  assert.match(renderBubbles, /bubbles = bubbles\.filter\(\(entry\) => entry\.id !== bubble\.id\)/);
  assert.match(renderBubbles, /remove\.addEventListener\('click'/);
  assert.match(renderBubbles, /bubbleList\.append\(item\)/);
  assert.match(renderBubbles, /--bubble-delay/);
  assert.match(renderBubbles, /--bubble-size/);
  assert.match(renderBubbles, /--bubble-start-x/);
  assert.match(renderBubbles, /--bubble-start-y/);
  const submitBubble = script.match(/bubbleForm\.addEventListener\('submit', async \(event\) => \{([\s\S]*?)\n\}\);/)?.[1] || '';
  assert.ok(submitBubble);
  assert.match(submitBubble, /if \(creatingBubble\) return/);
  assert.match(submitBubble, /if \(!text\)[\s\S]*?return/);
  assert.match(submitBubble, /bubbles\.push\(bubble\)/);
  assert.match(submitBubble, /bubbleCreate\.disabled = true/);
  assert.match(submitBubble, /if \(bubbleSound\.checked\)[\s\S]*?await ensureAudioContext\(\)[\s\S]*?createTone\(783\.99, 0\.32, bubbleGain, activeBubbleVoices/);
  assert.match(submitBubble, /The tiny chime could not play right now/);
  assert.match(submitBubble, /Shared sound is muted, so no chime played/);
  assert.match(submitBubble, /silenceVoices\(activeBubbleVoices\)/);
  assert.match(script, /bubbleGain\.connect\(audioContext\.destination\)/);
  assert.doesNotMatch(submitBubble, /masterGain/);
  assert.match(script, /bubbleDialogComplete\.addEventListener\('click'/);
  assert.match(script, /bubbleDialogEditButton\.addEventListener\('click'/);
  assert.match(script, /bubbleDialogEditForm\.addEventListener\('submit'/);
  assert.match(script, /wish\.completed = !wish\.completed/);
  assert.match(script, /version: 2,[\s\S]*?completed: Boolean\(completed\)/);
  assert.match(submitBubble, /bubbleCreateResetTimer = window\.setTimeout/);
  const clearBubbles = script.match(/bubbleClear\.addEventListener\('click', \(\) => \{([\s\S]*?)\n\}\);/)?.[1] || '';
  assert.match(html, /<dialog[^>]*id="dreamBubbleDialog"/);
  assert.match(html, /id="dreamBubbleDelete"/);
  assert.match(html, /id="dreamBubbleClose"[^>]*aria-label="Close wish details"/);
  assert.match(script, /bubbleDialog\.addEventListener\('close'/);
  assert.match(script, /bubbleDialogDelete\.addEventListener\('click'/);
  assert.match(script, /bubbleDialog\.addEventListener\('click',[\s\S]*?event\.target === bubbleDialog/);
  assert.match(clearBubbles, /bubbles = \[\]/);
  assert.match(clearBubbles, /selectedBubbleId = 0/);
  assert.match(clearBubbles, /saveBubbles\(\)/);
  assert.doesNotMatch(script, /DearPipProgress|fetch\(/);
  assert.match(css, /\.lullaby-bubble-list \.lullaby-bubble::before[\s\S]*?linear-gradient/);
  assert.match(css, /\.lullaby-bubble-list \.lullaby-bubble::after[\s\S]*?border-radius: inherit/);
  assert.match(css, /\.lullaby-bubble-list \.lullaby-bubble\.is-selected \{ min-height: 0; aspect-ratio: 1; border-radius: 50%/);
  assert.match(css, /\.lullaby-bubble-list \.lullaby-bubble \{[\s\S]*?flex: 0 1 clamp\(78px, var\(--bubble-size/);
  assert.match(css, /\.lullaby-wish-dialog::backdrop/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.lullaby-music-box\.is-playing > img/);
  assert.match(css, /@keyframes lullaby-bubble-arrive/);
  assert.match(css, /@keyframes lullaby-dream-float/);
  assert.match(css, /\.lullaby-bubble__text[\s\S]*?-webkit-line-clamp: 4/);
  assert.match(css, /@media \(max-width: 520px\)[\s\S]*?\.lullaby-bubble-list \{ justify-content: center/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.lullaby-bubble-list \.lullaby-bubble\.is-new \{ animation: none/);
  assert.match(css, /\.lullaby-bubble-form \.lullaby-sound-option \{[\s\S]*?min-height: 44px/);
});

test('Echo Pip supports replay, mute, restart, feedback, and increasing rounds', () => {
  for (const id of ['lullabyGameStart', 'lullabyGameReplay', 'lullabyGameMute', 'lullabyGameRestart']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.equal((html.match(/class="lullaby-note"/g) || []).length, 3);
  const order = ['id="gameTitle"', 'id="lullabyGameStart"', 'class="lullaby-game__controls"', 'class="lullaby-game__notes"', 'id="lullabyGameStatus"'].map((token) => html.indexOf(token));
  assert.ok(order.every((position) => position >= 0));
  assert.deepEqual(order, [...order].sort((a, b) => a - b), 'game controls follow the intended reading order');
  assert.match(script, /gameRoundLength = 3/);
  assert.match(script, /Math\.min\(10, gameRoundLength \+ 1\)/);
  assert.match(script, /if \(gamePlaying \|\| gameStartPending \|\| gameInputPending\) return/);
  assert.match(script, /gameStartPending = true;[\s\S]*?const runToken = \+\+gameToken;[\s\S]*?await ensureAudioContext\(\)/);
  assert.match(script, /gameStartPending = false/);
  assert.match(script, /if \(!gamePattern\.length\) gamePattern = makeGamePattern\(gameRoundLength\)/);
  assert.match(script, /function makeGamePattern\(length\)[\s\S]*?const firstNotes = \[0, 1, 2\][\s\S]*?return Array\.from\(\{ length \}/);
  const patternFunction = script.match(/function makeGamePattern\(length\) \{[\s\S]*?\n\}/)?.[0] || '';
  const makePattern = vm.runInNewContext(`${patternFunction}; makeGamePattern`);
  assert.deepEqual(Array.from(makePattern(3)).sort(), [0, 1, 2], 'the opening sequence plays each note exactly once');
  assert.equal((script.match(/gameReplay\.addEventListener\('click', playPattern\)/g) || []).length, 1);
  assert.equal((script.match(/gameStart\.addEventListener\('click', playPattern\)/g) || []).length, 1);
  assert.match(script, /if \(gameMuted\) \{\s*silenceVoices\(activeGameVoices\)/);
  assert.match(script, /silenceVoices\(activeGameVoices\);[\s\S]*?playGameNote\(note, 0\.34\)/);
  assert.match(script, /gameInputTimer = window\.setTimeout\(\(\) => \{[\s\S]*?gameInputPending = false/);
  assert.match(script, /gameInputPending = false;[\s\S]*?window\.clearTimeout\(gameInputTimer\)[\s\S]*?gameRoundLength = 3/);
  assert.match(script, /if \(!gameMuted && !siteMuted && !playGameNote\(note, 0\.42\)\)[\s\S]*?note audio is unavailable/);
  assert.match(script, /gameGain\.connect\(audioContext\.destination\)/);
  assert.doesNotMatch(script.match(/function playGameNote\(note, duration\) \{([\s\S]*?)\n\}/)?.[1] || '', /masterGain/);
  assert.match(script, /if \(!gameGain \|\| gameMuted \|\| siteMuted\) return false/);
  assert.match(script, /function animateMusicBox\(duration\)[\s\S]*?musicBox\.classList\.add\('is-playing'\)/);
  assert.match(script, /function animateMusicBox\(duration\)[\s\S]*?void musicBox\.offsetWidth/);
  assert.match(script, /function stopMusicBoxAnimation\(\)/);
  assert.match(html, /id="lullabyMusicBox"[\s\S]*?src="assets\/pip-Lullaby Box\.png"[\s\S]*?lullaby-music-box__particles/);
  assert.match(css, /\.lullaby-music-box\.is-playing > img/);
  assert.match(css, /\.lullaby-music-box\.is-playing \.lullaby-music-box__particles i/);
  assert.match(script, /Replay the pattern and try again/);
  assert.match(css, /\.lullaby-note\.is-active/);
  assert.match(css, /\.lullaby-game__notes \{ display: grid; grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.lullaby-note\[data-note="0"\][\s\S]*?\.lullaby-note\[data-note="1"\][\s\S]*?\.lullaby-note\[data-note="2"\]/);
  assert.match(css, /\.lullaby-game__controls > \.lullaby-button \{ flex: 1 1 112px/);
  assert.match(css, /\.lullaby-lab-grid \{ align-items: start/);
});

test('light theme, responsive layout, and reduced motion styles exist', () => {
  assert.match(css, /html\[data-mood="dawn"\] \.lullaby-page/);
  assert.match(css, /\.lullaby-garden-scene\.is-day \.garden-sky/);
  assert.match(css, /@media \(max-width: 680px\)[\s\S]*?\.lullaby-nightlight/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.lullaby-page \*/);
});

test('footer and ambience controls use the shared responsive page layout and themed states', () => {
  assert.match(css, /\.lullaby-footer \{[\s\S]*?justify-content: space-between[\s\S]*?width: min\(100% - 48px, 1280px\)[\s\S]*?padding: 18px 0/);
  assert.match(css, /@media \(max-width: 620px\)[\s\S]*?\.lullaby-footer \{[\s\S]*?flex-direction: row/);
  assert.match(css, /\.lullaby-settings \.lullaby-layer input\[type="checkbox"\] \{\s*appearance: none/);
  assert.match(css, /\.lullaby-settings \.lullaby-layer input\[type="checkbox"\]:checked/);
  assert.match(css, /\.lullaby-settings \.lullaby-layer input\[type="range"\]::-webkit-slider-runnable-track/);
  assert.match(css, /\.lullaby-scenes button\[aria-pressed="true"\]/);
  assert.match(css, /\.lullaby-player \.lullaby-button--primary/);
  assert.match(css, /\.lullaby-player \.lullaby-timer select \{[\s\S]*?appearance: none[\s\S]*?background-image/);
  assert.equal((html.match(/<option value=/g) || []).length, 5, 'the timer retains Off, 5, 15, 30, and 60 minute choices');
});

test('recording manifest maps all installed files and records owner-reported Chrome playback', () => {
  assert.equal(manifest.recordings.length, 5);
  assert.equal(manifest.licenseReference.downloadSourceMatched, false);
  const expected = {
    rain: 'assets/lullaby-lab/audio/normalized/rain.mp3',
    wind: 'assets/lullaby-lab/audio/normalized/soft-wind.mp3',
    crickets: 'assets/lullaby-lab/audio/normalized/nighttime-crickets.mp3',
    fireplace: 'assets/lullaby-lab/audio/normalized/fireplace.mp3',
    tones: 'assets/lullaby-lab/audio/normalized/gentle-lullaby-tones.mp3',
  };
  for (const recording of manifest.recordings) {
    if (recording.layer === 'tones') {
      assert.equal(recording.status, 'installed');
      assert.equal(recording.fileExists, true);
    }
    assert.equal(recording.status, 'installed');
    assert.equal(recording.localPath, expected[recording.layer]);
    assert.equal(recording.fileExists, true);
    assert.equal(recording.playbackVerified, true);
    assert.match(recording.playbackVerificationSource, /Project owner reports/);
    assert.notEqual(recording.sourceListingMatched, true);
    assert.ok(fs.existsSync(path.join(frontend, recording.localPath)));
  }
  assert.match(manifest.verificationNote, /project owner reports that each normalized file started individually in Chrome/);
  assert.match(manifest.verificationNote, /not independently tested in this session/);
});


