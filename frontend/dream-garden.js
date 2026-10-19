const gardenStorageKey = 'dear-pip-dream-garden-v1';
const gardenDreamStorageKey = 'dear-pip-dream-garden-dreams-v1';
const gardenVisitorStorageKey = 'dear-pip-garden-visitor-v1';
const gardenApiMeta = document.querySelector('meta[name="dear-pip-api-base"]');
const configuredGardenApiBase = gardenApiMeta?.content.trim();
const gardenApiBase = (configuredGardenApiBase || (
  ['localhost', '127.0.0.1'].includes(window.location.hostname)
    ? 'http://127.0.0.1:5000'
    : window.location.origin
)).replace(/\/+$/, '');
const seeds = {
  moonblush: { id: 'moonblush', name: 'Moonblush', description: 'A soft pink flower for gentle dreams.', color: '#f3a9c4', mark: '✿' },
  sunpocket: { id: 'sunpocket', name: 'Sunpocket', description: 'A golden bloom that keeps a little sunshine.', color: '#f4cf78', mark: '✦' },
  cloudbell: { id: 'cloudbell', name: 'Cloudbell', description: 'A lilac bellflower that hums in the breeze.', color: '#c4a4ee', mark: '✿' },
  starfern: { id: 'starfern', name: 'Starfern', description: 'A leafy sprout dotted with tiny stars.', color: '#9bd2ad', mark: '✧' },
  dreamrose: { id: 'dreamrose', name: 'Dreamrose', description: 'A dusky rose with petals like velvet.', color: '#df83ae', mark: '✿' },
};
const creatures = {
  moth: {
    name: 'Moon Moth',
    description: 'A tiny moth who dusts sleepy wings with moonbeam pollen.',
    personality: 'Gentle and a little shy, she follows the quietest glimmers.',
    wish: 'She dreams of carrying a soft goodnight light to every flower that feels lonely.',
    story: 'When the moon hides behind a cloud, Moon Moth visits the garden blooms one by one, leaving a shimmer so they know the night is still kind.',
    invention: 'Pip imagines a pocket-sized Moonbeam Lantern that gathers stray moonlight and lets Moon Moth sprinkle it along her evening route.',
    dreamSeed: 'moonblush',
  },
  snail: {
    name: 'Dandelion Snail',
    description: 'A patient little traveler carrying a seed-fluff cottage on its back.',
    personality: 'Thoughtful and unhurried, he likes to notice small things others pass by.',
    wish: 'He wishes to visit the far side of the garden without leaving his cozy dandelion home behind.',
    story: 'Each evening, Dandelion Snail sets off toward the pond, but pauses to help every seedling he meets along the way.',
    invention: 'Pip imagines a tiny Starlight Seed-Cart: a gentle rolling nook that carries Dandelion Snail and his fluffy home over the garden paths.',
    dreamSeed: 'starfern',
  },
  sprite: {
    name: 'Dewdrop Sprite',
    description: 'A bright-eyed sprite who gathers dew to water the night flowers.',
    personality: 'Curious, cheerful, and always ready to share what she finds.',
    wish: 'She dreams of saving enough morning dew to help the garden sparkle through a long, dry night.',
    story: 'Before sunrise, Dewdrop Sprite tiptoes across the leaves, collecting the very roundest drops in a little crystal cup.',
    invention: 'Pip imagines a Dewdrop Catcher: a tiny leaf-shaped collector that stores cool droplets and releases them as a silver mist when the flowers need a drink.',
    dreamSeed: 'cloudbell',
  },
  rabbit: {
    name: 'Clover Rabbit', description: 'A soft-footed rabbit who gathers clover beneath the lanterns.',
    personality: 'Kind, careful, and happiest when every friend has a cozy place to rest.',
    wish: 'Clover hopes to make a sheltered nook where shy garden friends can feel safe.',
    story: 'At dusk, Clover follows the warm lanterns and leaves a little clover beside each quiet burrow.',
    invention: 'Pip imagines a Cloverlight Shelter: a tiny leafy nook with a gentle glow for night visitors.',
    dreamSeed: 'sunpocket',
  },
  fox: {
    name: 'Amber Fox', description: 'A sleepy fox who follows the golden path between the flowers.',
    personality: 'Inventive and thoughtful, with a talent for finding a bright idea in small things.',
    wish: 'Amber dreams of a path that helps every wandering friend find their way home.',
    story: 'When fog settles over the garden, Amber leaves tiny lantern marks along the safe path.',
    invention: 'Pip imagines a Startrail Compass: a pocket guide that glows softly near familiar places.',
    dreamSeed: 'dreamrose',
  },
  bird: {
    name: 'Lullaby Bird', description: 'A small songbird who carries gentle tunes from bloom to bloom.',
    personality: 'Bright, patient, and always ready to share a quiet melody.',
    wish: 'The little bird hopes every garden friend can hear a soothing song at bedtime.',
    story: 'Before the stars appear, Lullaby Bird sings one soft note to each flower on the hill.',
    invention: 'Pip imagines a Petal Music Box that gathers the bird’s melody and plays it beside sleepy blooms.',
    dreamSeed: 'cloudbell',
  },
};

