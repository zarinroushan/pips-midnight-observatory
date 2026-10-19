const $ = (selector) => document.querySelector(selector);
const pipStage = $('#pipStage');
const pipButton = $('#pipButton');
const starField = $('#starField');
const starCount = $('#starCount');
const collectionIcon = $('#collectionIcon');
const collectionLabel = $('#collectionLabel');
const collectionLimit = $('#collectionLimit');
const bottomHint = $('#bottomHint');
const discovery = $('#discovery');
const journal = $('#journal');
const journalButton = $('#journalButton');
const toast = $('#toast');
const homeProgressKey = 'dear-pip-home-progress-v1';
const collectedStars = new Set();
const collectedButterflies = new Set();
let collectionChangeVersion = 0;
let toastTimer;
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

try {
  const savedProgress = JSON.parse(localStorage.getItem(homeProgressKey) || 'null');
  if (savedProgress?.version === 1 && Array.isArray(savedProgress.collected)) {
    savedProgress.collected.forEach((index) => {
      if (Number.isInteger(index) && index >= 0 && index < 5) collectedStars.add(index);
    });
    if (Array.isArray(savedProgress.collectedButterflies)) {
      savedProgress.collectedButterflies.forEach((index) => {
        if (Number.isInteger(index) && index >= 0 && index < 2) collectedButterflies.add(index);
      });
    }
  }
} catch (error) {
  console.error('Could not read this device’s nursery collection progress:', error);
}

function saveCollectionProgress() {
  collectionChangeVersion += 1;
  const progress = {
    version: 1,
    collected: [...collectedStars],
    collectedButterflies: [...collectedButterflies],
  };
  try {
    localStorage.setItem(homeProgressKey, JSON.stringify(progress));
  } catch (error) {
    console.error('Could not save this device’s nursery collection progress:', error);
  }
  window.DearPipProgress?.save('home', progress).catch((error) => {
    console.error('Could not sync nursery collection progress:', error);
  });
}

function homeProgressSnapshot() {
  return { version: 1, collected: [...collectedStars], collectedButterflies: [...collectedButterflies] };
}

function applyHomeProgress(progress) {
  collectedStars.clear();
  (progress?.collected || []).forEach((index) => collectedStars.add(index));
  collectedButterflies.clear();
  (progress?.collectedButterflies || []).forEach((index) => collectedButterflies.add(index));
  document.querySelectorAll('[data-star-index]').forEach((button) => {
    if (collectedStars.has(Number(button.dataset.starIndex))) button.remove();
  });
  document.querySelectorAll('[data-butterfly]').forEach((button) => {
    if (collectedButterflies.has(Number(button.dataset.butterfly))) button.remove();
  });
  try {
    localStorage.setItem(homeProgressKey, JSON.stringify(homeProgressSnapshot()));
  } catch (_error) {
    // PostgreSQL remains the primary copy when browser storage is unavailable.
  }
  updateCollectionMode();
}

function updateCollectionMode() {
  const isMoonlight = document.documentElement.dataset.mood === 'dawn';
  collectionIcon.textContent = isMoonlight ? '❀' : '✦';
  collectionLabel.textContent = isMoonlight ? 'BUTTERFLIES COLLECTED' : 'STARS COLLECTED';
  collectionLimit.textContent = isMoonlight ? '/ 2' : '/ 5';
  bottomHint.firstChild.textContent = isMoonlight
    ? 'TAP A BUTTERFLY TO COLLECT IT '
    : 'TAP A STAR TO COLLECT IT ';
  starField.setAttribute('aria-label', isMoonlight ? 'Collect the stars (Midnight mode)' : 'Collect the stars');
  starCount.textContent = String(isMoonlight ? collectedButterflies.size : collectedStars.size);
}

updateCollectionMode();
new MutationObserver(updateCollectionMode).observe(document.documentElement, {
  attributes: true,
  attributeFilter: ['data-mood'],
});

