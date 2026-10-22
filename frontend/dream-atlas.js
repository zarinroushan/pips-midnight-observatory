const celestialObjects = {
  lantern: {
    name: 'The Lantern Fox',
    description: 'A fox-shaped constellation that appears whenever a wandering dream needs a way home.',
    discovery: 'Its tail points toward the pillow where a lost dream is waiting.',
  },
  sail: {
    name: 'The Moon-Sail',
    description: 'Three bright stars make a tiny boat that drifts across the quietest part of the sky.',
    discovery: 'On clear nights, it carries wishes from one sleepy window to another.',
  },
  whale: {
    name: 'The Cloud Whale',
    description: 'A gentle giant swims through the high clouds, gathering silver mist in its wake.',
    discovery: 'Its song is so low that only sleeping flowers can hear it.',
  },
  garden: {
    name: 'The Dreaming Garden',
    description: 'This star cluster marks a hidden garden where imaginary creatures leave their dreams to bloom.',
    discovery: 'A new flower appears there each time someone remembers a kind dream.',
  },
  bell: {
    name: 'The Pillow Bell',
    description: 'A little bell of stars rings softly above the nursery rooftops at bedtime.',
    discovery: 'It never makes a sound, but every cloud nearby begins to yawn.',
  },
};

const objectButtons = [...document.querySelectorAll('.atlas-object')];
const objectName = document.querySelector('#atlasObjectName');
const description = document.querySelector('#atlasDescription');
const discovery = document.querySelector('#atlasDiscovery');
const discoveryStatus = document.querySelector('#atlasStatus');
const journalList = document.querySelector('#atlasJournalList');
const countLabel = document.querySelector('#atlasCount');
const journalCount = document.querySelector('#atlasJournalCount');
const discovered = new Set();
const atlasStorageKey = 'dear-pip-dream-atlas-v1';
let atlasStorageAvailable = true;
let puzzleComplete = false;
let puzzleConstellation = null;
const completedConstellations = new Set();
let atlasProgressChangeVersion = 0;
let selectedObject = null;
const game = document.querySelector('.atlas-game');
const gameBoard = document.querySelector('#atlasGameBoard');
const gameStarsContainer = document.querySelector('#atlasGameStars');
const gamePath = document.querySelector('#atlasGamePath');
const gameSparkles = document.querySelector('#atlasGameSparkles');
const gameInstructions = document.querySelector('#atlasGameInstructions');
const gameMessage = document.querySelector('#atlasGameMessage');
const gameReset = document.querySelector('#atlasGameReset');
const constellationPaths = new Map(
  [...document.querySelectorAll('.atlas-constellation-lines path[data-object]')]
    .map((path) => [path.dataset.object, path]),
);
let activePattern = null;
let nextStar = 1;
let puzzleMistakeTimer = 0;

function isAdventureCompleted() {
  try {
    const saved = JSON.parse(localStorage.getItem('dear-pip-wishbound-adventure-v1') || 'null');
    return saved?.version === 1 && saved.completed === true;
  } catch (_error) {
    return false;
  }
}

function atlasProgressSnapshot() {
  return {
    version: 1,
    discovered: [...discovered],
    puzzleComplete: puzzleComplete || completedConstellations.size > 0,
    puzzleConstellation: selectedObject || puzzleConstellation,
    gameCompleted: isAdventureCompleted(),
  };
}

function readConstellationPattern(objectId) {
  const path = constellationPaths.get(objectId);
  if (!path) return null;

  const definition = path.getAttribute('d') || '';
  const points = [...definition.matchAll(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g)]
    .map((match) => ({ x: Number(match[1]), y: Number(match[2]) }));
  if (points.length < 2) return null;
  return { points, closed: /z/i.test(definition) };
}

