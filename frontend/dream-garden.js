const gardenStorageKey = 'dear-pip-dream-garden-v1';
const gardenDreamStorageKey = 'dear-pip-dream-garden-dreams-v1';
const gardenApiMeta = document.querySelector('meta[name="dear-pip-api-base"]');
const configuredGardenApiBase = gardenApiMeta?.content.trim();
const isLocalGardenFrontend = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const gardenApiBase = isLocalGardenFrontend
  ? `http://${window.location.hostname}:5000`
  : configuredGardenApiBase
    ? configuredGardenApiBase.replace(/\/+$/, '')
    : null;
const seeds = {
  moonblush: { id: 'moonblush', name: 'Moonblush', description: 'A soft pink flower for gentle dreams.', color: '#f3a9c4', mark: '✿' },
  sunpocket: { id: 'sunpocket', name: 'Sunpocket', description: 'A golden bloom that keeps a little sunshine.', color: '#f4cf78', mark: '✦' },
  cloudbell: { id: 'cloudbell', name: 'Cloudbell', description: 'A lilac bellflower that hums in the breeze.', color: '#c4a4ee', mark: '✿' },
  starfern: { id: 'starfern', name: 'Starfern', description: 'A leafy sprout dotted with tiny stars.', color: '#9bd2ad', mark: '✧' },
  dreamrose: { id: 'dreamrose', name: 'Dreamrose', description: 'A dusky rose with petals like velvet.', color: '#df83ae', mark: '✿' },
};
const creatures = {
  moth: {
    name: 'Lumi',
    title: 'Guardian of Hope',
    description: 'The little butterfly fairy who guides wishes toward their brightest possibilities. Lumi brings courage, wonder, and a little sparkle to dreams that feel far away.',
    personality: 'Cheerful, curious, encouraging.',
    image: 'assets/garden-animals/Lumi.png',
    wish: 'She dreams of carrying a soft goodnight light to every flower that feels lonely.',
    story: 'When the moon hides behind a cloud, Lumi visits the garden blooms one by one, leaving a shimmer so they know the night is still kind.',
    invention: 'Pip imagines a pocket-sized Moonbeam Lantern that gathers stray moonlight and lets Lumi sprinkle it along her evening route.',
    dreamSeed: 'moonblush',
  },
  snail: {
    name: 'Nova',
    title: 'Guardian of Patience',
    description: 'A dreamy little snail whose shell holds a miniature night sky. Nova watches over slow-growing dreams and reminds you that there is no deadline for becoming who you want to be.',
    personality: 'Calm, thoughtful, dependable.',
    image: 'assets/garden-animals/Nova.png',
    wish: 'He wishes to visit the far side of the garden without leaving his cozy dandelion home behind.',
    story: 'Each evening, Nova sets off toward the pond, but pauses to help every seedling along the way.',
    invention: 'Pip imagines a tiny Starlight Seed-Cart: a gentle rolling nook that carries Nova and her starry shell over the garden paths.',
    dreamSeed: 'starfern',
  },
  rabbit: {
    name: 'Mochi',
    title: 'Guardian of Peace',
    description: 'A sleepy bunny who keeps the garden soft and safe. Mochi looks after wishes about rest, comfort, healing, and feeling at home in your own little world.',
    personality: 'Gentle, sleepy, affectionate.',
    image: 'assets/garden-animals/Mochi.png',
    wish: 'Mochi hopes to make a sheltered nook where shy garden friends can feel safe.',
    story: 'At dusk, Mochi follows the warm lanterns and leaves a little clover beside each quiet burrow.',
    invention: 'Pip imagines a Cloverlight Shelter: a tiny leafy nook with a gentle glow for night visitors.',
    dreamSeed: 'sunpocket',
  },
  fox: {
    name: 'Ember',
    title: 'Guardian of Courage',
    description: 'A gentle fox who protects brave dreams and reminds you that small steps count. Ember looks after wishes about trying something new and believing in yourself.',
    personality: 'Brave, loyal, quietly playful.',
    image: 'assets/garden-animals/Ember.png',
    wish: 'Ember dreams of a path that helps every wandering friend find their way home.',
    story: 'When fog settles over the garden, Ember leaves tiny lantern marks along the safe path.',
    invention: 'Pip imagines a Startrail Compass: a pocket guide that glows softly near familiar places.',
    dreamSeed: 'dreamrose',
  },
  bird: {
    name: 'Pippa',
    title: 'Guardian of Joy',
    description: 'A tiny songbird who carries happy thoughts through the garden. Pippa looks after wishes about friendship, laughter, creativity, and finding your own voice.',
    personality: 'Affectionate, bubbly, expressive.',
    image: 'assets/garden-animals/Pippa.png',
    wish: 'The little bird hopes every garden friend can hear a soothing song at bedtime.',
    story: 'Before the stars appear, Pippa sings one soft note to each flower on the hill.',
    invention: 'Pip imagines a Petal Music Box that gathers the bird’s melody and plays it beside sleepy blooms.',
    dreamSeed: 'cloudbell',
  },
};
const legacyCreatureIds = new Set(['sprite']);
const legacyCreature = { name: 'Garden friend', icon: '✧', dreamSeed: 'cloudbell' };
const creatureInfo = (id) => creatures[id] || (legacyCreatureIds.has(id) ? legacyCreature : null);
const validCreatureIds = new Set([...Object.keys(creatures), ...legacyCreatureIds]);

const plotRoot = document.querySelector('#gardenPlots');
const seedRoot = document.querySelector('#gardenSeedList');
const plantButton = document.querySelector('#gardenPlantButton');
const feedback = document.querySelector('#gardenFeedback');
const flowerCount = document.querySelector('#gardenFlowerCount');
const creatureCount = document.querySelector('#gardenCreatureCount');
const flowerJournal = document.querySelector('#gardenFlowerJournal');
const creatureJournal = document.querySelector('#gardenCreatureJournal');
const fulfilledDreamJournal = document.querySelector('#gardenFulfilledDreamJournal');
const privateDreamLoadStatus = document.querySelector('#gardenPrivateDreamLoadStatus');
const privateDreamForm = document.querySelector('#gardenPrivateDreamForm');
const gardenResetButton = document.querySelector('#gardenReset');
const privateDreamInput = document.querySelector('#gardenPrivateDream');
const privateDreamCreature = document.querySelector('#gardenPrivateDreamCreature');
const privateDreamStatus = document.querySelector('#gardenPrivateDreamStatus');
const privateDreamJournal = document.querySelector('#gardenPrivateDreamJournal');
const wishStarRoot = document.querySelector('#gardenWishStars');
const wishStarCount = document.querySelector('#gardenWishStarCount');
const wishDetail = document.querySelector('#gardenWishDetail');
const wishDetailTitle = document.querySelector('#gardenWishDetailTitle');
const wishDetailDream = document.querySelector('#gardenWishDetailDream');
const wishDetailIcon = document.querySelector('#gardenWishDetailIcon');
const wishDetailEmoji = document.querySelector('#gardenWishDetailEmoji');
const wishDetailAnimal = document.querySelector('#gardenWishDetailAnimal');
const wishDetailDate = document.querySelector('#gardenWishDetailDate');
const wishDetailClose = document.querySelector('#gardenWishDetailClose');
const pipGreeting = document.querySelector('#gardenPipGreeting');
const selectedGuardianImage = document.querySelector('#gardenSelectedGuardianImage');
const selectedGuardianEmoji = document.querySelector('#gardenSelectedGuardianEmoji');
const selectedGuardianName = document.querySelector('#gardenSelectedGuardianName');
const selectedGuardianTitle = document.querySelector('#gardenSelectedGuardianTitle');
const selectedGuardianDescription = document.querySelector('#gardenSelectedGuardianDescription');
const selectedGuardianWishCount = document.querySelector('#gardenSelectedGuardianWishCount');
const selectedGuardianPrivateWishes = document.querySelector('#gardenSelectedGuardianPrivateWishes');
const syncStatus = document.querySelector('#gardenSyncStatus');
const guestbookForm = document.querySelector('#gardenGuestbookForm');
const guestbookName = document.querySelector('#gardenGuestbookName');
const guestbookMessage = document.querySelector('#gardenGuestbookMessage');
const guestbookSubmit = document.querySelector('#gardenGuestbookSubmit');
const guestbookStatus = document.querySelector('#gardenGuestbookStatus');
const guestbookEntries = document.querySelector('#gardenGuestbookEntries');
const dreamPanel = document.querySelector('#gardenDreamPanel');
const dreamName = document.querySelector('#gardenDreamName');
const dreamPortrait = document.querySelector('#gardenDreamPortrait');
const dreamEmoji = document.querySelector('#gardenDreamEmoji');
const dreamGuardianTitle = document.querySelector('#gardenDreamGuardianTitle');
const dreamWishCount = document.querySelector('#gardenDreamWishCount');
const dreamDescription = document.querySelector('#gardenDreamDescription');
const dreamPersonality = document.querySelector('#gardenDreamPersonality');
const dreamWish = document.querySelector('#gardenDreamWish');
const dreamStory = document.querySelector('#gardenDreamStory');
const dreamInvention = document.querySelector('#gardenDreamInvention');
const discoveredCreatures = new Set();
const legacyFulfilledCreatureIds = new Set();
let fulfilledWishes = [];
let dreamJournal = [];
const confirmedWishIds = new Set();
const pendingWishRemovalIds = new Set();
const pendingWishRemovalEntries = new Map();
const guardianWishCounts = new Map();
let guardianWishCountsRequest = 0;
const wishStarPositions = new Map();
let gardenCreatureLayout = {};
let activeWishDetailsId = null;
let wishDetailsReturnFocus = null;
const wishStarSlots = (() => {
  const creatures = [
    { x: 15, y: 42, rx: 8, ry: 13 },
    { x: 54, y: 65, rx: 8, ry: 13 },
    { x: 90, y: 46, rx: 8, ry: 13 },
    { x: 30, y: 72, rx: 8, ry: 13 },
    { x: 48, y: 39, rx: 8, ry: 13 },
    { x: 69, y: 34, rx: 8, ry: 13 },
    { x: 83.5, y: 19, rx: 15, ry: 22 },
  ];
  const slots = [];
  [9, 16, 23, 30, 37].forEach((top) => {
    for (let left = 7; left <= 95; left += 6) {
      if (top <= 22 && left <= 43) continue;
      const overlapsLandmark = creatures.some((landmark) => (
        ((left - landmark.x) / landmark.rx) ** 2 + ((top - landmark.y) / landmark.ry) ** 2 < 1.15
      ));
      if (!overlapsLandmark) slots.push({ left, top });
    }
  });
  return slots;
})();
let plots = Array(5).fill(null);
let plotDreamOwners = Array(5).fill(null);
let selectedSeed = null;
let selectedCreatureId = null;
let storageAvailable = true;
let dreamStorageAvailable = true;
let localGardenDataInvalid = false;
let localDreamDataInvalid = false;
let pendingReset = false;
let gardenSessionReady = false;
let gardenRevision = 0;
let gardenSyncReady = false;
let gardenSyncPending = false;
let gardenPersistedVersion = 0;
let gardenSyncTimer = null;
let gardenSyncChain = Promise.resolve();
let gardenChangeVersion = 0;
let gardenSyncRetryTimer = null;
let fulfillmentPending = false;