const starMessages = [
  { title: 'A lullaby in a bottle', text: 'Pip keeps tiny melodies for nights that need a little softness.' },
  { title: 'A lantern for lost dreams', text: 'Some dreams wander off. Pip leaves a little light to help them find their way home.' },
  { title: 'A letter from the moon', text: 'The moon says you are doing better than you think. Keep that one.' },
  { title: 'Cloud mail!', text: 'A very fluffy envelope just arrived. It smells faintly of vanilla and stardust.' },
  { title: 'Dream collector badge!', text: 'You found all five stars. Pip officially appoints you Assistant Dream Finder.' }
];

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2400);
}
function openDiscovery(message, eyebrow = 'A LITTLE DISCOVERY') {
  $('#discoveryEyebrow').textContent = eyebrow;
  $('#discoveryTitle').textContent = message.title;
  $('#discoveryText').textContent = message.text;
  discovery.classList.add('is-open');
  discovery.setAttribute('aria-hidden', 'false');
}
function closeDiscovery() {
  discovery.classList.remove('is-open');
  discovery.setAttribute('aria-hidden', 'true');
}
function collectStar(button, index) {
  if (collectedStars.has(index)) return;
  collectedStars.add(index);
  window.DearPipSounds?.play('star-collect');
  saveCollectionProgress();
  button.classList.add('collected');
  const pipRect = $('#pipCharacter')?.getBoundingClientRect();
  const starRect = button.getBoundingClientRect();
  if (pipRect) {
    button.style.setProperty('--dx', `${pipRect.left + pipRect.width / 2 - starRect.left}px`);
    button.style.setProperty('--dy', `${pipRect.top + pipRect.height / 2 - starRect.top}px`);
  }
  updateCollectionMode();
  setTimeout(() => button.remove(), 780);
  setTimeout(() => {
    openDiscovery(
      starMessages[Math.min(collectedStars.size - 1, starMessages.length - 1)],
      collectedStars.size === 5
        ? 'DREAM FINDER LEVEL UP'
        : `STAR ${String(collectedStars.size).padStart(2, '0')} / 05 COLLECTED`,
    );
    if (pipStage) {
      pipStage.classList.remove('is-wiggling');
      void pipStage.offsetWidth;
      pipStage.classList.add('is-wiggling');
    }
  }, 420);
  if (collectedStars.size === 5) showToast('All five dream stars found ✦');
}

for (let i = 0; i < 5; i += 1) {
  const button = document.createElement('button');
  button.className = 'star';
  button.dataset.starIndex = String(i);
  button.type = 'button';
  button.textContent = i % 2 === 0 ? '✦' : '✧';
  button.setAttribute('aria-label', `Collect dream star ${i + 1}`);
  button.style.setProperty('--delay', `${i * -0.65}s`);
  button.style.setProperty('--duration', `${3.2 + (i % 3) * 0.7}s`);
  if (collectedStars.has(i)) {
    button.remove();
    continue;
  }
  button.addEventListener('click', () => collectStar(button, i));
  starField.append(button);
}

function collectButterfly(button, index) {
  if (document.documentElement.dataset.mood !== 'dawn' || collectedButterflies.has(index)) return;
  collectedButterflies.add(index);
  saveCollectionProgress();
  updateCollectionMode();
  window.DearPipSounds?.play('butterfly-collect');
  button.classList.add('is-collected');
  button.setAttribute('aria-label', 'Butterfly collected');
  const pipRect = $('#pipCharacter')?.getBoundingClientRect();
  const butterflyRect = button.getBoundingClientRect();
  if (pipRect) {
    button.style.setProperty('--dx', `${pipRect.left + pipRect.width / 2 - butterflyRect.left}px`);
    button.style.setProperty('--dy', `${pipRect.top + pipRect.height / 2 - butterflyRect.top}px`);
  }
  showToast('A little butterfly joined your collection!');
  setTimeout(() => button.remove(), 720);
}

document.querySelectorAll('[data-butterfly]').forEach((button) => {
  const index = Number(button.dataset.butterfly);
  if (collectedButterflies.has(index)) {
    button.remove();
    return;
  }
  button.setAttribute('aria-label', `Collect butterfly ${index + 1} of 2`);
  button.addEventListener('click', () => collectButterfly(button, index));
});

