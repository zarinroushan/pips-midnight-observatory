const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const sourcePath = path.resolve(__dirname, '..', 'dream-garden.js');
const source = fs.readFileSync(sourcePath, 'utf8');
const html = fs.readFileSync(path.resolve(__dirname, '..', 'dream-garden.html'), 'utf8');
const seedsStart = source.indexOf('const seeds =');
const requestStart = source.indexOf('async function gardenApiRequest(');
const requestEnd = source.indexOf('\nasync function readGardenApiJson(', requestStart);
assert.notEqual(seedsStart, -1);
assert.notEqual(requestStart, -1);
assert.notEqual(requestEnd, -1);
const apiBaseSource = source.slice(0, seedsStart);
const requestSource = source.slice(requestStart, requestEnd);

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
    assert.equal(getLastRequest().options.credentials, 'include');
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
    '/api/guestbook?limit=20',
    '/api/guestbook',
  ]) {
    await api.request(route, route.endsWith('/guestbook') ? { method: 'POST', body: '{}' } : {});
    assert.equal(getLastRequest().url, `${api.base}${route}`);
    assert.equal(getLastRequest().options.mode, 'cors');
    assert.equal(getLastRequest().options.credentials, 'include');
  }
});

test('Dream Garden HTML uses the Render API base and omits the removed guardian control', () => {
  assert.match(
    html,
    /<meta name="dear-pip-api-base" content="https:\/\/pips-midnight-observatory-egql\.onrender\.com">/,
  );
  assert.doesNotMatch(html, /data-creature="sprite"|Dewdrop Sprite/i);
  assert.doesNotMatch(source, /\bsprite:\s*\{/);
});