function setSyncStatus(message, state = '') {
  syncStatus.textContent = message;
  syncStatus.dataset.state = state;
}

function setGardenSavedStatus() {
  setSyncStatus('Garden saved online', 'saved');
}

function createGardenRecordId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  if (!window.crypto?.getRandomValues) return null;
  const bytes = window.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function normalizeCreatureLayout(layout) {
  const normalized = {};
  if (!layout || typeof layout !== 'object' || Array.isArray(layout)) return normalized;
  Object.entries(layout).forEach(([id, position]) => {
    if (!Object.hasOwn(creatures, id) || !position || typeof position !== 'object') return;
    const { x, y, scale } = position;
    if ([x, y, scale].some((value) => typeof value !== 'number' || !Number.isFinite(value))
      || x < 0 || x > 100 || y < 0 || y > 100 || scale < 0.65 || scale > 1.5) return;
    normalized[id] = { x, y, scale };
  });
  return normalized;
}

function gardenStateSnapshot() {
  return {
    version: 1,
    plots: plots.map((plot) => plot ? { seed: plot.seed, stage: plot.stage } : null),
    creatures: [...discoveredCreatures],
    plotOwners: [...plotDreamOwners],
    fulfilled: [...legacyFulfilledCreatureIds],
    dreamJournal: dreamJournal.slice(-20),
    fulfilledWishes: fulfilledWishes.map((entry) => ({ ...entry })),
    creatureLayout: Object.fromEntries(
      Object.entries(gardenCreatureLayout).map(([id, position]) => [id, { ...position }]),
    ),
  };
}

function normalizeGardenState(state) {
  if (!state || state.version !== 1 || !Array.isArray(state.plots) || state.plots.length !== 5
    || !Array.isArray(state.creatures) || !Array.isArray(state.plotOwners) || state.plotOwners.length !== 5
    || !Array.isArray(state.fulfilled)
    || (state.fulfilledWishes !== undefined && !Array.isArray(state.fulfilledWishes))) return null;
  const validCreatures = validCreatureIds;
  const validSeeds = new Set(Object.keys(seeds));
  if (state.creatures.some((id) => !validCreatures.has(id))
    || state.fulfilled.some((id) => !validCreatures.has(id))) return null;
  const nextPlots = state.plots.map((plot) => (
    plot && validSeeds.has(plot.seed) && Number.isInteger(plot.stage) && plot.stage >= 0 && plot.stage <= 2
      ? { seed: plot.seed, stage: plot.stage }
      : null
  ));
  const nextOwners = state.plotOwners.map((owner, index) => (
    nextPlots[index] && validCreatures.has(owner) ? owner : null
  ));
  const journal = Array.isArray(state.dreamJournal) ? state.dreamJournal : [];
  if (journal.length > 20 || journal.some((entry) => (
    !entry || typeof entry.id !== 'string' || typeof entry.wish !== 'string'
    || !entry.wish.trim() || entry.wish.length > 250 || !validCreatures.has(entry.creature)
    || typeof entry.createdAt !== 'string' || Number.isNaN(Date.parse(entry.createdAt))
  ))) return null;
  const fulfilledArchive = state.fulfilledWishes === undefined ? [] : state.fulfilledWishes;
  if (fulfilledArchive.length > 20 || fulfilledArchive.some((entry) => (
    !entry || typeof entry.id !== 'string' || !entry.id || entry.id.length > 64
    || typeof entry.wish !== 'string' || !entry.wish.trim() || entry.wish.length > 250
    || !validCreatures.has(entry.creature)
    || typeof entry.createdAt !== 'string' || Number.isNaN(Date.parse(entry.createdAt))
    || typeof entry.fulfilledAt !== 'string' || Number.isNaN(Date.parse(entry.fulfilledAt))
  ))) return null;
  const fulfilledIds = fulfilledArchive.map((entry) => entry.id);
  if (new Set(fulfilledIds).size !== fulfilledIds.length
    || fulfilledIds.some((id) => journal.some((entry) => entry.id === id))) return null;
  const normalized = {
    version: 1,
    plots: nextPlots,
    creatures: [...new Set(state.creatures)],
    plotOwners: nextOwners,
    fulfilled: [...new Set(state.fulfilled)],
    dreamJournal: journal.slice(-20).map((entry) => ({
      id: entry.id, wish: entry.wish.trim(), creature: entry.creature, createdAt: entry.createdAt,
    })),
    fulfilledWishes: fulfilledArchive.slice(-20).map((entry) => ({
      id: entry.id,
      wish: entry.wish.trim(),
      creature: entry.creature,
      createdAt: entry.createdAt,
      fulfilledAt: entry.fulfilledAt,
    })),
  };
  normalized.creatureLayout = normalizeCreatureLayout(state.creatureLayout);
  return normalized;
}

function mergeGardenStates(serverState, localState) {
  const merged = normalizeGardenState(serverState) || {
    version: 1,
    plots: Array(5).fill(null),
    creatures: [],
    plotOwners: Array(5).fill(null),
    fulfilled: [],
    dreamJournal: [],
    creatureLayout: {},
  };
  const local = normalizeGardenState(localState);
  if (!local) return { state: merged, overflow: false };
  merged.creatures = [...new Set([...merged.creatures, ...local.creatures])];
  const fulfilledIds = new Set(merged.fulfilledWishes.map((entry) => entry.id));
  const serverEntries = (merged.dreamJournal || []).filter((entry) => (
    !pendingWishRemovalIds.has(entry.id)
    && !fulfilledIds.has(entry.id)
  ));
  const serverIds = new Set(serverEntries.map((entry) => entry.id));
  const unconfirmedLocalEntries = (local.dreamJournal || []).filter((entry) => (
    !serverIds.has(entry.id)
    && !confirmedWishIds.has(entry.id)
    && !pendingWishRemovalIds.has(entry.id)
  ));
  merged.dreamJournal = [...new Map([...serverEntries, ...unconfirmedLocalEntries]
    .map((entry) => [entry.id, entry])).values()]
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)).slice(-20);
  merged.creatureLayout = { ...merged.creatureLayout, ...local.creatureLayout };
  let overflow = false;

  local.plots.forEach((plot, localIndex) => {
    if (!plot) return;
    const localOwner = local.plotOwners[localIndex];
    if (merged.plots[localIndex]
      && merged.plots[localIndex].seed === plot.seed
      && (merged.plotOwners[localIndex] === localOwner
        || !localOwner
        || !merged.plotOwners[localIndex])) {
      merged.plots[localIndex].stage = Math.max(merged.plots[localIndex].stage, plot.stage);
      merged.plotOwners[localIndex] ||= localOwner;
      return;
    }
    const destination = merged.plots[localIndex] ? merged.plots.indexOf(null) : localIndex;
    if (destination < 0) {
      overflow = true;
      return;
    }
    merged.plots[destination] = { seed: plot.seed, stage: plot.stage };
    merged.plotOwners[destination] = localOwner;
  });

  merged.fulfilled = [...new Set([...merged.fulfilled, ...local.fulfilled])];
  return { state: merged, overflow };
}

function storeGardenStateLocally(state) {
  plots = state.plots.map((plot) => plot ? { ...plot } : null);
  discoveredCreatures.clear();
  state.creatures.forEach((id) => discoveredCreatures.add(id));
  plotDreamOwners = [...state.plotOwners];
  legacyFulfilledCreatureIds.clear();
  state.fulfilled.forEach((id) => legacyFulfilledCreatureIds.add(id));
  fulfilledWishes = state.fulfilledWishes.map((entry) => ({ ...entry }));
  dreamJournal = [...(state.dreamJournal || [])];
  gardenCreatureLayout = { ...(state.creatureLayout || {}) };

  if (localGardenDataInvalid || localDreamDataInvalid) return;
  try {
    window.localStorage.setItem(gardenStorageKey, JSON.stringify({
      version: 1,
      plots,
      creatures: [...discoveredCreatures],
      creatureLayout: gardenCreatureLayout,
    }));
    window.localStorage.setItem(gardenDreamStorageKey, JSON.stringify({
      version: 1,
      plotOwners: plotDreamOwners,
      fulfilled: [...legacyFulfilledCreatureIds],
      fulfilledWishes,
      dreamJournal,
      confirmedWishIds: [...confirmedWishIds].filter((id) => dreamJournal.some((entry) => entry.id === id)),
      pendingWishRemovalIds: [...pendingWishRemovalIds],
      pendingWishRemovalEntries: [...pendingWishRemovalEntries.values()],
      resetRequested: pendingReset,
    }));
  } catch (error) {
    storageAvailable = false;
    dreamStorageAvailable = false;
    feedback.textContent = 'Garden state is loaded, but this browser could not update its local backup.';
    console.error('Could not update the local Garden backup:', error);
  }
}

function markWishIdsConfirmed(state) {
  const entries = Array.isArray(state?.dreamJournal) ? state.dreamJournal : [];
  let changed = false;
  entries.forEach((entry) => {
    if (typeof entry.id === 'string'
      && !pendingWishRemovalIds.has(entry.id)
      && !confirmedWishIds.has(entry.id)) {
      confirmedWishIds.add(entry.id);
      changed = true;
    }
  });
  if (changed) {
    persistWishSyncMetadata();
    renderWishStars();
  }
  return changed;
}

function persistWishSyncMetadata() {
  if (!dreamStorageAvailable || localDreamDataInvalid) return;
  try {
    const saved = JSON.parse(window.localStorage.getItem(gardenDreamStorageKey) || '{}');
    window.localStorage.setItem(gardenDreamStorageKey, JSON.stringify({
      ...saved,
      version: 1,
      plotOwners: plotDreamOwners,
      fulfilled: [...legacyFulfilledCreatureIds],
      fulfilledWishes,
      dreamJournal,
      confirmedWishIds: [...confirmedWishIds].filter((id) => dreamJournal.some((entry) => entry.id === id)),
      pendingWishRemovalIds: [...pendingWishRemovalIds],
      pendingWishRemovalEntries: [...pendingWishRemovalEntries.values()],
      resetRequested: pendingReset,
    }));
  } catch (error) {
    dreamStorageAvailable = false;
    console.error('Could not persist Garden wish synchronization metadata:', error);
  }
}

