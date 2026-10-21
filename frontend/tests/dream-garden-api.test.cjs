const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const sourcePath = path.resolve(__dirname, '..', 'dream-garden.js');
const source = fs.readFileSync(sourcePath, 'utf8');
const html = fs.readFileSync(path.resolve(__dirname, '..', 'dream-garden.html'), 'utf8');
const css = fs.readFileSync(path.resolve(__dirname, '..', 'style.css'), 'utf8');
const seedsStart = source.indexOf('const seeds =');
const requestStart = source.indexOf('async function gardenApiRequest(');
const requestEnd = source.indexOf('\nasync function readGardenApiJson(', requestStart);
const readJsonStart = requestEnd + 1;
const privateStateStart = source.indexOf('async function fetchPrivateGardenState(', readJsonStart);
const privateStateEnd = source.indexOf('\nfunction scheduleGardenSync(', privateStateStart);
const guestbookHelpersStart = source.indexOf('async function fetchApprovedGuestbook(', privateStateEnd);
const guestbookHelpersEnd = source.indexOf('\nfunction readSavedGarden(', guestbookHelpersStart);
const wishHelpersStart = source.indexOf('function eligibleWishEntries(');
const wishHelpersEnd = source.indexOf('\nfunction renderWishStars(', wishHelpersStart);
const guardianHelperStart = source.indexOf('function wishesForGuardian(');
const guardianHelperEnd = source.indexOf('\nfunction renderPrivateDreams(', guardianHelperStart);
assert.notEqual(seedsStart, -1);
assert.notEqual(requestStart, -1);
assert.notEqual(requestEnd, -1);
assert.notEqual(privateStateStart, -1);
assert.notEqual(privateStateEnd, -1);
assert.notEqual(guestbookHelpersStart, -1);
assert.notEqual(guestbookHelpersEnd, -1);
assert.notEqual(wishHelpersStart, -1);
assert.notEqual(wishHelpersEnd, -1);
assert.notEqual(guardianHelperStart, -1);
assert.notEqual(guardianHelperEnd, -1);
const apiBaseSource = source.slice(0, seedsStart);
const requestSource = source.slice(requestStart, requestEnd);
const readJsonSource = source.slice(readJsonStart, privateStateStart);
const privateStateSource = source.slice(privateStateStart, privateStateEnd);
const guestbookHelpersSource = source.slice(guestbookHelpersStart, guestbookHelpersEnd);
const wishHelpersSource = source.slice(wishHelpersStart, wishHelpersEnd);
const guardianHelperSource = source.slice(guardianHelperStart, guardianHelperEnd);

function createGardenBehaviorHelpers() {
  const context = { TypeError, Error, JSON, Map, Set, Date };
  vm.runInNewContext(
    `${readJsonSource}\n${privateStateSource}\n${guestbookHelpersSource}\n${wishHelpersSource}\n${guardianHelperSource}\nglobalThis.helpers = { fetchPrivateGardenState, requestWishFulfillment, privateGardenLoadMessage, fetchApprovedGuestbook, submitGuestbookEntry, guestbookConnectionMessage, eligibleWishEntries, wishesForGuardian };`,
    context,
  );
  return context.helpers;
}

function jsonResponse(status, value, contentType = 'application/json') {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: (name) => name === 'content-type' ? contentType : null },
    json: async () => value,
  };
}

async function createApi(hostname, metaContent) {
  let lastRequest;
  const context = {
    document: { querySelector: () => ({ content: metaContent }) },
    window: {
      location: { hostname },
      setTimeout: () => 1,
      clearTimeout: () => {},
    },
    AbortController,
    fetch: async (url, options) => {
      lastRequest = { url, options };
      return lastRequest;
    },
  };
  vm.runInNewContext(
    `${apiBaseSource}\n${requestSource}\nglobalThis.api = { base: gardenApiBase, request: gardenApiRequest };`,
    context,
  );
  return { api: context.api, getLastRequest: () => lastRequest };
}

test('local hosts use their local Flask server ahead of the configured production URL', async () => {
  for (const host of ['localhost', '127.0.0.1']) {
    const { api, getLastRequest } = await createApi(
      host,
      'https://pips-midnight-observatory-egql.onrender.com/',
    );
    assert.equal(api.base, `http://${host}:5000`);
    await api.request('/api/guestbook?limit=20');
    assert.equal(getLastRequest().url, `http://${host}:5000/api/guestbook?limit=20`);
    assert.equal(getLastRequest().options.credentials, 'omit');
  }
});