const plotRoot = document.querySelector('#gardenPlots');
const seedRoot = document.querySelector('#gardenSeedList');
const plantButton = document.querySelector('#gardenPlantButton');
const feedback = document.querySelector('#gardenFeedback');
const flowerCount = document.querySelector('#gardenFlowerCount');
const creatureCount = document.querySelector('#gardenCreatureCount');
const flowerJournal = document.querySelector('#gardenFlowerJournal');
const creatureJournal = document.querySelector('#gardenCreatureJournal');
const fulfilledDreamJournal = document.querySelector('#gardenFulfilledDreamJournal');
const privateDreamForm = document.querySelector('#gardenPrivateDreamForm');
const privateDreamInput = document.querySelector('#gardenPrivateDream');
const privateDreamCreature = document.querySelector('#gardenPrivateDreamCreature');
const privateDreamStatus = document.querySelector('#gardenPrivateDreamStatus');
const privateDreamJournal = document.querySelector('#gardenPrivateDreamJournal');
const syncStatus = document.querySelector('#gardenSyncStatus');
const guestbookForm = document.querySelector('#gardenGuestbookForm');
const guestbookName = document.querySelector('#gardenGuestbookName');
const guestbookMessage = document.querySelector('#gardenGuestbookMessage');
const guestbookSubmit = document.querySelector('#gardenGuestbookSubmit');
const guestbookStatus = document.querySelector('#gardenGuestbookStatus');
const guestbookEntries = document.querySelector('#gardenGuestbookEntries');
const dreamPanel = document.querySelector('#gardenDreamPanel');
const dreamName = document.querySelector('#gardenDreamName');
const dreamPersonality = document.querySelector('#gardenDreamPersonality');
const dreamWish = document.querySelector('#gardenDreamWish');
const dreamStory = document.querySelector('#gardenDreamStory');
const dreamInvention = document.querySelector('#gardenDreamInvention');
const discoveredCreatures = new Set();
const fulfilledDreams = new Set();
let dreamJournal = [];
let plots = Array(5).fill(null);
let plotDreamOwners = Array(5).fill(null);
let selectedSeed = null;
let selectedCreatureId = null;
let storageAvailable = true;
let dreamStorageAvailable = true;
let localGardenDataInvalid = false;
let localDreamDataInvalid = false;
let pendingReset = false;
let visitorId = null;
let visitorIdPersistent = true;
let gardenRevision = 0;
let gardenSyncReady = false;
let gardenSyncPending = false;
let gardenSyncTimer = null;
let gardenSyncChain = Promise.resolve();
let gardenChangeVersion = 0;
let gardenSyncRetryTimer = null;

function setSyncStatus(message, state = '') {
  syncStatus.textContent = message;
  syncStatus.dataset.state = state;
}

function setGardenSavedStatus() {
  setSyncStatus(
    visitorIdPersistent
      ? 'Garden saved online'
      : 'Garden synced for this visit; browser storage is unavailable.',
    visitorIdPersistent ? 'saved' : 'session-only',
  );
}

function createVisitorId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  if (!window.crypto?.getRandomValues) return null;
  const bytes = window.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function getVisitorId() {
  try {
    const saved = window.localStorage.getItem(gardenVisitorStorageKey);
    if (saved && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(saved)) {
      return saved;
    }
    const created = createVisitorId();
    if (!created) return null;
    window.localStorage.setItem(gardenVisitorStorageKey, created);
    return created;
  } catch (error) {
    visitorIdPersistent = false;
    console.error('Could not access the Garden visitor identifier:', error);
    return createVisitorId();
  }
}