async function gardenApiRequest(path, options = {}) {
  if (!gardenApiBase) {
    throw new Error('The Garden API URL is not configured for this site. Please contact the site administrator.');
  }
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8000);
  const publicRequest = path.startsWith('/api/guestbook') || path === '/api/garden/wish-counts';
  try {
    return await fetch(`${gardenApiBase}${path}`, {
      ...options,
      signal: controller.signal,
      headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
      mode: 'cors',
      credentials: publicRequest ? 'omit' : 'include',
    });
  } finally {
    window.clearTimeout(timeout);
  }
}

async function readGardenApiJson(response, serviceName) {
  const contentType = response.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase();
  if (!contentType || (!contentType.includes('/json') && !contentType.endsWith('+json'))) {
    throw new Error(
      `${serviceName} returned a non-JSON response (HTTP ${response.status}). Check the configured backend URL.`,
    );
  }
  try {
    return await response.json();
  } catch {
    throw new Error(`${serviceName} returned an invalid JSON response (HTTP ${response.status}).`);
  }
}

async function fetchPrivateGardenState(request = gardenApiRequest) {
  const sessionResponse = await request('/api/garden/session');
  if (!sessionResponse.ok) {
    const result = await readGardenApiJson(sessionResponse, 'Private Garden session');
    throw new Error(result?.error || `The private Garden session could not be started (HTTP ${sessionResponse.status}).`);
  }
  const response = await request('/api/garden/state');
  const result = await readGardenApiJson(response, 'Private Garden API');
  if (!response.ok) {
    throw new Error(result?.error || `Private Garden state could not be loaded (HTTP ${response.status}).`);
  }
  return result;
}

async function requestWishFulfillment(wishId, revision, request = gardenApiRequest) {
  const response = await request(
    `/api/garden/wishes/${encodeURIComponent(wishId)}/fulfill`,
    {
      method: 'POST',
      body: JSON.stringify({ revision }),
    },
  );
  const result = await readGardenApiJson(response, 'Private Garden API');
  if (!response.ok) {
    throw new Error(result?.error || `This wish could not be marked fulfilled (HTTP ${response.status}).`);
  }
  return result;
}

function privateGardenLoadMessage(error) {
  return error instanceof TypeError
    ? 'Could not connect to this visitor’s private Garden session. Any wishes shown below are only from this browser’s saved copy and have not been confirmed with the server.'
    : `Private wishes could not be loaded for this visitor: ${error.message || 'Garden session unavailable.'}`;
}

function scheduleGardenSync(delay = 500) {
  gardenSyncPending = true;
  gardenResetButton.disabled = true;
  if (!gardenSyncReady) return;
  window.clearTimeout(gardenSyncTimer);
  gardenSyncTimer = window.setTimeout(() => {
    gardenSyncChain = gardenSyncChain.then(syncGardenState, syncGardenState);
  }, delay);
}

function scheduleGardenSyncRetry() {
  window.clearTimeout(gardenSyncRetryTimer);
  gardenSyncRetryTimer = window.setTimeout(() => {
    if (!gardenSyncReady) initializeGardenSync();
    else if (gardenSyncPending) scheduleGardenSync(0);
  }, 15000);
}

async function syncGardenState() {
  if (!gardenSyncPending || !gardenSyncReady || !gardenSessionReady) return;
  for (let attempt = 0; attempt < 3 && gardenSyncPending; attempt += 1) {
    const sentVersion = gardenChangeVersion;
    const localState = gardenStateSnapshot();
    setSyncStatus('Saving your garden…', 'saving');
    try {
      const response = await gardenApiRequest('/api/garden/state', {
        method: 'PUT',
        body: JSON.stringify({ revision: gardenRevision, state: localState }),
      });
      const result = await readGardenApiJson(response, 'Garden API');
      if (response.status === 409) {
        if (result.state && !normalizeGardenState(result.state)) {
          throw new Error('The server returned an invalid Garden state.');
        }
        const newlyConfirmedWishes = result.state ? markWishIdsConfirmed(result.state) : false;
        gardenRevision = result.revision;
        const merged = pendingReset
          ? { state: localState, overflow: false }
          : mergeGardenStates(result.state, localState);
        if (merged.overflow) {
          gardenSyncPending = false;
          gardenResetButton.disabled = false;
          setSyncStatus('Both gardens are full; your local garden is kept on this device and was not overwritten.', 'offline');
          return;
        }
        if (JSON.stringify(merged.state) !== JSON.stringify(localState)) {
          storeGardenStateLocally(merged.state);
          gardenChangeVersion += 1;
          render();
        } else if (newlyConfirmedWishes) {
          renderWishStars();
        }
        continue;
      }
      if (!response.ok) throw new Error('Garden save request failed.');
      gardenRevision = result.revision;
      gardenPersistedVersion = sentVersion;
      if (markWishIdsConfirmed(localState)) renderWishStars();
      if (pendingReset && sentVersion === gardenChangeVersion) {
        pendingReset = false;
        if (!localDreamDataInvalid) {
          try {
            window.localStorage.setItem(gardenDreamStorageKey, JSON.stringify({
              version: 1,
              plotOwners: plotDreamOwners,
              fulfilled: [...legacyFulfilledCreatureIds],
              fulfilledWishes,
              resetRequested: false,
            }));
          } catch (error) {
            console.error('Could not clear the local Garden reset marker:', error);
          }
        }
      }
      if (sentVersion === gardenChangeVersion) {
        gardenSyncPending = false;
        gardenResetButton.disabled = false;
        pendingWishRemovalIds.clear();
        pendingWishRemovalEntries.clear();
        for (const id of confirmedWishIds) {
          if (!dreamJournal.some((entry) => entry.id === id)) confirmedWishIds.delete(id);
        }
        persistWishSyncMetadata();
        setGardenSavedStatus();
        renderWishStars();
        renderPrivateDreams();
        loadGuardianWishCounts();
      }
    } catch (error) {
      setSyncStatus('Offline — your local garden is kept and will retry.', 'offline');
      console.error('Could not sync the Dream Garden:', error);
      scheduleGardenSyncRetry();
      return;
    }
  }
  if (gardenSyncPending) {
    setSyncStatus('Garden changed elsewhere; keeping both gardens and retrying.', 'offline');
    scheduleGardenSyncRetry();
  }
}

async function initializeGardenSync() {
  if (gardenSyncReady) return;
  setSyncStatus('Loading your saved garden…', 'loading');
  privateDreamLoadStatus.textContent = 'Loading private wishes for this visitor…';
  privateDreamLoadStatus.dataset.state = 'loading';
  try {
    const result = await fetchPrivateGardenState();
    if (result.state && !normalizeGardenState(result.state)) {
      throw new Error('The server returned an invalid Garden state.');
    }
    gardenSessionReady = true;
    privateDreamLoadStatus.textContent = '';
    privateDreamLoadStatus.dataset.state = '';
    const localState = gardenStateSnapshot();
    gardenRevision = result.revision;
    if (result.state) markWishIdsConfirmed(result.state);
    gardenPersistedVersion = gardenChangeVersion;
    const merged = pendingReset
      ? { state: localState, overflow: false }
      : result.state
        ? mergeGardenStates(result.state, localState)
        : { state: localState, overflow: false };
    const differsFromLocal = JSON.stringify(merged.state) !== JSON.stringify(localState);
    if (differsFromLocal && !merged.overflow) {
      storeGardenStateLocally(merged.state);
      gardenChangeVersion += 1;
      render();
    }
    gardenSyncReady = true;
    gardenResetButton.disabled = false;
    render();
    const shouldSave = !merged.overflow && (pendingReset
      || (result.state
        ? JSON.stringify(merged.state) !== JSON.stringify(normalizeGardenState(result.state))
        : hasGardenProgress(merged.state)));
    if (shouldSave) {
      gardenSyncPending = true;
      setSyncStatus('Keeping your garden progress in sync…', 'saving');
      scheduleGardenSync(0);
    } else if (merged.overflow) {
      gardenSyncPending = false;
      setSyncStatus('Both gardens are full; your local garden is kept on this device and was not overwritten.', 'offline');
    } else {
      setGardenSavedStatus();
    }
  } catch (error) {
    setSyncStatus('Offline — your local garden is kept and will retry.', 'offline');
    privateDreamLoadStatus.textContent = privateGardenLoadMessage(error);
    privateDreamLoadStatus.dataset.state = 'error';
    console.error('Could not load the saved Dream Garden:', error);
    scheduleGardenSyncRetry();
  }
}

function hasGardenProgress(state) {
  return state.plots.some(Boolean)
    || state.creatures.length > 0
    || state.fulfilled.length > 0
    || Boolean(state.dreamJournal?.length)
    || Boolean(Object.keys(state.creatureLayout || {}).length);
}

function renderGuestbookEntries(entries) {
  guestbookEntries.replaceChildren();
  if (!entries.length) {
    const empty = document.createElement('li');
    empty.className = 'garden-guestbook__empty';
    empty.textContent = 'No dreams have been shared yet. Be the first!';
    guestbookEntries.append(empty);
    return;
  }
  entries.forEach((entry) => {
    const item = document.createElement('li');
    item.className = 'garden-guestbook__entry';
    const author = document.createElement('strong');
    author.textContent = entry.display_name || 'Anonymous';
    const message = document.createElement('p');
    message.textContent = entry.dream_message;
    const date = document.createElement('time');
    const parsedDate = new Date(entry.created_at);
    if (!Number.isNaN(parsedDate.getTime())) {
      date.dateTime = parsedDate.toISOString();
      date.textContent = parsedDate.toLocaleDateString();
    }
    item.append(author, message, date);
    guestbookEntries.append(item);
  });
}

async function loadGuestbookEntries() {
  guestbookStatus.textContent = 'Loading shared dreams…';
  guestbookStatus.dataset.state = 'loading';
  try {
    const entries = await fetchApprovedGuestbook();
    renderGuestbookEntries(entries);
    guestbookStatus.textContent = '';
    guestbookStatus.dataset.state = '';
  } catch (error) {
    guestbookStatus.textContent = guestbookConnectionMessage(error, 'load');
    guestbookStatus.dataset.state = 'error';
    const failure = document.createElement('li');
    failure.className = 'garden-guestbook__empty';
    failure.textContent = guestbookStatus.textContent;
    guestbookEntries.replaceChildren(failure);
    console.error('Could not load approved guestbook entries:', error);
  }
}

guestbookForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!guestbookForm.reportValidity()) return;
  guestbookSubmit.disabled = true;
  guestbookStatus.textContent = 'Sending your dream…';
  guestbookStatus.dataset.state = 'loading';
  try {
    await submitGuestbookEntry({
      display_name: guestbookName.value,
      dream_message: guestbookMessage.value,
    });
    guestbookForm.reset();
    guestbookStatus.textContent = 'Your dream has been published in the Garden!';
    guestbookStatus.dataset.state = 'success';
  } catch (error) {
    guestbookStatus.textContent = guestbookConnectionMessage(error, 'submit');
    guestbookStatus.dataset.state = 'error';
  } finally {
    guestbookSubmit.disabled = false;
  }
});