if (pipButton) {
  pipButton.addEventListener('click', () => {
    const jumpPlayback = window.DearPipHero?.jump();
    if (jumpPlayback) {
      pipButton.disabled = true;
      const restorePipButton = () => {
        if (pipButton.isConnected) pipButton.disabled = false;
      };
      jumpPlayback.then(restorePipButton, restorePipButton);
    }
    window.DearPipSounds?.play('pip-hello');
    showToast('Hi, dreamer! Pip is so happy you’re here. ✨');
  });
}
const exploreButton = $('#exploreButton');
const portalTransition = $('#portalTransition');
let isLaunching = false;
if (exploreButton) {
  exploreButton.addEventListener('click', () => {
    if (isLaunching) return;
    isLaunching = true;
    exploreButton.disabled = true;
    exploreButton.setAttribute('aria-busy', 'true');
    pipStage?.classList.remove('is-wiggling');

    const reducedMotion = prefersReducedMotion.matches;
    const jumpPlayback = reducedMotion ? null : window.DearPipHero?.jump();
    const transitionDelay = jumpPlayback ? 360 : 0;
    const navigationDelay = reducedMotion ? 80 : (jumpPlayback ? 760 : 1120);

    window.DearPipSounds?.play('portal-open');
    try {
      sessionStorage.setItem('dear-pip-dreamworld-arrival-v1', 'welcome');
    } catch (error) {
      console.error('Could not save the one-time Dreamworld arrival cue:', error);
    }

    window.setTimeout(() => {
      pipStage?.classList.add('is-launching');
      portalTransition?.classList.add('is-active');
      portalTransition?.setAttribute('aria-hidden', 'false');
      window.setTimeout(() => window.location.assign('dreamworld.html'), navigationDelay);
    }, transitionDelay);
  });
}
document.querySelectorAll('.nursery-portal').forEach((link) => {
  link.addEventListener('click', () => {
    window.DearPipSounds?.play(link.getAttribute('href') === 'workshop.html' ? 'workshop-open' : 'portal-select');
  });
});
$('#discoveryNext').addEventListener('click', closeDiscovery);
$('#closeDiscovery').addEventListener('click', closeDiscovery);
if (journalButton) {
  journalButton.addEventListener('click', () => {
    journal.classList.add('is-open');
    journal.setAttribute('aria-hidden', 'false');
  });
}
$('#closeJournal').addEventListener('click', () => {
  journal.classList.remove('is-open');
  journal.setAttribute('aria-hidden', 'true');
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeDiscovery();
    journal.classList.remove('is-open');
    journal.setAttribute('aria-hidden', 'true');
  }
});

// Browsers block audible autoplay. The background stays muted by default;
// this button only controls sound if the chosen video contains an audio track.









/* =========================================
   AUTOMATIC VELVET CURTAIN INTRO
========================================= */

const curtainIntro = document.querySelector("#curtainIntro");

if (curtainIntro) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const skipCurtain = new URLSearchParams(window.location.search).has('skipCurtain');
  if (skipCurtain) {
    curtainIntro.classList.add('is-gone');
    curtainIntro.setAttribute('aria-hidden', 'true');
  } else {
    window.setTimeout(() => {
      curtainIntro.classList.add("is-gone");
      curtainIntro.setAttribute("aria-hidden", "true");
      window.DearPipSounds?.queue('curtain-open');
    }, reducedMotion ? 100 : 6000);
  }
}

if (window.DearPipProgress) {
  const versionAtLoad = collectionChangeVersion;
  window.DearPipProgress.load('home', homeProgressSnapshot()).then(({ data }) => {
    const changedWhileLoading = collectionChangeVersion !== versionAtLoad;
    if (changedWhileLoading) {
      const latest = homeProgressSnapshot();
      applyHomeProgress({
        version: 1,
        collected: [...new Set([...(data?.collected || []), ...latest.collected])],
        collectedButterflies: [...new Set([...(data?.collectedButterflies || []), ...latest.collectedButterflies])],
      });
      saveCollectionProgress();
      return;
    }
    applyHomeProgress(data || homeProgressSnapshot());
  });
}