function gardenStateSnapshot() {
  return {
    version: 1,
    plots: plots.map((plot) => plot ? { seed: plot.seed, stage: plot.stage } : null),
    creatures: [...discoveredCreatures],
    plotOwners: [...plotDreamOwners],
    fulfilled: [...fulfilledDreams],
    dreamJournal: dreamJournal.slice(-20),
  };
}

function normalizeGardenState(state) {
  if (!state || state.version !== 1 || !Array.isArray(state.plots) || state.plots.length !== 5
    || !Array.isArray(state.creatures) || !Array.isArray(state.plotOwners) || state.plotOwners.length !== 5
    || !Array.isArray(state.fulfilled)) return null;
  const validCreatures = new Set(Object.keys(creatures));
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
  const validFulfilled = state.fulfilled.filter((id) => nextPlots.some((plot, index) => (
    plot
    && plot.stage === 2
    && plot.seed === creatures[id].dreamSeed
    && nextOwners[index] === id
  )));
  const journal = Array.isArray(state.dreamJournal) ? state.dreamJournal : [];
  if (journal.length > 20 || journal.some((entry) => (
    !entry || typeof entry.id !== 'string' || typeof entry.wish !== 'string'
    || !entry.wish.trim() || entry.wish.length > 250 || !validCreatures.has(entry.creature)
    || typeof entry.createdAt !== 'string' || Number.isNaN(Date.parse(entry.createdAt))
  ))) return null;
  return {
    version: 1,
    plots: nextPlots,
    creatures: [...new Set(state.creatures)],
    plotOwners: nextOwners,
    fulfilled: [...new Set(validFulfilled)],
    dreamJournal: journal.slice(-20).map((entry) => ({
      id: entry.id, wish: entry.wish.trim(), creature: entry.creature, createdAt: entry.createdAt,
    })),
  };
}

function mergeGardenStates(serverState, localState) {
  const merged = normalizeGardenState(serverState) || {
    version: 1,
    plots: Array(5).fill(null),
    creatures: [],
    plotOwners: Array(5).fill(null),
    fulfilled: [],
    dreamJournal: [],
  };
  const local = normalizeGardenState(localState);
  if (!local) return { state: merged, overflow: false };
  merged.creatures = [...new Set([...merged.creatures, ...local.creatures])];
  const journalEntries = [...(merged.dreamJournal || []), ...(local.dreamJournal || [])];
  merged.dreamJournal = [...new Map(journalEntries.map((entry) => [entry.id, entry])).values()]
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)).slice(-20);
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

  merged.fulfilled = [...new Set([...merged.fulfilled, ...local.fulfilled])].filter((id) => (
    merged.plots.some((plot, index) => (
      plot
      && plot.stage === 2
      && plot.seed === creatures[id].dreamSeed
      && merged.plotOwners[index] === id
    ))
  ));
  return { state: merged, overflow };
}

function storeGardenStateLocally(state) {
  plots = state.plots.map((plot) => plot ? { ...plot } : null);
  discoveredCreatures.clear();
  state.creatures.forEach((id) => discoveredCreatures.add(id));
  plotDreamOwners = [...state.plotOwners];
  fulfilledDreams.clear();
  state.fulfilled.forEach((id) => fulfilledDreams.add(id));
  dreamJournal = [...(state.dreamJournal || [])];

  if (localGardenDataInvalid || localDreamDataInvalid) return;
  try {
    window.localStorage.setItem(gardenStorageKey, JSON.stringify({
      version: 1,
      plots,
      creatures: [...discoveredCreatures],
    }));
    window.localStorage.setItem(gardenDreamStorageKey, JSON.stringify({
      version: 1,
      plotOwners: plotDreamOwners,
      fulfilled: [...fulfilledDreams],
      dreamJournal,
      resetRequested: pendingReset,
    }));
  } catch (error) {
    storageAvailable = false;
    dreamStorageAvailable = false;
    feedback.textContent = 'Garden state is loaded, but this browser could not update its local backup.';
    console.error('Could not update the local Garden backup:', error);
  }
}

async function gardenApiRequest(path, options = {}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8000);
  try {
    return await fetch(`${gardenApiBase}${path}`, {
      ...options,
      signal: controller.signal,
      headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
      mode: 'cors',
      credentials: 'omit',
    });
  } finally {
    window.clearTimeout(timeout);
  }
}