async function fetchApprovedGuestbook(request = gardenApiRequest) {
  const response = await request('/api/guestbook?limit=20');
  const result = await readGardenApiJson(response, 'Guestbook API');
  if (!response.ok) {
    throw new Error(result?.error || `The guestbook could not be loaded (HTTP ${response.status}).`);
  }
  if (!Array.isArray(result.entries)) throw new Error('The guestbook returned an invalid response.');
  return result.entries;
}

async function submitGuestbookEntry(entry, request = gardenApiRequest) {
  let visitorId = null;

  try {
    const savedVisitorId = window.localStorage.getItem(
      'dear-pip-garden-visitor-v1'
    );

    if (
      savedVisitorId &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(savedVisitorId)
    ) {
      visitorId = savedVisitorId;
    }
  } catch (error) {
    console.warn('Visitor ID is unavailable; submitting anonymously.', error);
  }

  const payload = {
    display_name: entry.display_name?.trim() || null,
    dream_message: entry.dream_message.trim(),
  };
  if (visitorId) payload.visitor_id = visitorId;

  const response = await request('/api/guestbook', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  const result = await readGardenApiJson(response, 'Guestbook API');

  if (!response.ok) {
    throw new Error(
      result?.error ||
      `Your dream could not be sent (HTTP ${response.status}).`
    );
  }

  if (!['approved', 'pending'].includes(result?.entry?.status)) {
    throw new Error(
      'The guestbook did not confirm publication. Please try again later.'
    );
  }

  return result;
}

function guestbookConnectionMessage(error, action) {
  if (error?.name === 'AbortError') {
    return action === 'load'
      ? 'Loading approved dreams timed out. Please try again.'
      : 'Sending timed out before the guestbook confirmed your note. Please check back before retrying.';
  }
  if (error instanceof TypeError) {
    return 'Could not connect to the guestbook API. Check your connection and the site’s cross-origin API configuration.';
  }
  return error?.message || (
    action === 'load'
      ? 'Approved dreams could not be loaded right now.'
      : 'Your dream could not be sent. Please try again.'
  );
}

function readSavedGarden() {
  let raw;
  try {
    raw = window.localStorage.getItem(gardenStorageKey);
  } catch (error) {
    storageAvailable = false;
    feedback.textContent = 'This browser is blocking garden storage, so your progress will last only until you leave this page.';
    console.error('Could not read the saved Dream Garden:', error);
    return;
  }
  if (!raw) return;

  try {
    const saved = JSON.parse(raw);
    if (!saved || saved.version !== 1 || !Array.isArray(saved.plots) || !Array.isArray(saved.creatures)) {
      throw new Error('Saved garden data has an unexpected shape.');
    }
    plots = Array.from({ length: 5 }, (_, index) => {
      const item = saved.plots[index];
      if (!item || !Object.hasOwn(seeds, item.seed) || !Number.isInteger(item.stage) || item.stage < 0 || item.stage > 2) {
        return null;
      }
      return { seed: item.seed, stage: item.stage };
    });
    gardenCreatureLayout = normalizeCreatureLayout(saved.creatureLayout);
    saved.creatures.forEach((id) => {
      if (validCreatureIds.has(id)) discoveredCreatures.add(id);
    });
  } catch (error) {
    plots = Array(5).fill(null);
    discoveredCreatures.clear();
    localGardenDataInvalid = true;
    feedback.textContent = 'An old garden note could not be read. Its saved copy is preserved while a fresh patch is shown.';
    console.error('Saved Dream Garden data was invalid and has been ignored:', error);
  }
}

function readSavedDreams() {
  let raw;
  try {
    raw = window.localStorage.getItem(gardenDreamStorageKey);
  } catch (error) {
    dreamStorageAvailable = false;
    feedback.textContent = 'Dream-fulfilment progress cannot be read in this browser; your existing garden is unchanged.';
    console.error('Could not read saved Dream Garden fulfilment data:', error);
    return;
  }
  if (!raw) return;

  try {
    const saved = JSON.parse(raw);
    if (!saved || saved.version !== 1 || !Array.isArray(saved.plotOwners) || !Array.isArray(saved.fulfilled)
      || (saved.dreamJournal !== undefined && (!Array.isArray(saved.dreamJournal) || saved.dreamJournal.length > 20))
      || (saved.fulfilledWishes !== undefined
        && (!Array.isArray(saved.fulfilledWishes) || saved.fulfilledWishes.length > 20))) {
      throw new Error('Saved dream data has an unexpected shape.');
    }
    dreamJournal = (saved.dreamJournal || []).filter((entry) => entry && typeof entry.id === 'string'
      && typeof entry.wish === 'string' && entry.wish.trim() && entry.wish.length <= 250
      && validCreatureIds.has(entry.creature) && typeof entry.createdAt === 'string'
      && !Number.isNaN(Date.parse(entry.createdAt))).slice(-20);
    if (Array.isArray(saved.confirmedWishIds)) {
      saved.confirmedWishIds.forEach((id) => {
        if (dreamJournal.some((entry) => entry.id === id)) confirmedWishIds.add(id);
      });
    }
    if (Array.isArray(saved.pendingWishRemovalIds)) {
      saved.pendingWishRemovalIds.forEach((id) => {
        if (typeof id === 'string' && id.length <= 64) pendingWishRemovalIds.add(id);
      });
      if (Array.isArray(saved.pendingWishRemovalEntries)) {
        saved.pendingWishRemovalEntries.forEach((entry) => {
          if (entry && pendingWishRemovalIds.has(entry.id) && confirmedWishIds.has(entry.id)
            && typeof entry.wish === 'string' && entry.wish.trim() && entry.wish.length <= 250
            && validCreatureIds.has(entry.creature) && typeof entry.createdAt === 'string'
            && !Number.isNaN(Date.parse(entry.createdAt))) {
            pendingWishRemovalEntries.set(entry.id, entry);
          }
        });
      }
      dreamJournal = dreamJournal.filter((entry) => !pendingWishRemovalIds.has(entry.id));
    }
    pendingReset = saved.resetRequested === true;
    plotDreamOwners = Array.from({ length: 5 }, (_, index) => {
      const owner = saved.plotOwners[index];
      return plots[index] && validCreatureIds.has(owner) ? owner : null;
    });
    saved.fulfilled.forEach((id) => {
      if (validCreatureIds.has(id)) legacyFulfilledCreatureIds.add(id);
    });
    fulfilledWishes = (saved.fulfilledWishes || []).filter((entry) => entry
      && typeof entry.id === 'string' && entry.id && entry.id.length <= 64
      && typeof entry.wish === 'string' && entry.wish.trim() && entry.wish.length <= 250
      && validCreatureIds.has(entry.creature)
      && typeof entry.createdAt === 'string' && !Number.isNaN(Date.parse(entry.createdAt))
      && typeof entry.fulfilledAt === 'string' && !Number.isNaN(Date.parse(entry.fulfilledAt)));
  } catch (error) {
    plotDreamOwners = Array(5).fill(null);
    legacyFulfilledCreatureIds.clear();
    fulfilledWishes = [];
    localDreamDataInvalid = true;
    feedback.textContent = 'Dream-fulfilment notes could not be read. Their saved copy is preserved while no dreams are marked complete.';
    console.error('Saved Dream Garden fulfilment data was invalid and has been ignored:', error);
  }
}

function saveDreams() {
  if (!dreamStorageAvailable || localDreamDataInvalid) {
    scheduleGardenSync();
    return;
  }
  try {
    window.localStorage.setItem(gardenDreamStorageKey, JSON.stringify({
      version: 1,
      plotOwners: plotDreamOwners,
      fulfilled: [...legacyFulfilledCreatureIds],
      fulfilledWishes,
      dreamJournal,
      confirmedWishIds: [...confirmedWishIds].filter((id) => dreamJournal.some((entry) => entry.id === id)),
      pendingWishRemovalIds: [...pendingWishRemovalIds],
      resetRequested: pendingReset,
    }));
  } catch (error) {
    dreamStorageAvailable = false;
    feedback.textContent = 'Your flowers are saved, but the browser could not save dream-fulfilment progress.';
    console.error('Could not save Dream Garden fulfilment data:', error);
  }
  scheduleGardenSync();
}

function saveGarden() {
  if (!storageAvailable || localGardenDataInvalid) {
    scheduleGardenSync();
    return;
  }
  try {
    window.localStorage.setItem(gardenStorageKey, JSON.stringify({
      version: 1,
      plots,
      creatures: [...discoveredCreatures],
    }));
  } catch (error) {
    storageAvailable = false;
    feedback.textContent = 'Your garden is still growing on this page, but the browser could not save it for next time.';
    console.error('Could not save the Dream Garden:', error);
  }
  scheduleGardenSync();
}

function createFlowerIllustration(seedId, className) {
  const seed = seeds[seedId];
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 44 44');
  svg.setAttribute('class', className);
  svg.setAttribute('aria-hidden', 'true');
  const stem = document.createElementNS(svg.namespaceURI, 'path');
  stem.setAttribute('class', 'garden-flower-illustration__stem');
  stem.setAttribute('d', 'M22 42c-2-8 3-12 0-19');
  stem.setAttribute('fill', 'none');
  stem.setAttribute('stroke', '#79a985');
  stem.setAttribute('stroke-width', '2.6');
  stem.setAttribute('stroke-linecap', 'round');
  svg.append(stem);
  const leaf = document.createElementNS(svg.namespaceURI, 'path');
  leaf.setAttribute('d', 'M21 34c-7-8-13-5-12 1 4 4 8 4 12-1m2-4c4-7 10-7 11-2-3 4-6 5-11 2');
  leaf.setAttribute('fill', '#92bd89');
  svg.append(leaf);
  if (seedId === 'starfern') {
    const fern = document.createElementNS(svg.namespaceURI, 'path');
    fern.setAttribute('d', 'M22 24 15 14m7 13 9-13m-9 7 1-13m-8 7-4-1m20 0 4-2m-12 2-5-4m5 8 6-4');
    fern.setAttribute('fill', 'none');
    fern.setAttribute('stroke', seed.color);
    fern.setAttribute('stroke-width', '2.8');
    fern.setAttribute('stroke-linecap', 'round');
    svg.append(fern);
    return svg;
  }
  const petalCount = seedId === 'dreamrose' ? 9 : seedId === 'sunpocket' ? 10 : seedId === 'cloudbell' ? 5 : 6;
  for (let index = 0; index < petalCount; index += 1) {
    const petal = document.createElementNS(svg.namespaceURI, seedId === 'cloudbell' ? 'path' : 'ellipse');
    if (seedId === 'cloudbell') {
      petal.setAttribute('d', 'M22 7c-8 1-10 8-7 13 2 3 5 4 7 4s5-1 7-4c3-5 1-12-7-13z');
      petal.setAttribute('transform', `rotate(${(index - 2) * 19} 22 17)`);
      petal.setAttribute('fill', seed.color);
      petal.setAttribute('stroke', '#f4e7ff');
      petal.setAttribute('stroke-width', '.7');
      svg.append(petal);
      break;
    }
    petal.setAttribute('cx', '22');
    petal.setAttribute('cy', seedId === 'dreamrose' && index > 4 ? '15' : '12');
    petal.setAttribute('rx', seedId === 'sunpocket' ? '2.5' : seedId === 'dreamrose' ? '4.2' : '3.8');
    petal.setAttribute('ry', seedId === 'sunpocket' ? '7' : seedId === 'dreamrose' ? '5.5' : '6.5');
    petal.setAttribute('transform', `rotate(${index * (360 / petalCount)} 22 18)`);
    petal.setAttribute('fill', seed.color);
    petal.setAttribute('stroke', seedId === 'dreamrose' ? '#f4cf78' : 'rgba(255,255,255,.65)');
    petal.setAttribute('stroke-width', '.55');
    svg.append(petal);
  }
  const center = document.createElementNS(svg.namespaceURI, 'circle');
  center.setAttribute('cx', '22');
  center.setAttribute('cy', '18');
  center.setAttribute('r', seedId === 'sunpocket' ? '3.2' : '2.7');
  center.setAttribute('fill', '#f4cf78');
  center.setAttribute('stroke', '#fff0c2');
  center.setAttribute('stroke-width', '.8');
  svg.append(center);
  return svg;
}

function createGardenPlant(seedId) {
  const plant = document.createElement('div');
  plant.className = `garden-plant garden-plant--${seedId}`;
  plant.setAttribute('aria-hidden', 'true');
  const stem = document.createElement('span');
  stem.className = 'garden-plant__stem';
  const leftLeaf = document.createElement('span');
  leftLeaf.className = 'garden-plant__leaf garden-plant__leaf--left';
  const rightLeaf = document.createElement('span');
  rightLeaf.className = 'garden-plant__leaf garden-plant__leaf--right';
  const bloom = document.createElement('span');
  bloom.className = 'garden-plant__bloom';
  const petalCount = seedId === 'sunpocket' ? 8 : seedId === 'dreamrose' ? 10 : seedId === 'starfern' ? 4 : 6;
  for (let index = 0; index < petalCount; index += 1) {
    const petal = document.createElement('i');
    petal.style.setProperty('--petal-index', String(index));
    petal.style.setProperty('--petal-angle', `${index * (360 / petalCount)}deg`);
    bloom.append(petal);
  }
  bloom.append(document.createElement('b'));
  plant.append(stem, leftLeaf, rightLeaf, bloom);
  return plant;
}

const defaultCreaturePositions = {
  wide: {
    moth: { x: 9, y: 40 }, snail: { x: 29, y: 43 }, rabbit: { x: 50, y: 40 },
    fox: { x: 71, y: 43 }, bird: { x: 91, y: 40 },
  },
  narrow: {
    moth: { x: 8, y: 20 }, snail: { x: 29, y: 21 }, rabbit: { x: 50, y: 19 },
    fox: { x: 71, y: 21 }, bird: { x: 92, y: 20 },
  },
};

function creaturePosition(id) {
  const saved = gardenCreatureLayout[id];
  const defaults = window.innerWidth <= 620 ? defaultCreaturePositions.narrow : defaultCreaturePositions.wide;
  return saved || { ...defaults[id], scale: 1 };
}

function applyGardenCreatureLayout() {
  document.querySelectorAll('.garden-creature').forEach((button) => {
    const id = button.dataset.creature;
    const position = clampCreaturePosition(button, creaturePosition(id));
    if (gardenCreatureLayout[id]) gardenCreatureLayout[id] = position;
    button.style.setProperty('--creature-x', `${position.x}%`);
    button.style.setProperty('--creature-y', `${position.y}%`);
    button.style.setProperty('--creature-scale', String(position.scale));
  });
}

function clampCreaturePosition(button, position) {
  const sceneRect = document.querySelector('#gardenScene').getBoundingClientRect();
  const scale = Math.min(1.5, Math.max(0.65, position.scale));
  const halfWidth = (button.offsetWidth * scale / 2 / sceneRect.width) * 100;
  const halfHeight = (button.offsetHeight * scale / 2 / sceneRect.height) * 100;
  return {
    x: Math.min(100 - halfWidth, Math.max(halfWidth, position.x)),
    y: Math.min(100 - halfHeight, Math.max(halfHeight, position.y)),
    scale,
  };
}

function setCreaturePosition(button, position) {
  const normalized = clampCreaturePosition(button, position);
  gardenCreatureLayout[button.dataset.creature] = normalized;
  button.style.setProperty('--creature-x', `${normalized.x}%`);
  button.style.setProperty('--creature-y', `${normalized.y}%`);
  button.style.setProperty('--creature-scale', String(normalized.scale));
}

function persistCreatureLayout() {
  gardenChangeVersion += 1;
  saveGarden();
}

function installCreatureGestures(button) {
  const pointers = new Map();
  let gesture = null;
  let suppressClickUntil = 0;

  const pointDistance = (first, second) => Math.hypot(first.x - second.x, first.y - second.y);
  const persistIfChanged = () => {
    if (!gesture?.changed) return;
    button.classList.remove('is-manipulating');
    suppressClickUntil = Date.now() + 350;
    persistCreatureLayout();
  };
  const beginPointer = (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const position = creaturePosition(button.dataset.creature);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 1) {
      gesture = {
        mode: 'pending',
        startX: event.clientX,
        startY: event.clientY,
        startPosition: { ...position },
        changed: false,
      };
    } else if (pointers.size === 2) {
      const [first, second] = [...pointers.values()];
      gesture = {
        mode: 'pinch',
        startDistance: pointDistance(first, second),
        startScale: position.scale,
        startPosition: { ...position },
        changed: false,
      };
      button.classList.add('is-manipulating');
    }
    button.setPointerCapture(event.pointerId);
  };

  button.addEventListener('pointerdown', beginPointer);
  button.addEventListener('pointermove', (event) => {
    if (!pointers.has(event.pointerId) || !gesture) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size > 1 && gesture.mode === 'pinch') {
      const [first, second] = [...pointers.values()];
      const distance = pointDistance(first, second);
      if (gesture.startDistance > 0) {
        setCreaturePosition(button, {
          ...gesture.startPosition,
          scale: gesture.startScale * distance / gesture.startDistance,
        });
        gesture.changed = true;
        event.preventDefault();
      }
      return;
    }
    if (gesture.mode === 'pending'
      && Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) >= 5) {
      gesture.mode = 'drag';
      button.classList.add('is-manipulating');
    }
    if (gesture.mode === 'drag') {
      const sceneRect = document.querySelector('#gardenScene').getBoundingClientRect();
      setCreaturePosition(button, {
        ...gesture.startPosition,
        x: gesture.startPosition.x + (event.clientX - gesture.startX) / sceneRect.width * 100,
        y: gesture.startPosition.y + (event.clientY - gesture.startY) / sceneRect.height * 100,
      });
      gesture.changed = true;
      event.preventDefault();
    }
  });
  const finishPointer = (event) => {
    if (!pointers.has(event.pointerId)) return;
    pointers.delete(event.pointerId);
    if (pointers.size === 1 && gesture?.mode === 'pinch') {
      const [, point] = [...pointers.entries()][0];
      gesture = {
        mode: 'pending',
        startX: point.x,
        startY: point.y,
        startPosition: { ...creaturePosition(button.dataset.creature) },
        changed: gesture.changed,
      };
      return;
    }
    if (pointers.size === 0) {
      persistIfChanged();
      gesture = null;
    }
  };
  button.addEventListener('pointerup', finishPointer);
  button.addEventListener('pointercancel', finishPointer);
  button.addEventListener('lostpointercapture', finishPointer);

  button.addEventListener('wheel', (event) => {
    if (!event.ctrlKey) return;
    event.preventDefault();
    const current = creaturePosition(button.dataset.creature);
    setCreaturePosition(button, { ...current, scale: current.scale * (event.deltaY < 0 ? 1.08 : 0.92) });
    persistCreatureLayout();
  }, { passive: false });

  button.addEventListener('keydown', (event) => {
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', '+', '=', '-', 'Subtract', 'Add'].includes(event.key)) return;
    event.preventDefault();
    const current = creaturePosition(button.dataset.creature);
    const step = event.shiftKey ? 5 : 2;
    const next = { ...current };
    if (event.key === 'ArrowUp') next.y -= step;
    else if (event.key === 'ArrowDown') next.y += step;
    else if (event.key === 'ArrowLeft') next.x -= step;
    else if (event.key === 'ArrowRight') next.x += step;
    else next.scale *= ['+', '=', 'Add'].includes(event.key) ? 1.08 : 0.92;
    setCreaturePosition(button, next);
    persistCreatureLayout();
  });

  button.addEventListener('click', (event) => {
    if (Date.now() < suppressClickUntil) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);
}