function positionPuzzleStars(points) {
  const bounds = points.reduce((result, point) => ({
    minX: Math.min(result.minX, point.x),
    maxX: Math.max(result.maxX, point.x),
    minY: Math.min(result.minY, point.y),
    maxY: Math.max(result.maxY, point.y),
  }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  const left = 48;
  const right = 272;
  const top = 34;
  const bottom = 156;

  return points.map((point) => ({
    x: left + ((point.x - bounds.minX) / width) * (right - left),
    y: top + ((point.y - bounds.minY) / height) * (bottom - top),
  }));
}

function renderConnectedPath() {
  if (!activePattern) {
    gamePath.setAttribute('points', '');
    return;
  }
  const connected = activePattern.points.slice(0, nextStar - 1);
  if (game.classList.contains('is-complete') && activePattern.closed) {
    connected.push(activePattern.points[0]);
  }
  gamePath.setAttribute('points', connected.map(({ x, y }) => `${x},${y}`).join(' '));
}

function resetPuzzle(message = 'Tap the lights in order to connect this constellation.') {
  nextStar = 1;
  game.classList.remove('has-progress', 'is-complete', 'has-mistake');
  gameStarsContainer.querySelectorAll('.atlas-game__star').forEach((star) => {
    star.classList.remove('is-connected', 'is-mistake');
    star.setAttribute('aria-pressed', 'false');
    star.removeAttribute('aria-current');
  });
  gameStarsContainer.querySelector('.atlas-game__star')?.setAttribute('aria-current', 'step');
  gameSparkles.replaceChildren();
  renderConnectedPath();
  gameMessage.textContent = message;
}

function completePuzzle() {
  const newlyDiscovered = !discovered.has(selectedObject);
  puzzleComplete = true;
  puzzleConstellation = selectedObject;
  discovered.add(selectedObject);
  renderDiscoveryJournal();
  game.classList.add('is-complete');
  renderConnectedPath();
  const lastPoint = activePattern.points[activePattern.points.length - 1];
  const sparkle = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  sparkle.classList.add('atlas-game__sparkle');
  sparkle.setAttribute('x', String(lastPoint.x));
  sparkle.setAttribute('y', String(lastPoint.y - 18));
  sparkle.textContent = '✦';
  gameSparkles.append(sparkle);
  gameMessage.textContent = newlyDiscovered
    ? `${celestialObjects[selectedObject].name} discovered! It has joined your field notes.`
    : `${celestialObjects[selectedObject].name} is shining in your field notes!`;
  saveAtlasProgress({ reportDiscovery: newlyDiscovered });
  window.DearPipSounds?.play('constellation-discover');
}

function selectPuzzle(objectId) {
  const changed = selectedObject !== objectId;
  const wasCompleted = puzzleComplete;
  const restoreCompletion = changed && puzzleComplete && puzzleConstellation === objectId;
  selectedObject = objectId;
  if (!changed) return;

  const object = celestialObjects[objectId];
  const sourcePattern = readConstellationPattern(objectId);
  if (!object || !sourcePattern) {
    console.error(`Could not find the star path for Dream Atlas constellation "${objectId}".`);
    return;
  }

  activePattern = {
    ...sourcePattern,
    points: positionPuzzleStars(sourcePattern.points),
  };
  gameBoard.hidden = false;
  gameReset.disabled = false;
  gameInstructions.textContent = `Connect ${activePattern.points.length} lights to trace ${object.name}.`;
  gameStarsContainer.setAttribute('aria-label', `Connect the lights for ${object.name} in order`);
  gameStarsContainer.replaceChildren();
  activePattern.points.forEach((point, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'atlas-game__star';
    button.dataset.step = String(index + 1);
    button.textContent = String(index + 1);
    button.setAttribute('aria-label', `Connect star ${index + 1} of ${activePattern.points.length} in ${object.name}`);
    button.setAttribute('aria-pressed', 'false');
    button.style.left = `${(point.x / 320) * 100}%`;
    button.style.top = `${(point.y / 190) * 100}%`;
    button.addEventListener('click', () => {
      const step = Number(button.dataset.step);
      if (game.classList.contains('is-complete')) return;

      if (step !== nextStar) {
        resetPuzzle('No worries, the lights got tangled. Let’s try again from star 1.');
        if (step === 1) {
          button.classList.add('is-connected');
          button.setAttribute('aria-pressed', 'true');
          button.setAttribute('aria-current', 'step');
          game.classList.add('has-progress');
          nextStar = 2;
          renderConnectedPath();
          gameMessage.textContent = 'No worries, the lights got tangled. Star 1 is ready; continue with star 2.';
        } else {
          button.classList.add('is-mistake');
          window.clearTimeout(puzzleMistakeTimer);
          puzzleMistakeTimer = window.setTimeout(() => button.classList.remove('is-mistake'), 500);
        }
        return;
      }

      button.classList.add('is-connected');
      button.setAttribute('aria-pressed', 'true');
      button.removeAttribute('aria-current');
      nextStar += 1;
      const followingStar = gameStarsContainer.querySelector(`[data-step="${nextStar}"]`);
      followingStar?.setAttribute('aria-current', 'step');
      game.classList.add('has-progress');
      renderConnectedPath();
      if (nextStar > activePattern.points.length) {
        completePuzzle();
      } else {
        gameMessage.textContent = `Star ${step} connected. Now find star ${nextStar}.`;
      }
    });
    gameStarsContainer.append(button);
  });

  puzzleComplete = restoreCompletion;
  puzzleConstellation = objectId;
  resetPuzzle(restoreCompletion
    ? `${object.name} is already shining in the sky.`
    : `Tap star 1 to begin connecting ${object.name}.`);
  if (restoreCompletion) {
    nextStar = activePattern.points.length + 1;
    gameStarsContainer.querySelectorAll('.atlas-game__star').forEach((star) => {
      star.classList.add('is-connected');
      star.setAttribute('aria-pressed', 'true');
    });
    game.classList.add('has-progress', 'is-complete');
    renderConnectedPath();
    const lastPoint = activePattern.points[activePattern.points.length - 1];
    const sparkle = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    sparkle.classList.add('atlas-game__sparkle');
    sparkle.setAttribute('x', String(lastPoint.x));
    sparkle.setAttribute('y', String(lastPoint.y - 18));
    sparkle.textContent = '✦';
    gameSparkles.append(sparkle);
  }
  gameReset.setAttribute('aria-label', `Reset the ${object.name} puzzle`);
  if (wasCompleted && !restoreCompletion) saveAtlasProgress();
}

function saveAtlasProgress({ reportDiscovery = false } = {}) {
  const progress = atlasProgressSnapshot();
  atlasProgressChangeVersion += 1;
  let localSaved = false;
  try {
    localStorage.setItem(atlasStorageKey, JSON.stringify(progress));
    atlasStorageAvailable = true;
    localSaved = true;
  } catch (error) {
    atlasStorageAvailable = false;
    console.error('Could not save this device’s Dream Atlas notes:', error);
  }
  if (!reportDiscovery) {
    window.DearPipProgress?.save('atlas', progress).catch((error) => {
      console.error('Could not sync Dream Atlas activity progress:', error);
    });
    return;
  }

  discoveryStatus.textContent = 'Added to your field notes. Saving progress…';
  if (!window.DearPipProgress) {
    discoveryStatus.textContent = localSaved
      ? 'Discovered and saved on this device. Online progress is unavailable.'
      : 'Discovered for this visit only; browser and online storage are unavailable.';
    return;
  }

  window.DearPipProgress.save('atlas', progress).then(() => {
    discoveryStatus.textContent = localSaved
      ? 'Discovered and saved on this device and in visitor progress.'
      : 'Discovered and saved in visitor progress; browser storage is unavailable.';
  }).catch((error) => {
    console.error('Could not sync Dream Atlas activity progress:', error);
    discoveryStatus.textContent = localSaved
      ? 'Discovered and saved on this device; online progress could not be saved.'
      : 'Discovered for this visit only; browser and online storage are unavailable.';
  });
}
window.saveAtlasProgress = saveAtlasProgress;
function renderDiscoveryJournal() {
  journalList.replaceChildren();
  [...discovered].forEach((id) => {
    const note = document.createElement('li');
    note.textContent = celestialObjects[id].name;
    journalList.append(note);
  });
  if (!discovered.size) {
    const emptyNote = document.createElement('li');
    emptyNote.className = 'atlas-journal__empty';
    emptyNote.textContent = 'Your discoveries will gather here.';
    journalList.append(emptyNote);
  }
  countLabel.textContent = String(discovered.size);
  journalCount.textContent = String(discovered.size);
}

try {
  const saved = JSON.parse(localStorage.getItem(atlasStorageKey) || 'null');
  if (saved?.version === 1 && Array.isArray(saved.discovered)) {
    saved.discovered.forEach((id) => {
      if (Object.hasOwn(celestialObjects, id)) discovered.add(id);
    });
    puzzleConstellation = Object.hasOwn(celestialObjects, saved.puzzleConstellation)
      ? saved.puzzleConstellation
      : null;
    puzzleComplete = saved.puzzleComplete === true && puzzleConstellation !== null;
  }
} catch (error) {
  atlasStorageAvailable = false;
  console.error('Could not read this device’s Dream Atlas notes:', error);
}
renderDiscoveryJournal();

objectButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const object = celestialObjects[button.dataset.object];
    if (!object) return;
    selectPuzzle(button.dataset.object);

    objectButtons.forEach((item) => {
      const isSelected = item === button;
      item.setAttribute('aria-pressed', String(isSelected));
      item.classList.toggle('is-selected', isSelected);
    });

    objectName.textContent = object.name;
    description.textContent = object.description;
    discovery.textContent = object.discovery;
    discoveryStatus.textContent = discovered.has(selectedObject)
      ? 'This constellation is already in your field notes.'
      : '';
  });
});

