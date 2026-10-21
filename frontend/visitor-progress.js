(() => {
  const visitorStorageKey = 'dear-pip-garden-visitor-v1';
  const apiMeta = document.querySelector('meta[name="dear-pip-api-base"]');
  const configuredBase = apiMeta?.content.trim();
  const apiBase = (configuredBase || (
    ['localhost', '127.0.0.1'].includes(window.location.hostname)
      ? 'http://127.0.0.1:5000'
      : window.location.origin
  )).replace(/\/+$/, '');
  const revisions = new Map();
  const loading = new Map();
  const queues = new Map();

  function getVisitorId() {
    try {
      const saved = localStorage.getItem(visitorStorageKey);
      if (saved && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(saved)) return saved;
      const id = crypto.randomUUID();
      localStorage.setItem(visitorStorageKey, id);
      return id;
    } catch (_error) {
      return null;
    }
  }

  function normalize(feature, value) {
    if (!value || value.version !== 1) return null;
    if (feature === 'home') {
      if (!Array.isArray(value.collected) || !Array.isArray(value.collectedButterflies)) return null;
      return {
        version: 1,
        collected: [...new Set(value.collected.filter((item) => Number.isInteger(item) && item >= 0 && item < 5))],
        collectedButterflies: [...new Set(value.collectedButterflies.filter((item) => Number.isInteger(item) && item >= 0 && item < 2))],
      };
    }
    if (feature === 'atlas') {
      if (!Array.isArray(value.discovered)) return null;
      const known = new Set(['lantern', 'sail', 'whale', 'garden', 'bell']);
      return {
        version: 1,
        discovered: [...new Set(value.discovered.filter((item) => known.has(item)))],
        puzzleComplete: value.puzzleComplete === true,
      };
    }
    if (feature === 'bedtime') {
      const adventures = new Set(['missing-star', 'lumi-wish', 'music-box', 'lantern-path', 'little-lights', 'ember-glow', 'nova-day', 'mochi-place', 'pippa-song']);
      const scenes = new Set([
        'opening', 'hill', 'cloud', 'skyEnding', 'gardenEnding', 'nightlightEnding',
        'star-start', 'star-hill', 'star-cloud', 'star-home', 'star-garden', 'star-nightlight',
        'lumi-start', 'lumi-question', 'lumi-meadow', 'lumi-seedlings', 'lumi-meadow-ending', 'lumi-seedlings-ending',
        'music-start', 'music-clue', 'music-rain', 'music-hum', 'music-rain-ending', 'music-hum-ending',
        'lantern-start', 'lantern-crossroads', 'lantern-fireflies', 'lantern-call', 'lantern-friend', 'lantern-ending',
        'lights-start', 'lights-challenge', 'lights-circle', 'lights-rhythm', 'lights-circle-ending', 'lights-rhythm-ending',
        'ember-start', 'ember-choice', 'ember-flowers', 'ember-pond', 'ember-flower-ending', 'ember-pond-ending',
        'nova-start', 'nova-choice', 'nova-stones', 'nova-rest', 'nova-stones-ending', 'nova-rest-ending',
        'mochi-start', 'mochi-choice', 'mochi-willow', 'mochi-flowers', 'mochi-willow-ending', 'mochi-flowers-ending',
        'pippa-start', 'pippa-choice', 'pippa-petals', 'pippa-bellflower', 'pippa-petals-ending', 'pippa-bellflower-ending',
      ]);
      if (!scenes.has(value.scene)) return null;
      const visited = Array.isArray(value.visited) ? value.visited.filter((item) => scenes.has(item)) : [];
      const adventure = adventures.has(value.adventure) ? value.adventure : null;
      const completed = Array.isArray(value.completed) ? [...new Set(value.completed.filter((item) => adventures.has(item)))] : [];
      return { version: 1, scene: value.scene, visited: [...new Set([...visited, value.scene])], adventure, completed };
    }
    if (feature === 'lullaby') {
      if (!Array.isArray(value.bubbles)) return null;
      const deleted = Array.isArray(value.deletedBubbles) ? value.deletedBubbles : [];
      const deletedBubbles = [...new Set(deleted.filter((item) => typeof item === 'string' && item.trim() && item.length <= 240).map((item) => item.trim()))].slice(-40);
      const removed = new Set(deletedBubbles);
      return {
        version: 1,
        bubbles: [...new Set(value.bubbles.filter((item) => typeof item === 'string' && item.trim() && item.length <= 240).map((item) => item.trim()))].filter((item) => !removed.has(item)).slice(-20),
        deletedBubbles,
      };
    }
    return null;
  }

  function merge(feature, current, incoming) {
    const left = normalize(feature, current);
    const right = normalize(feature, incoming);
    if (!left) return right;
    if (!right) return left;
    if (feature === 'home') {
      return {
        version: 1,
        collected: [...new Set([...left.collected, ...right.collected])].sort((a, b) => a - b),
        collectedButterflies: [...new Set([...left.collectedButterflies, ...right.collectedButterflies])].sort((a, b) => a - b),
      };
    }
    if (feature === 'atlas') {
      return {
        version: 1,
        discovered: [...new Set([...left.discovered, ...right.discovered])],
        puzzleComplete: left.puzzleComplete || right.puzzleComplete,
      };
    }
    if (feature === 'bedtime') {
      return {
        version: 1,
        scene: right.scene,
        visited: [...new Set([...left.visited, ...right.visited])],
        adventure: right.adventure || left.adventure,
        completed: [...new Set([...left.completed, ...right.completed])],
      };
    }
    const deletedBubbles = [...new Set([...left.deletedBubbles, ...right.deletedBubbles])].slice(-40);
    const removed = new Set(deletedBubbles);
    return {
      version: 1,
      bubbles: [...new Set([...left.bubbles, ...right.bubbles])].filter((item) => !removed.has(item)).slice(-20),
      deletedBubbles,
    };
  }

  async function request(feature, method = 'GET', revision = 0, data) {
    const visitorId = getVisitorId();
    if (!visitorId) throw new Error('Browser visitor storage is unavailable.');
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(`${apiBase}/api/progress/${visitorId}/${feature}`, {
        method,
        mode: 'cors',
        credentials: 'omit',
        signal: controller.signal,
        headers: { Accept: 'application/json', ...(method === 'PUT' ? { 'Content-Type': 'application/json' } : {}) },
        body: method === 'PUT' ? JSON.stringify({ revision, data }) : undefined,
      });
      let result;
      try { result = await response.json(); } catch (_error) { throw new Error('Progress API returned an unreadable response.'); }
      if (!response.ok && response.status !== 409) throw new Error(result.error || `Progress request failed (${response.status}).`);
      return { response, result };
    } finally {
      window.clearTimeout(timeout);
    }
  }

  async function loadStoryContext() {
    const visitorId = getVisitorId();
    if (!visitorId) throw new Error('Visitor progress storage is unavailable.');
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(`${apiBase}/api/stories/context/${visitorId}`, {
        mode: 'cors', credentials: 'omit', signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `Story context request failed (${response.status}).`);
      return result;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  async function write(feature, data, revision) {
    let attempt = await request(feature, 'PUT', revision, data);
    if (attempt.response.status === 409) {
      const merged = merge(feature, attempt.result.data, data);
      attempt = await request(feature, 'PUT', attempt.result.revision, merged);
      if (attempt.response.status === 409) throw new Error('Visitor progress changed in another tab. Your local copy remains available.');
      data = merged;
    }
    revisions.set(feature, attempt.result.revision);
    return data;
  }

  function hasProgress(feature, value) {
    const data = normalize(feature, value);
    if (!data) return false;
    if (feature === 'home') return data.collected.length > 0 || data.collectedButterflies.length > 0;
    if (feature === 'atlas') return data.discovered.length > 0 || data.puzzleComplete;
    if (feature === 'bedtime') return data.scene !== 'opening' || data.visited.length > 1 || data.completed.length > 0;
    return data.bubbles.length > 0 || data.deletedBubbles.length > 0;
  }

  async function load(feature, localValue) {
    const local = normalize(feature, localValue);
    const fallback = local || localValue;
    const visitorId = getVisitorId();
    if (!visitorId) return { data: fallback, persistent: false };
    const task = (async () => {
      try {
        const { result } = await request(feature);
        revisions.set(feature, result.revision);
        const remote = normalize(feature, result.data);
        if (!remote) {
          if (hasProgress(feature, local)) {
            const migrated = await write(feature, local, result.revision);
            return { data: migrated, persistent: true };
          }
          return { data: fallback, persistent: true };
        }
        const merged = merge(feature, remote, local);
        if (JSON.stringify(merged) !== JSON.stringify(remote)) await write(feature, merged, result.revision);
        return { data: merged, persistent: true };
      } catch (error) {
        console.error(`Could not load ${feature} progress from the API:`, error);
        return { data: fallback, persistent: false };
      }
    })();
    loading.set(feature, task);
    return task;
  }

  function save(feature, data) {
    const previous = queues.get(feature) || Promise.resolve();
    const next = previous.catch(() => {}).then(async () => {
      await loading.get(feature);
      const revision = revisions.get(feature) || 0;
      return write(feature, normalize(feature, data), revision);
    });
    queues.set(feature, next);
    return next;
  }

  window.DearPipProgress = { getVisitorId, load, save, loadStoryContext };
})();