function renderPlots() {
  plotRoot.replaceChildren();
  plots.forEach((plot, index) => {
    const card = document.createElement('article');
    card.className = 'garden-plot';
    card.setAttribute('aria-label', `Garden plot ${index + 1}`);
    if (!plot) {
      const empty = document.createElement('span');
      empty.className = 'garden-plot__empty';
      empty.textContent = '✧';
      card.append(empty);
      return plotRoot.append(card);
    }

    const seed = seeds[plot.seed];
    card.style.setProperty('--flower-color', seed.color);
    card.classList.add(`is-stage-${plot.stage}`);
    card.append(createGardenPlant(seed.id));

    const name = document.createElement('span');
    name.className = 'garden-plot__name';
    name.textContent = seed.name;
    card.append(name);

    const stageText = ['Seed planted', 'Little sprout', 'In bloom'][plot.stage];
    const stage = document.createElement('span');
    stage.className = 'garden-plot__stage';
    stage.textContent = stageText;
    card.append(stage);

    if (plot.stage < 2) {
      const water = document.createElement('button');
      water.className = 'garden-water';
      water.type = 'button';
      water.textContent = 'Water';
      water.disabled = fulfillmentPending;
      water.setAttribute('aria-label', `Water ${seed.name}; currently ${stageText.toLowerCase()}`);
      water.addEventListener('click', () => {
        plots[index].stage += 1;
        window.DearPipSounds?.play(plots[index].stage === 2 ? 'garden-harvest' : 'garden-water');
        feedback.textContent = plots[index].stage === 2
          ? `${seed.name} opened into a little dream flower.`
          : `${seed.name} has grown a tiny sprout.`;
        saveGarden();
        render();
      });
      card.append(water);
    }
    plotRoot.append(card);
  });
}