gameReset.addEventListener('click', () => {
  const wasCompleted = puzzleComplete;
  puzzleComplete = false;
  puzzleConstellation = selectedObject;
  resetPuzzle(`Puzzle reset. Tap star 1 to connect ${celestialObjects[selectedObject].name}.`);
  if (wasCompleted) saveAtlasProgress();
  gameStarsContainer.querySelector('.atlas-game__star')?.focus({ preventScroll: true });
});

if (window.DearPipProgress) {
  const versionAtLoad = atlasProgressChangeVersion;
  window.DearPipProgress.load('atlas', atlasProgressSnapshot()).then(({ data, persistent }) => {
    const remote = data || atlasProgressSnapshot();
    if (atlasProgressChangeVersion !== versionAtLoad) {
      remote.discovered = [...new Set([...remote.discovered, ...discovered])];
      remote.puzzleComplete = puzzleComplete;
      remote.puzzleConstellation = puzzleConstellation;
    }
    discovered.clear();
    remote.discovered.forEach((id) => { if (Object.hasOwn(celestialObjects, id)) discovered.add(id); });
    const remotePuzzleConstellation = Object.hasOwn(celestialObjects, remote.puzzleConstellation)
      ? remote.puzzleConstellation
      : null;
    if (selectedObject) {
      if (remotePuzzleConstellation !== selectedObject) {
        puzzleConstellation = selectedObject;
        puzzleComplete = false;
      }
    } else {
      puzzleConstellation = remotePuzzleConstellation;
      puzzleComplete = remote.puzzleComplete === true && puzzleConstellation !== null;
    }
    try {
      localStorage.setItem(atlasStorageKey, JSON.stringify(atlasProgressSnapshot()));
    } catch (_error) {
      atlasStorageAvailable = false;
      console.error('Could not cache Dream Atlas progress in this browser.');
    }
    renderDiscoveryJournal();
    objectButtons.forEach((button) => {
      if (discovered.has(button.dataset.object)) button.classList.add('is-discovered');
    });
    if (!persistent && !discoveryStatus.textContent) {
      discoveryStatus.textContent = atlasStorageAvailable
        ? 'Online progress is unavailable; showing discoveries saved on this device.'
        : 'Saved progress is unavailable; discoveries will last only for this visit.';
    }
    if (atlasProgressChangeVersion !== versionAtLoad) saveAtlasProgress();
  }).catch((error) => {
    console.error('Could not load Dream Atlas activity progress:', error);
    discoveryStatus.textContent = atlasStorageAvailable
      ? 'Online progress is unavailable; showing discoveries saved on this device.'
      : 'Saved progress is unavailable; discoveries will last only for this visit.';
  });
}