function scheduleGardenSync(delay = 500) {
  gardenSyncPending = true;
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
  if (!gardenSyncPending || !gardenSyncReady || !visitorId) return;
  for (let attempt = 0; attempt < 3 && gardenSyncPending; attempt += 1) {
    const sentVersion = gardenChangeVersion;
    const localState = gardenStateSnapshot();
    setSyncStatus('Saving your garden…', 'saving');
    try {
      const response = await gardenApiRequest(`/api/garden/state/${visitorId}`, {
        method: 'PUT',
        body: JSON.stringify({ revision: gardenRevision, state: localState }),
      });
      const result = await response.json();
      if (response.status === 409) {
        if (result.state && !normalizeGardenState(result.state)) {
          throw new Error('The server returned an invalid Garden state.');
        }
        gardenRevision = result.revision;
        const merged = pendingReset
          ? { state: localState, overflow: false }
          : mergeGardenStates(result.state, localState);
        if (merged.overflow) {
          gardenSyncPending = false;
          setSyncStatus('Both gardens are full; your local garden is kept on this device and was not overwritten.', 'offline');
          return;
        }
        if (JSON.stringify(merged.state) !== JSON.stringify(localState)) {
          storeGardenStateLocally(merged.state);
          gardenChangeVersion += 1;
          render();
        }
        continue;
      }
      if (!response.ok) throw new Error('Garden save request failed.');
      gardenRevision = result.revision;
      if (pendingReset && sentVersion === gardenChangeVersion) {
        pendingReset = false;
        if (!localDreamDataInvalid) {
          try {
            window.localStorage.setItem(gardenDreamStorageKey, JSON.stringify({
              version: 1,
              plotOwners: plotDreamOwners,
              fulfilled: [...fulfilledDreams],
              resetRequested: false,
            }));
          } catch (error) {
            console.error('Could not clear the local Garden reset marker:', error);
          }
        }
      }
      if (sentVersion === gardenChangeVersion) {
        gardenSyncPending = false;
        setGardenSavedStatus();
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
  visitorId = visitorId || getVisitorId();
  if (!visitorId) {
    setSyncStatus('Online garden sync is unavailable; progress stays in this browser.', 'offline');
    return;
  }
  setSyncStatus('Loading your saved garden…', 'loading');
  try {
    const response = await gardenApiRequest(`/api/garden/state/${visitorId}`);
    if (!response.ok) throw new Error('Garden load request failed.');
    const result = await response.json();
    if (result.state && !normalizeGardenState(result.state)) {
      throw new Error('The server returned an invalid Garden state.');
    }
    const localState = gardenStateSnapshot();
    gardenRevision = result.revision;
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
    console.error('Could not load the saved Dream Garden:', error);
    scheduleGardenSyncRetry();
  }
}

function hasGardenProgress(state) {
  return state.plots.some(Boolean) || state.creatures.length > 0 || state.fulfilled.length > 0;
}

function renderGuestbookEntries(entries) {
  guestbookEntries.replaceChildren();
  if (!entries.length) {
    const empty = document.createElement('li');
    empty.className = 'garden-guestbook__empty';
    empty.textContent = 'Approved dreams will appear here.';
    guestbookEntries.append(empty);
    return;
  }
  entries.forEach((entry) => {
    const item = document.createElement('li');
    item.className = 'garden-guestbook__entry';
    const author = document.createElement('strong');
    author.textContent = entry.display_name || 'A Dreamer';
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
  try {
    const response = await gardenApiRequest('/api/guestbook?limit=20');
    if (!response.ok) throw new Error('Guestbook request failed.');
    const result = await response.json();
    renderGuestbookEntries(Array.isArray(result.entries) ? result.entries : []);
  } catch (error) {
    guestbookStatus.textContent = 'The guestbook is taking a quiet moment. Please try again later.';
    console.error('Could not load approved guestbook entries:', error);
  }
}

guestbookForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!guestbookForm.reportValidity()) return;
  guestbookSubmit.disabled = true;
  guestbookStatus.textContent = 'Sending your dream…';
  try {
    const response = await gardenApiRequest('/api/guestbook', {
      method: 'POST',
      body: JSON.stringify({
        display_name: guestbookName.value.trim() || null,
        dream_message: guestbookMessage.value.trim(),
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Your dream could not be sent.');
    guestbookForm.reset();
    guestbookStatus.textContent = 'Your dream was received as a pending note. Review controls are not included on this page.';
  } catch (error) {
    guestbookStatus.textContent = error.message === 'Failed to fetch' || error.name === 'AbortError'
      ? 'The guestbook is offline just now. Your message was not sent; please try again.'
      : error.message || 'Your dream could not be sent. Please try again.';
  } finally {
    guestbookSubmit.disabled = false;
  }
});

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
    saved.creatures.forEach((id) => {
      if (Object.hasOwn(creatures, id)) discoveredCreatures.add(id);
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
      || (saved.dreamJournal !== undefined && (!Array.isArray(saved.dreamJournal) || saved.dreamJournal.length > 20))) {
      throw new Error('Saved dream data has an unexpected shape.');
    }
    dreamJournal = (saved.dreamJournal || []).filter((entry) => entry && typeof entry.id === 'string'
      && typeof entry.wish === 'string' && entry.wish.trim() && entry.wish.length <= 250
      && Object.hasOwn(creatures, entry.creature) && typeof entry.createdAt === 'string'
      && !Number.isNaN(Date.parse(entry.createdAt))).slice(-20);
    pendingReset = saved.resetRequested === true;
    plotDreamOwners = Array.from({ length: 5 }, (_, index) => {
      const owner = saved.plotOwners[index];
      return plots[index] && Object.hasOwn(creatures, owner) ? owner : null;
    });
    saved.fulfilled.forEach((id) => {
      const hasMatchingBloom = plots.some((plot, index) => (
        plot
        && plot.stage === 2
        && plot.seed === creatures[id]?.dreamSeed
        && plotDreamOwners[index] === id
      ));
      if (Object.hasOwn(creatures, id) && hasMatchingBloom) fulfilledDreams.add(id);
    });
  } catch (error) {
    plotDreamOwners = Array(5).fill(null);
    fulfilledDreams.clear();
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
      fulfilled: [...fulfilledDreams],
      dreamJournal,
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
    const dreamOwner = plotDreamOwners[index];
    const dreamFulfilled = dreamOwner
      && seed.id === creatures[dreamOwner].dreamSeed
      && fulfilledDreams.has(dreamOwner);
    if (dreamFulfilled) {
      card.classList.add('garden-plot--dream-fulfilled');
      card.setAttribute('aria-label', `Garden plot ${index + 1}, ${seed.name}, dream fulfilled for ${creatures[dreamOwner].name}`);
    }
    const plant = document.createElement('div');
    plant.className = 'garden-plant';
    plant.setAttribute('aria-hidden', 'true');
    plant.innerHTML = '<span class="garden-plant__stem"></span><span class="garden-plant__leaf garden-plant__leaf--left"></span><span class="garden-plant__leaf garden-plant__leaf--right"></span><span class="garden-plant__bloom"><i></i><i></i><i></i><i></i><i></i><b></b></span>';
    card.append(plant);

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
      water.setAttribute('aria-label', `Water ${seed.name}; currently ${stageText.toLowerCase()}`);
      water.addEventListener('click', () => {
        plots[index].stage += 1;
        const owner = plotDreamOwners[index];
        const fulfillsDream = plots[index].stage === 2
          && owner
          && seed.id === creatures[owner].dreamSeed
          && !fulfilledDreams.has(owner);
        window.DearPipSounds?.play(plots[index].stage === 2 ? 'garden-harvest' : 'garden-water');
        if (fulfillsDream) {
          fulfilledDreams.add(owner);
          feedback.textContent = `${creatures[owner].name}'s dream came true! Pip's ${seed.name} helped make the garden kinder.`;
        } else {
          feedback.textContent = plots[index].stage === 2
            ? `${seed.name} opened into a little dream flower.`
            : `${seed.name} has grown a tiny sprout.`;
        }
        saveGarden();
        saveDreams();
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

function render() {
  renderPlots();
  const planted = plots.filter(Boolean);
  flowerCount.textContent = String(planted.length);
  creatureCount.textContent = String(discoveredCreatures.size);
  renderJournal(flowerJournal, planted.map((plot) => `${seeds[plot.seed].name} · ${['seed', 'sprout', 'bloom'][plot.stage]}`), 'No flowers planted yet.');
  renderJournal(creatureJournal, [...discoveredCreatures].map((id) => creatures[id].name), 'No friends found yet.');
  renderJournal(fulfilledDreamJournal, [...fulfilledDreams].map((id) => `${creatures[id].name} · dream fulfilled`), 'No dreams fulfilled yet.');
  renderPrivateDreams();
  plantButton.disabled = !selectedSeed || !plots.includes(null);
  plantButton.textContent = !plots.includes(null)
    ? 'Every plot is planted'
    : selectedSeed
      ? `Plant ${seeds[selectedSeed].name}`
      : 'Choose a seed to plant';
}

function renderPrivateDreams() {
  if (!privateDreamJournal) return;
  privateDreamJournal.replaceChildren();
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
    const planted = plots.some((plot, index) => plot && plotDreamOwners[index] === entry.creature);
    status.textContent = fulfilledDreams.has(entry.creature) ? `${creatures[entry.creature].name} · garden bloom fulfilled`
      : planted ? `${creatures[entry.creature].name} · collected, growing in the garden`
        : `${creatures[entry.creature].name} · awaiting collection`;
    const date = document.createElement('time');
    const parsedDate = new Date(entry.createdAt);
    if (!Number.isNaN(parsedDate.getTime())) {
      date.dateTime = parsedDate.toISOString();
      date.textContent = parsedDate.toLocaleDateString();
    }
    item.append(wish, status, date);
    privateDreamJournal.append(item);
  });
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
  if (!gardenSyncReady || !visitorId) {
    privateDreamStatus.textContent = 'The private journal is not connected yet. Please try again when garden sync is ready.';
    return;
  }
  const wish = privateDreamInput.value.trim();
  const creature = privateDreamCreature.value;
  if (!wish || !Object.hasOwn(creatures, creature)) return;
  const previous = dreamJournal;
  const id = createVisitorId();
  if (!id) {
    privateDreamStatus.textContent = 'A secure journal entry ID could not be created in this browser.';
    return;
  }
  dreamJournal = [...dreamJournal, { id, wish, creature, createdAt: new Date().toISOString() }].slice(-20);
  gardenChangeVersion += 1;
  gardenSyncPending = true;
  storeGardenStateLocally(gardenStateSnapshot());
  render();
  privateDreamInput.value = '';
  privateDreamStatus.textContent = 'Saving your private wish…';
  window.clearTimeout(gardenSyncTimer);
  gardenSyncChain = gardenSyncChain.then(syncGardenState, syncGardenState);
  await gardenSyncChain;
  if (!gardenSyncPending) {
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
  swatch.textContent = seed.mark;
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
  if (!selectedSeed) return;
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
  button.addEventListener('click', () => {
    const id = button.dataset.creature;
    const creature = creatures[id];
    if (!creature) return;
    selectedCreatureId = id;
    const firstDiscovery = !discoveredCreatures.has(id);
    discoveredCreatures.add(id);
    document.querySelectorAll('.garden-creature').forEach((item) => {
      const selected = item === button;
      item.setAttribute('aria-pressed', String(selected));
      item.classList.toggle('is-selected', selected);
    });
    button.classList.add('is-discovered');
    button.setAttribute('aria-label', `${creature.name}: ${creature.description}`);
    button.querySelector('.garden-creature__label').textContent = '✓';
    dreamName.textContent = creature.name;
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

document.querySelector('#gardenReset').addEventListener('click', () => {
  if (!window.confirm('Start a fresh garden? This will clear all planted seeds and discovered friends.')) return;
  pendingReset = true;
  localGardenDataInvalid = false;
  localDreamDataInvalid = false;
  storageAvailable = true;
  dreamStorageAvailable = true;
  plots = Array(5).fill(null);
  plotDreamOwners = Array(5).fill(null);
  discoveredCreatures.clear();
  fulfilledDreams.clear();
  dreamJournal = [];
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
    button.querySelector('.garden-creature__label').textContent = '?';
    const creature = creatures[button.dataset.creature];
    button.setAttribute('aria-label', `Discover the ${creature.name}`);
  });
  feedback.textContent = 'The garden is ready for new little dreams.';
  saveGarden();
  saveDreams();
  render();
});

readSavedGarden();
readSavedDreams();
document.querySelectorAll('.garden-creature').forEach((button) => {
  if (discoveredCreatures.has(button.dataset.creature)) {
    const creature = creatures[button.dataset.creature];
    button.classList.add('is-discovered');
    button.setAttribute('aria-label', `${creature.name}: ${creature.description}`);
    button.querySelector('.garden-creature__label').textContent = '✓';
  }
});
render();
visitorId = getVisitorId();
initializeGardenSync();
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