function renderJournal(root, entries, emptyMessage) {
  root.replaceChildren();
  if (!entries.length) {
    const empty = document.createElement('li');
    empty.className = 'garden-journal-empty';
    empty.textContent = emptyMessage;
    root.append(empty);
    return;
  }
  entries.forEach((entry) => {
    const item = document.createElement('li');
    item.textContent = entry;
    root.append(item);
  });
}

function renderFulfilledDreams() {
  fulfilledDreamJournal.replaceChildren();
  if (!fulfilledWishes.length) {
    const empty = document.createElement('li');
    empty.className = 'garden-journal-empty';
    empty.textContent = 'No dreams fulfilled yet.';
    fulfilledDreamJournal.append(empty);
    return;
  }
  fulfilledWishes.slice().reverse().forEach((entry) => {
    const item = document.createElement('li');
    const wish = document.createElement('p');
    wish.textContent = entry.wish;
    const status = document.createElement('small');
    status.textContent = `Fulfilled with ${creatureInfo(entry.creature).name}`;
    const date = document.createElement('time');
    const parsedDate = new Date(entry.fulfilledAt);
    if (!Number.isNaN(parsedDate.getTime())) {
      date.dateTime = parsedDate.toISOString();
      date.textContent = parsedDate.toLocaleDateString();
    }
    item.append(wish, status, date);
    fulfilledDreamJournal.append(item);
  });
}

function render() {
  applyGardenCreatureLayout();
  gardenResetButton.disabled = !gardenSyncReady || !gardenSessionReady || gardenSyncPending || fulfillmentPending;
  renderPlots();
  const planted = plots.filter(Boolean);
  flowerCount.textContent = String(planted.length);
  const wishFriends = [...new Set(dreamJournal.map((entry) => entry.creature))];
  creatureCount.textContent = String(wishFriends.length);
  renderJournal(flowerJournal, planted.map((plot) => `${seeds[plot.seed].name} · ${['seed', 'sprout', 'bloom'][plot.stage]}`), 'No flowers planted yet.');
  renderJournal(creatureJournal, wishFriends.map((id) => creatureInfo(id).name), 'Your wish friends will appear here after you save a wish with them.');
  renderFulfilledDreams();
  renderPrivateDreams();
  renderWishStars();
  plantButton.disabled = !selectedSeed || !plots.includes(null) || fulfillmentPending;
  plantButton.textContent = !plots.includes(null)
    ? 'Every plot is planted'
    : selectedSeed
      ? `Plant ${seeds[selectedSeed].name}`
      : 'Choose a seed to plant';
}

function hashWishId(id) {
  let hash = 2166136261;
  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function eligibleWishEntries(entries, confirmedIds, pendingEntries) {
  const eligible = new Map(entries
    .filter((entry) => confirmedIds.has(entry.id))
    .map((entry) => [entry.id, entry]));
  pendingEntries.forEach((entry, id) => {
    if (confirmedIds.has(id)) eligible.set(id, entry);
  });
  return [...eligible.values()];
}

function renderWishStars() {
  const confirmedEntries = eligibleWishEntries(
    dreamJournal,
    confirmedWishIds,
    pendingWishRemovalEntries,
  );
  const activeIds = new Set(confirmedEntries.map((entry) => entry.id));
  const existingStars = new Map([...wishStarRoot.children].map((star) => [star.dataset.wishId, star]));

  if (activeWishDetailsId && !activeIds.has(activeWishDetailsId)) closeWishDetails(false);

  for (const [id, star] of existingStars) {
    if (!activeIds.has(id)) {
      star.remove();
      wishStarPositions.delete(id);
      existingStars.delete(id);
    }
  }

  const occupiedSlots = new Set(
    [...wishStarPositions].filter(([id]) => activeIds.has(id)).map(([, slotIndex]) => slotIndex),
  );
  confirmedEntries.forEach((entry) => {
    let slotIndex = wishStarPositions.get(entry.id);
    if (slotIndex === undefined) {
      const start = hashWishId(entry.id) % wishStarSlots.length;
      let bestSpacing = -1;
      let bestTieBreak = Number.POSITIVE_INFINITY;
      wishStarSlots.forEach((slot, candidate) => {
        if (occupiedSlots.has(candidate)) return;
        const spacing = occupiedSlots.size
          ? Math.min(...[...occupiedSlots].map((occupied) => {
            const other = wishStarSlots[occupied];
            return ((slot.left - other.left) * 1200 / 590) ** 2 + (slot.top - other.top) ** 2;
          }))
          : Number.POSITIVE_INFINITY;
        const tieBreak = (candidate - start + wishStarSlots.length) % wishStarSlots.length;
        if (spacing > bestSpacing || (spacing === bestSpacing && tieBreak < bestTieBreak)) {
          slotIndex = candidate;
          bestSpacing = spacing;
          bestTieBreak = tieBreak;
        }
      });
      if (slotIndex === undefined) {
        throw new Error('There are not enough garden positions for the saved wish stars.');
      }
      wishStarPositions.set(entry.id, slotIndex);
      occupiedSlots.add(slotIndex);
    }

    const star = existingStars.get(entry.id) || document.createElement('button');
    star.className = 'garden-wish-star';
    star.type = 'button';
    star.dataset.wishId = entry.id;
    star.setAttribute('aria-label', `Open saved dream details for ${creatureInfo(entry.creature).name}`);
    star.setAttribute('aria-controls', 'gardenWishDetail');
    star.setAttribute('aria-expanded', String(activeWishDetailsId === entry.id));
    star.textContent = '✦';
    star.style.left = `${wishStarSlots[slotIndex].left}%`;
    star.style.top = `${wishStarSlots[slotIndex].top}%`;
    if (!star.isConnected) wishStarRoot.append(star);
  });
  wishStarCount.textContent = `${confirmedEntries.length} wish ${confirmedEntries.length === 1 ? 'star' : 'stars'}`;
  wishStarRoot.hidden = confirmedEntries.length === 0;
}

function openWishDetails(id, trigger) {
  if (!confirmedWishIds.has(id)) return;
  const entry = dreamJournal.find((wish) => wish.id === id) || pendingWishRemovalEntries.get(id);
  if (!entry || !creatureInfo(entry.creature)) return;

  if (activeWishDetailsId && activeWishDetailsId !== id) {
    wishStarRoot.querySelector(`[data-wish-id="${CSS.escape(activeWishDetailsId)}"]`)
      ?.setAttribute('aria-expanded', 'false');
  }
  activeWishDetailsId = id;
  wishDetailsReturnFocus = trigger;
  wishDetailDream.textContent = entry.wish;
  const creature = creatureInfo(entry.creature);
  wishDetailIcon.hidden = !creature.image;
  if (creature.image) wishDetailIcon.src = creature.image;
  wishDetailEmoji.hidden = Boolean(creature.image);
  wishDetailEmoji.textContent = creature.icon || '';
  wishDetailAnimal.textContent = creature.name;

  const savedDate = new Date(entry.createdAt);
  if (!Number.isNaN(savedDate.getTime())) {
    wishDetailDate.dateTime = savedDate.toISOString();
    wishDetailDate.textContent = `Saved ${new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(savedDate)}`;
    wishDetailDate.hidden = false;
  } else {
    wishDetailDate.removeAttribute('datetime');
    wishDetailDate.textContent = '';
    wishDetailDate.hidden = true;
  }

  wishDetail.hidden = false;
  trigger.setAttribute('aria-expanded', 'true');
  wishDetailTitle.focus({ preventScroll: true });
  wishDetail.scrollIntoView({
    block: 'nearest',
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
  });
}

function closeWishDetails(restoreFocus = true) {
  if (activeWishDetailsId) {
    wishStarRoot.querySelector(`[data-wish-id="${CSS.escape(activeWishDetailsId)}"]`)
      ?.setAttribute('aria-expanded', 'false');
  }
  activeWishDetailsId = null;
  wishDetail.hidden = true;
  if (restoreFocus && wishDetailsReturnFocus?.isConnected) wishDetailsReturnFocus.focus();
  wishDetailsReturnFocus = null;
}

wishStarRoot.addEventListener('click', (event) => {
  const star = event.target.closest('.garden-wish-star');
  if (!star || !wishStarRoot.contains(star)) return;
  openWishDetails(star.dataset.wishId, star);
});

wishDetailClose.addEventListener('click', () => closeWishDetails());

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !wishDetail.hidden) closeWishDetails();
});

function updatePipGreeting() {
  pipGreeting.hidden = document.documentElement.dataset.mood !== 'dawn';
}

const gardenThemeObserver = new MutationObserver((changes) => {
  if (changes.some((change) => change.attributeName === 'data-mood')) updatePipGreeting();
});
gardenThemeObserver.observe(document.documentElement, {
  attributes: true,
  attributeFilter: ['data-mood'],
});
updatePipGreeting();

function updateSelectedGuardian() {
  const guardian = creatures[privateDreamCreature.value];
  if (!guardian) return;
  selectedGuardianName.textContent = guardian.name;
  selectedGuardianTitle.textContent = guardian.title || 'Garden Friend';
  selectedGuardianDescription.textContent = guardian.description;
  selectedGuardianWishCount.textContent = guardianWishCountMessage(privateDreamCreature.value);
  selectedGuardianImage.hidden = !guardian.image;
  selectedGuardianEmoji.hidden = Boolean(guardian.image);
  selectedGuardianEmoji.textContent = guardian.icon || '';
  if (guardian.image) {
    selectedGuardianImage.src = guardian.image;
    selectedGuardianImage.alt = `${guardian.name}, ${guardian.title}`;
  } else {
    selectedGuardianImage.removeAttribute('src');
    selectedGuardianImage.alt = '';
  }
  renderSelectedGuardianPrivateWishes(privateDreamCreature.value);
}

function guardianWishCountMessage(id) {
  if (!guardianWishCounts.has(id)) return 'Shared wish count unavailable.';
  const count = guardianWishCounts.get(id);
  return `${count} ${count === 1 ? 'wish' : 'wishes'} received`;
}

function updateDreamPanelWishCount(id) {
  dreamWishCount.textContent = guardianWishCountMessage(id);
}