test('deployed host uses the configured backend for Garden and guestbook routes', async () => {
  const { api, getLastRequest } = await createApi(
    'dear-pip-pearl.vercel.app',
    'https://pips-midnight-observatory-egql.onrender.com/',
  );
  assert.equal(api.base, 'https://pips-midnight-observatory-egql.onrender.com');
  for (const route of [
    '/api/garden/session',
    '/api/garden/state',
    '/api/garden/wish-counts',
    '/api/guestbook?limit=20',
    '/api/guestbook',
  ]) {
    await api.request(route, route.endsWith('/guestbook') ? { method: 'POST', body: '{}' } : {});
    assert.equal(getLastRequest().url, `${api.base}${route}`);
    assert.equal(getLastRequest().options.mode, 'cors');
    assert.equal(
      getLastRequest().options.credentials,
      route.startsWith('/api/guestbook') || route === '/api/garden/wish-counts' ? 'omit' : 'include',
    );
  }
});

test('Dream Garden HTML uses the Render API base and omits the removed guardian control', () => {
  assert.match(
    html,
    /<meta name="dear-pip-api-base" content="https:\/\/pips-midnight-observatory-egql\.onrender\.com">/,
  );
  assert.doesNotMatch(html, /data-creature="sprite"|Dewdrop Sprite/i);
  assert.doesNotMatch(source, /\bsprite:\s*\{/);
  assert.match(html, /id="gardenWishStars"[^>]*hidden/);
  assert.match(html, /tiny decorative background stars/);
  assert.doesNotMatch(source, /fulfilledDreams\.add/);
  assert.match(source, /\/api\/garden\/wishes\/\$\{encodeURIComponent\(wishId\)\}\/fulfill/);
});

test('guestbook helpers return approved entries, send pending notes, and preserve API failures', async () => {
  const helpers = createGardenBehaviorHelpers();
  const approved = [{ id: 4, display_name: 'Pip', dream_message: 'A public note' }];
  const entries = await helpers.fetchApprovedGuestbook(async (url) => {
    assert.equal(url, '/api/guestbook?limit=20');
    return jsonResponse(200, { entries: approved });
  });
  assert.equal(entries.length, 1);
  assert.equal(entries[0].id, 4);

  let posted;
  const saved = await helpers.submitGuestbookEntry(
    { display_name: '  ', dream_message: '  A private idea?  ' },
    async (url, options) => {
      posted = { url, options };
      return jsonResponse(201, { entry: { status: 'pending' } });
    },
  );
  assert.equal(saved.entry.status, 'pending');
  assert.equal(posted.url, '/api/guestbook');
  assert.deepEqual(JSON.parse(posted.options.body), {
    display_name: null,
    dream_message: 'A private idea?',
  });

  await assert.rejects(
    helpers.fetchApprovedGuestbook(async () => jsonResponse(503, { error: 'Guestbook is temporarily unavailable.' })),
    /Guestbook is temporarily unavailable/,
  );
  await assert.rejects(
    helpers.fetchApprovedGuestbook(async () => jsonResponse(404, 'Not Found', 'text/html')),
    /non-JSON response \(HTTP 404\)/,
  );
  assert.match(
    helpers.guestbookConnectionMessage(new TypeError('fetch failed'), 'load'),
    /connection and the site’s cross-origin API configuration/,
  );
  await assert.rejects(
    helpers.submitGuestbookEntry(
      { display_name: 'Pip', dream_message: 'A note' },
      async () => jsonResponse(503, { error: 'Guestbook is temporarily unavailable.' }),
    ),
    /Guestbook is temporarily unavailable/,
  );
  assert.match(
    helpers.guestbookConnectionMessage(new TypeError('fetch failed'), 'submit'),
    /cross-origin API configuration/,
  );
});

test('private wish loading uses the authenticated Garden state and reports request failures', async () => {
  const helpers = createGardenBehaviorHelpers();
  const calls = [];
  const state = { state: null, revision: 0 };
  const loaded = await helpers.fetchPrivateGardenState(async (url) => {
    calls.push(url);
    return url.endsWith('/session')
      ? jsonResponse(200, { status: 'ready' })
      : jsonResponse(200, state      );
  });

  test('explicit wish fulfillment sends the selected wish revision and reports API failures', async () => {
      const helpers = createGardenBehaviorHelpers();
      let requestDetails;
      const result = await helpers.requestWishFulfillment(
        'wish / one',
        7,
        async (url, options) => {
          requestDetails = { url, options };
          return jsonResponse(200, { revision: 8, fulfilledWishes: [{ id: 'wish / one' }] });
        },
      );
      assert.equal(requestDetails.url, '/api/garden/wishes/wish%20%2F%20one/fulfill');
      assert.equal(requestDetails.options.method, 'POST');
      assert.deepEqual(JSON.parse(requestDetails.options.body), { revision: 7 });
      assert.equal(result.revision, 8);
      await assert.rejects(
        helpers.requestWishFulfillment('wish-1', 7, async () => (
          jsonResponse(409, { error: 'The wish changed; reload your garden and try again.' })
        )),
        /wish changed/,
      );
  });
  assert.deepEqual(calls, ['/api/garden/session', '/api/garden/state']);
  assert.equal(loaded.state, null);

  const populated = {
    state: {
      dreamJournal: [
        { id: 'moth-wish', creature: 'moth', wish: 'Write a story.' },
        { id: 'fox-wish', creature: 'fox', wish: 'Try a new trail.' },
      ],
    },
    revision: 3,
  };
  const restored = await helpers.fetchPrivateGardenState(async (url) => (
    url.endsWith('/session') ? jsonResponse(200, { status: 'ready' }) : jsonResponse(200, populated)
  ));
  assert.equal(restored.state.dreamJournal.length, 2);
  assert.deepEqual(
    Array.from(helpers.wishesForGuardian(restored.state.dreamJournal, 'fox'), (wish) => wish.id),
    ['fox-wish'],
  );
  await assert.rejects(
    helpers.fetchPrivateGardenState(async () => { throw new TypeError('network failure'); }),
    /network failure/,
  );
  assert.match(
    helpers.privateGardenLoadMessage(new TypeError('network failure')),
    /private Garden session/,
  );
  assert.doesNotMatch(
    helpers.privateGardenLoadMessage(new TypeError('network failure')),
    /guestbook/i,
  );
});

test('wish stars exist only for confirmed active wishes and update on removal and reset', () => {
  const helpers = createGardenBehaviorHelpers();
  const wishes = [
    { id: 'one', wish: 'Wish one' },
    { id: 'two', wish: 'Wish two' },
    { id: 'local-only', wish: 'Not yet saved' },
  ];
  const none = helpers.eligibleWishEntries([], new Set(), new Map());
  assert.equal(none.length, 0);
  const one = helpers.eligibleWishEntries(wishes, new Set(['one']), new Map());
  assert.deepEqual(Array.from(one, (wish) => wish.id), ['one']);
  const many = helpers.eligibleWishEntries(wishes, new Set(['one', 'two']), new Map());
  assert.deepEqual(Array.from(many, (wish) => wish.id), ['one', 'two']);
  const removed = helpers.eligibleWishEntries(wishes.filter((wish) => wish.id !== 'one'), new Set(['one']), new Map());
  assert.equal(removed.length, 0);
  const reset = helpers.eligibleWishEntries([], new Set(), new Map());
  assert.equal(reset.length, 0);
});

test('Dream Garden light theme controls and mobile actions have scoped styles', () => {
  assert.match(css, /html\[data-mood="dawn"\] body\.garden-page/);
  assert.match(css, /html\[data-mood="dawn"\] \.garden-page \.garden-private-dreams textarea/);
  assert.match(css, /html\[data-mood="dawn"\] \.garden-page \.garden-guestbook__form input/);
  assert.match(css, /html\[data-mood="dawn"\] \.garden-page \.garden-private-wish-remove/);
  assert.match(css, /\.garden-private-dreams \.garden-private-wish-remove:hover:not\(:disabled\)/);
  assert.match(css, /\.garden-private-wish-fulfill:disabled/);
  assert.match(css, /@media \(max-width: 620px\)[\s\S]*?\.garden-private-wish-fulfill/);
});