const pipCanvas = document.querySelector('#atlasPipCanvas');
const pipButton = document.querySelector('#atlasPipButton');
const pipEyes = document.querySelectorAll('.atlas-companion .pip-eye');
const pipToast = document.querySelector('#atlasToast');
const pipAnimationName = 'Pip In Action 2';
let pipRive;
let pipAnimationPending = false;
let pipToastTimer;

pipButton.addEventListener('click', () => {
  if (!pipRive) {
    pipAnimationPending = true;
  } else if (pipRive.animationNames.includes(pipAnimationName)) {
    pipRive.play(pipAnimationName);
  }

  pipToast.textContent = 'Pip says: every star has a story! ✦';
  pipToast.classList.add('is-visible');
  window.clearTimeout(pipToastTimer);
  pipToastTimer = window.setTimeout(() => pipToast.classList.remove('is-visible'), 2400);
});

pipButton.addEventListener('pointermove', (event) => {
  if (event.pointerType === 'touch') return;
  pipEyes.forEach((eye) => {
    const pupil = eye.querySelector('.pip-pupil');
    if (!pupil) return;

    const rect = eye.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const angle = Math.atan2(dy, dx);
    const distance = Math.min(4, Math.hypot(dx, dy) / 12);
    pupil.style.transform = `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px)`;
  });
});

pipButton.addEventListener('pointerleave', () => {
  pipEyes.forEach((eye) => {
    const pupil = eye.querySelector('.pip-pupil');
    if (pupil) pupil.style.transform = 'translate(0, 0)';
  });
});

if (pipCanvas && window.rive) {
  pipRive = new rive.Rive({
    src: 'assets/pip-body.riv',
    canvas: pipCanvas,
    autoplay: false,
    animations: [pipAnimationName],
    layout: new rive.Layout({
      fit: rive.Fit.Contain,
      alignment: rive.Alignment.Center,
    }),
    onLoad: () => {
      pipRive.resizeDrawingSurfaceToCanvas();
      if (!pipRive.animationNames.includes(pipAnimationName)) {
        console.error(`Rive animation "${pipAnimationName}" was not found. Available animations:`, pipRive.animationNames);
      } else if (pipAnimationPending) {
        pipAnimationPending = false;
        pipRive.play(pipAnimationName);
      }
    },
    onLoadError: (error) => {
      console.error('Rive failed to load:', error);
    },
  });

  window.addEventListener('resize', () => pipRive.resizeDrawingSurfaceToCanvas());
} else if (pipCanvas) {
  console.error('Rive runtime did not load; Pip’s animation is unavailable.');
}