async function loadGuardianWishCounts() {
  const requestId = ++guardianWishCountsRequest;
  try {
    const response = await gardenApiRequest('/api/garden/wish-counts');
    const result = await readGardenApiJson(response, 'Garden API');
    if (!response.ok || !result.counts || typeof result.counts !== 'object' || Array.isArray(result.counts)) {
      throw new Error('Shared Garden wish counts are unavailable.');
    }
    const counts = new Map(Object.keys(creatures).map((id) => [id, 0]));
    Object.entries(result.counts).forEach(([id, count]) => {
      if (!Object.hasOwn(creatures, id) || !Number.isSafeInteger(count) || count < 0) {
        throw new Error('The server returned invalid Garden wish counts.');
      }
      counts.set(id, count);
    });
    if (requestId !== guardianWishCountsRequest) return;
    guardianWishCounts.clear();
    counts.forEach((count, id) => guardianWishCounts.set(id, count));
  } catch (error) {
    if (requestId !== guardianWishCountsRequest) return;
    guardianWishCounts.clear();
    console.error('Could not load shared Garden wish counts:', error);
  }
  updateSelectedGuardian();
  if (selectedCreatureId) updateDreamPanelWishCount(selectedCreatureId);
}

privateDreamCreature.addEventListener('change', () => {
  updateSelectedGuardian();
  renderPrivateDreams();
});
updateSelectedGuardian();

function renderSelectedGuardianPrivateWishes(creatureId) {
  if (!selectedGuardianPrivateWishes) return;
  selectedGuardianPrivateWishes.replaceChildren();
  const active = wishesForGuardian(dreamJournal, creatureId);
  const fulfilled = wishesForGuardian(fulfilledWishes, creatureId);
  if (!active.length && !fulfilled.length) {
    const empty = document.createElement('li');
    empty.className = 'garden-journal-empty';
    empty.textContent = 'No private wishes with this friend yet.';
    selectedGuardianPrivateWishes.append(empty);
    return;
  }
  active.forEach((entry) => {
    const item = document.createElement('li');
    item.textContent = entry.wish;
    selectedGuardianPrivateWishes.append(item);
  });
  fulfilled.forEach((entry) => {
    const item = document.createElement('li');
    item.className = 'is-fulfilled';
    item.textContent = `${entry.wish} · fulfilled`;
    selectedGuardianPrivateWishes.append(item);
  });
}

function wishesForGuardian(entries, creatureId) {
  return entries.filter((entry) => entry.creature === creatureId);
}

function renderPrivateDreams() {
  if (!privateDreamJournal) return;
  privateDreamJournal.replaceChildren();
  renderSelectedGuardianPrivateWishes(privateDreamCreature.value);
  if (!dreamJournal.length) {
    const empty = document.createElement('li');
    empty.className = 'garden-journal-empty';
    empty.textContent = 'Your private wishes will appear here.';
    privateDreamJournal.append(empty);
    return;
  }
  dreamJournal.slice().reverse().forEach((entry) => {
    const item = document.createElement('li');
    const wish = document.createElement('p');
    wish.textContent = entry.wish;
    const status = document.createElement('small');
    const creature = creatureInfo(entry.creature);
    status.textContent = `${creature.name} · active wish`;
    const date = document.createElement('time');
    const parsedDate = new Date(entry.createdAt);
    if (!Number.isNaN(parsedDate.getTime())) {
      date.dateTime = parsedDate.toISOString();
      date.textContent = parsedDate.toLocaleDateString();
    }
    const remove = document.createElement('button');
    remove.className = 'garden-private-wish-remove';
    remove.type = 'button';
    remove.textContent = 'Remove wish';
    remove.setAttribute('aria-label', `Remove your wish for ${creature.name}`);
    remove.disabled = !gardenSyncReady || gardenSyncPending || fulfillmentPending;
    remove.addEventListener('click', () => removePrivateWish(entry.id));
    const fulfill = document.createElement('button');
    fulfill.className = 'garden-private-wish-fulfill';
    fulfill.type = 'button';
    fulfill.textContent = 'Mark as fulfilled';
    fulfill.setAttribute('aria-label', `Mark this wish with ${creature.name} as fulfilled`);
    fulfill.disabled = !gardenSyncReady || !gardenSessionReady || gardenSyncPending || fulfillmentPending;
    fulfill.addEventListener('click', () => fulfillPrivateWish(entry.id));
    item.append(wish, status, date, fulfill, remove);
    privateDreamJournal.append(item);
  });
}

async function fulfillPrivateWish(id) {
  if (!gardenSyncReady || !gardenSessionReady || gardenSyncPending || fulfillmentPending) return;
  const entry = dreamJournal.find((wish) => wish.id === id);
  if (!entry) return;
  const creature = creatureInfo(entry.creature);
  const approved = await askPipToConfirm({
  title: 'A wish comes true',
  message: `Mark this wish with ${creature.name} as fulfilled?\n\n“${entry.wish}”`,
  confirmLabel: 'Yes, fulfil it'
});

if (!approved) return;

  fulfillmentPending = true;
  privateDreamStatus.textContent = 'Saving this fulfilled wish…';
  render();
  const startingVersion = gardenChangeVersion;
  try {
    const result = await requestWishFulfillment(id, gardenRevision);
    const serverState = normalizeGardenState(result.state);
    if (!serverState || !Number.isSafeInteger(result.revision)) {
      throw new Error('The server returned an invalid fulfilled-wish record.');
    }
    const localState = gardenStateSnapshot();
    localState.dreamJournal = localState.dreamJournal.filter((wish) => wish.id !== id);
    const merged = pendingReset
      ? { state: localState, overflow: false }
      : mergeGardenStates(serverState, localState);
    const localChangesOccurred = gardenChangeVersion !== startingVersion;
    gardenRevision = result.revision;
    confirmedWishIds.delete(id);
    storeGardenStateLocally(merged.state);
    gardenChangeVersion += 1;
    gardenSyncPending = localChangesOccurred;
    if (localChangesOccurred) scheduleGardenSync(0);
    else {
      gardenPersistedVersion = gardenChangeVersion;
      setGardenSavedStatus();
    }
    persistWishSyncMetadata();
    render();
    privateDreamStatus.textContent = 'This wish was marked fulfilled and saved in your private journal.';
  } catch (error) {
    privateDreamStatus.textContent = error instanceof TypeError
      ? 'Could not reach the private Garden service. This wish was not confirmed as fulfilled.'
      : error.message || 'This wish could not be marked fulfilled. Please try again.';
  } finally {
    fulfillmentPending = false;
    render();
  }
}

async function removePrivateWish(id) {
  if (!gardenSyncReady || !gardenSessionReady || gardenSyncPending || fulfillmentPending
    || pendingWishRemovalIds.has(id)) return;
  const entry = dreamJournal.find((wish) => wish.id === id);
  if (!entry) return;
  const creature = creatureInfo(entry.creature);
  const approved = await askPipToConfirm({
    title: 'Remove private wish?',
    message: `Remove this private wish for ${creature.name} and its saved star?\n\n“${entry.wish}”`,
    confirmLabel: 'Yes, remove it'
  });
  if (!approved) return;

  const previousJournal = [...dreamJournal];
  pendingWishRemovalIds.add(id);
  if (confirmedWishIds.has(id)) pendingWishRemovalEntries.set(id, entry);
  dreamJournal = dreamJournal.filter((wish) => wish.id !== id);
  gardenChangeVersion += 1;
  const removalVersion = gardenChangeVersion;
  gardenSyncPending = true;
  storeGardenStateLocally(gardenStateSnapshot());
  render();
  privateDreamStatus.textContent = 'Removing your private wish…';
  window.clearTimeout(gardenSyncTimer);
  gardenSyncChain = gardenSyncChain.then(syncGardenState, syncGardenState);
  await gardenSyncChain;

  if (gardenPersistedVersion >= removalVersion) {
    privateDreamStatus.textContent = 'Your private wish and its star were removed.';
    return;
  }

  dreamJournal = previousJournal;
  pendingWishRemovalIds.delete(id);
  pendingWishRemovalEntries.delete(id);
  gardenChangeVersion += 1;
  storeGardenStateLocally(gardenStateSnapshot());
  render();
  privateDreamStatus.textContent = 'The wish could not be removed from the saved garden. Please try again.';
}

function animateDreamToCreature(creatureId) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const source = privateDreamForm.querySelector('button[type="submit"]')?.getBoundingClientRect();
  const destination = document.querySelector(`.garden-creature[data-creature="${creatureId}"]`)?.getBoundingClientRect();
  if (!source || !destination) return;
  const spark = document.createElement('span');
  spark.className = 'garden-dream-spark';
  spark.setAttribute('aria-hidden', 'true');
  spark.textContent = '✦';
  spark.style.left = `${source.left + source.width / 2}px`;
  spark.style.top = `${source.top + source.height / 2}px`;
  document.body.append(spark);
  const dx = destination.left + destination.width / 2 - source.left - source.width / 2;
  const dy = destination.top + destination.height / 2 - source.top - source.height / 2;
  const motion = spark.animate([
    { transform: 'translate(-50%, -50%) scale(.6)', opacity: 0 },
    { transform: 'translate(-50%, -50%) scale(1.2)', opacity: 1, offset: 0.2 },
    { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.45)`, opacity: 0.15 },
  ], { duration: 900, easing: 'cubic-bezier(.22,.8,.28,1)' });
  motion.onfinish = () => spark.remove();
}

privateDreamForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!gardenSyncReady || !gardenSessionReady) {
    privateDreamStatus.textContent = 'The private journal is not connected yet. Please try again when garden sync is ready.';
    return;
  }
  const wish = privateDreamInput.value.trim();
  const creature = privateDreamCreature.value;
  if (!wish || !Object.hasOwn(creatures, creature)) return;
  const previous = [...dreamJournal];
  const id = createGardenRecordId();
  if (!id) {
    privateDreamStatus.textContent = 'A secure journal entry ID could not be created in this browser.';
    return;
  }
  dreamJournal = [...dreamJournal, { id, wish, creature, createdAt: new Date().toISOString() }].slice(-20);
  gardenChangeVersion += 1;
  const saveVersion = gardenChangeVersion;
  gardenSyncPending = true;
  storeGardenStateLocally(gardenStateSnapshot());
  render();
  privateDreamInput.value = '';
  privateDreamStatus.textContent = 'Saving your private wish…';
  window.clearTimeout(gardenSyncTimer);
  gardenSyncChain = gardenSyncChain.then(syncGardenState, syncGardenState);
  await gardenSyncChain;
  if (gardenPersistedVersion >= saveVersion) {
    privateDreamStatus.textContent = 'Pip tucked your private wish safely into the garden journal.';
    privateDreamForm.classList.add('is-saved');
    animateDreamToCreature(creature);
    window.setTimeout(() => privateDreamForm.classList.remove('is-saved'), 1100);
    window.DearPipSounds?.play('secret');
  } else {
    dreamJournal = previous;
    gardenChangeVersion += 1;
    storeGardenStateLocally(gardenStateSnapshot());
    render();
    privateDreamInput.value = wish;
    privateDreamStatus.textContent = 'Your wish could not be saved to the private journal. Please try again.';
  }
});

Object.entries(seeds).forEach(([id, seed]) => {
  const button = document.createElement('button');
  button.className = 'garden-seed';
  button.type = 'button';
  button.dataset.seed = id;
  button.setAttribute('aria-pressed', 'false');
  button.style.setProperty('--seed-color', seed.color);
  const swatch = document.createElement('span');
  swatch.className = 'garden-seed__swatch';
  swatch.setAttribute('aria-hidden', 'true');
  swatch.append(createFlowerIllustration(id, 'garden-flower-illustration'));
  const name = document.createElement('strong');
  name.textContent = seed.name;
  const description = document.createElement('span');
  description.textContent = seed.description;
  button.append(swatch, name, description);
  button.addEventListener('click', () => {
    selectedSeed = id;
    seedRoot.querySelectorAll('.garden-seed').forEach((item) => {
      const selected = item === button;
      item.setAttribute('aria-pressed', String(selected));
      item.classList.toggle('is-selected', selected);
    });
    feedback.textContent = `${seed.name} is ready for a garden plot.`;
    render();
  });
  seedRoot.append(button);
});

plantButton.addEventListener('click', () => {
  if (!selectedSeed || fulfillmentPending) return;
  const openPlot = plots.indexOf(null);
  if (openPlot < 0) return;
  plots[openPlot] = { seed: selectedSeed, stage: 0 };
  window.DearPipSounds?.play('garden-plant');
  plotDreamOwners[openPlot] = selectedCreatureId;
  feedback.textContent = `${seeds[selectedSeed].name} is tucked into plot ${openPlot + 1}. Give it a little water to help it grow.`;
  saveGarden();
  saveDreams();
  render();
});

document.querySelectorAll('.garden-creature').forEach((button) => {
  installCreatureGestures(button);
  button.addEventListener('click', () => {
    const id = button.dataset.creature;
    const creature = creatures[id];
    if (!creature) return;
    selectedCreatureId = id;
    privateDreamCreature.value = id;
    updateSelectedGuardian();
    const firstDiscovery = !discoveredCreatures.has(id);
    discoveredCreatures.add(id);
    document.querySelectorAll('.garden-creature').forEach((item) => {
      const selected = item === button;
      item.setAttribute('aria-pressed', String(selected));
      item.classList.toggle('is-selected', selected);
    });
    button.classList.add('is-discovered');
    button.setAttribute('aria-label', `${creature.name}${creature.title ? `, ${creature.title}` : ''}: ${creature.description}`);
    dreamPortrait.hidden = !creature.image;
    if (creature.image) {
      dreamPortrait.src = creature.image;
      dreamPortrait.alt = `${creature.name}, ${creature.title}`;
    } else {
      dreamPortrait.removeAttribute('src');
      dreamPortrait.alt = '';
    }
    dreamEmoji.hidden = Boolean(creature.image);
    dreamEmoji.textContent = creature.icon || '';
    dreamName.textContent = creature.name;
    dreamGuardianTitle.textContent = creature.title || 'Garden friend';
    updateDreamPanelWishCount(id);
    dreamDescription.textContent = creature.description;
    dreamPersonality.textContent = creature.personality;
    dreamWish.textContent = creature.wish;
    dreamStory.textContent = creature.story;
    dreamInvention.textContent = creature.invention;
    dreamPanel.hidden = false;
    feedback.textContent = firstDiscovery
      ? `A new friend! You found the ${creature.name}. ${creature.description}`
      : `${creature.name}: ${creature.description}`;
    saveGarden();
    render();
  });
});

gardenResetButton.addEventListener('click', async () => {
  if (!gardenSyncReady || !gardenSessionReady || gardenSyncPending || fulfillmentPending) {
    privateDreamStatus.textContent = 'Wait until your garden is connected and saved before resetting it.';
    return;
  }
  const approved = await askPipToConfirm({
    title: 'Start a fresh garden?',
    message: 'Start a fresh garden? This will clear planted seeds, discovered friends, and all active and fulfilled private wishes.',
    confirmLabel: 'Yes, reset garden'
  });
  if (!approved) return;
  const previous = {
    plots: plots.map((plot) => plot ? { ...plot } : null),
    plotOwners: [...plotDreamOwners],
    creatures: [...discoveredCreatures],
    fulfilled: [...legacyFulfilledCreatureIds],
    fulfilledWishes,
    journal: [...dreamJournal],
    layout: Object.fromEntries(Object.entries(gardenCreatureLayout).map(([id, position]) => [id, { ...position }])),
    confirmedWishIds: [...confirmedWishIds],
    pendingWishRemovalIds: [...pendingWishRemovalIds],
    pendingWishRemovalEntries: [...pendingWishRemovalEntries],
    selectedSeed,
    selectedCreatureId,
    storageAvailable,
    dreamStorageAvailable,
    localGardenDataInvalid,
    localDreamDataInvalid,
  };
  pendingReset = true;
  dreamJournal.forEach((entry) => {
    pendingWishRemovalIds.add(entry.id);
    if (confirmedWishIds.has(entry.id)) pendingWishRemovalEntries.set(entry.id, entry);
  });
  gardenChangeVersion += 1;
  gardenSyncPending = true;
  localGardenDataInvalid = false;
  localDreamDataInvalid = false;
  storageAvailable = true;
  dreamStorageAvailable = true;
  plots = Array(5).fill(null);
  plotDreamOwners = Array(5).fill(null);
  discoveredCreatures.clear();
  legacyFulfilledCreatureIds.clear();
  fulfilledWishes = [];
  dreamJournal = [];
  gardenCreatureLayout = {};
  selectedSeed = null;
  selectedCreatureId = null;
  seedRoot.querySelectorAll('.garden-seed').forEach((button) => {
    button.setAttribute('aria-pressed', 'false');
    button.classList.remove('is-selected');
  });
  document.querySelectorAll('.garden-creature').forEach((button) => {
    button.classList.remove('is-discovered');
    button.classList.remove('is-selected');
    button.setAttribute('aria-pressed', 'false');
    const creature = creatures[button.dataset.creature];
    button.setAttribute('aria-label', `Discover ${creature.name}${creature.title ? `, ${creature.title}` : ''}`);
  });
  applyGardenCreatureLayout();
  feedback.textContent = 'The garden is ready for new little dreams.';
  privateDreamStatus.textContent = 'Resetting this garden…';
  saveGarden();
  saveDreams();
  render();
  const resetVersion = gardenChangeVersion;
  gardenResetButton.disabled = true;
  window.clearTimeout(gardenSyncTimer);
  gardenSyncChain = gardenSyncChain.then(syncGardenState, syncGardenState);
  await gardenSyncChain;
  if (gardenPersistedVersion >= resetVersion) {
    privateDreamStatus.textContent = 'Your garden reset was saved.';
    return;
  }

  window.clearTimeout(gardenSyncRetryTimer);
  pendingReset = false;
  plots = previous.plots;
  plotDreamOwners = previous.plotOwners;
  discoveredCreatures.clear();
  previous.creatures.forEach((id) => discoveredCreatures.add(id));
  legacyFulfilledCreatureIds.clear();
  previous.fulfilled.forEach((id) => legacyFulfilledCreatureIds.add(id));
  fulfilledWishes = previous.fulfilledWishes;
  dreamJournal = previous.journal;
  gardenCreatureLayout = previous.layout;
  confirmedWishIds.clear();
  previous.confirmedWishIds.forEach((id) => confirmedWishIds.add(id));
  pendingWishRemovalIds.clear();
  previous.pendingWishRemovalIds.forEach((id) => pendingWishRemovalIds.add(id));
  pendingWishRemovalEntries.clear();
  previous.pendingWishRemovalEntries.forEach(([id, entry]) => pendingWishRemovalEntries.set(id, entry));
  selectedSeed = previous.selectedSeed;
  selectedCreatureId = previous.selectedCreatureId;
  storageAvailable = previous.storageAvailable;
  dreamStorageAvailable = previous.dreamStorageAvailable;
  localGardenDataInvalid = previous.localGardenDataInvalid;
  localDreamDataInvalid = previous.localDreamDataInvalid;
  gardenChangeVersion += 1;
  gardenSyncPending = false;
  gardenResetButton.disabled = false;
  storeGardenStateLocally(gardenStateSnapshot());
  persistWishSyncMetadata();
  render();
  setSyncStatus('Reset failed — your previous saved garden has been restored.', 'offline');
  privateDreamStatus.textContent = 'The reset could not be saved. Your previous garden has been restored.';
});

window.addEventListener('resize', () => window.requestAnimationFrame(applyGardenCreatureLayout));

readSavedGarden();
readSavedDreams();
document.querySelectorAll('.garden-creature').forEach((button) => {
  if (discoveredCreatures.has(button.dataset.creature)) {
    const creature = creatures[button.dataset.creature];
    button.classList.add('is-discovered');
    button.setAttribute('aria-label', `${creature.name}${creature.title ? `, ${creature.title}` : ''}: ${creature.description}`);
  }
});
render();
initializeGardenSync();
loadGuardianWishCounts();
loadGuestbookEntries();

const pipCanvas = document.querySelector('#gardenPipCanvas');
const pipButton = document.querySelector('#gardenPipButton');
const pipEyes = document.querySelectorAll('.garden-companion .pip-eye');
const pipToast = document.querySelector('#gardenToast');
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
  pipToast.textContent = 'Pip says: let’s help a little dream grow! ✦';
  pipToast.classList.add('is-visible');
  window.clearTimeout(pipToastTimer);
  pipToastTimer = window.setTimeout(() => pipToast.classList.remove('is-visible'), 2400);
});

pipButton.addEventListener('pointermove', (event) => {
  pipEyes.forEach((eye) => {
    const pupil = eye.querySelector('.pip-pupil');
    if (!pupil) return;

    const rect = eye.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const angle = Math.atan2(dy, dx);
    const distance = Math.min(4, Math.hypot(dx, dy) / 12);

    pupil.style.transform =
      `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px)`;
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





const pipConfirmModal = document.querySelector('#pipConfirmModal');
const pipModalTitle = document.querySelector('#pipModalTitle');
const pipModalMessage = document.querySelector('#pipModalMessage');

function askPipToConfirm({ title, message, confirmLabel = 'Yes, continue' }) {
  if (!pipConfirmModal || typeof pipConfirmModal.showModal !== 'function') {
    return Promise.resolve(
      window.confirm(`${title}\n\n${message}`)
    );
  }

  pipModalTitle.textContent = title;
  pipModalMessage.textContent = message;

  const confirmButton = pipConfirmModal.querySelector(
    'button[value="confirm"]'
  );
  confirmButton.textContent = confirmLabel;

  return new Promise((resolve) => {
    pipConfirmModal.returnValue = '';
    const handleClose = () => {
      pipConfirmModal.removeEventListener('close', handleClose);
      resolve(pipConfirmModal.returnValue === 'confirm');
    };

    pipConfirmModal.addEventListener('close', handleClose);
    pipConfirmModal.showModal();
  });
}
