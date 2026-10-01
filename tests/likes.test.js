import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { createLikesApi, getVisitorId, isConfigured } from '../likes-api.js';

const config = { supabaseUrl: 'https://test-project.supabase.co', publishableKey: 'sb_publishable_test' };
const migration = await readFile(new URL('../supabase/migrations/202609300001_doll_likes.sql', import.meta.url), 'utf8');
let db;

before(async () => {
  db = new PGlite();
  await db.exec('create role anon; create role authenticated;');
  await db.exec(migration);
  await db.exec('set role anon');
});
after(async () => { await db?.close(); });

// Exercise the actual production SQL and browser API client together. The only
// substituted layer is the HTTP gateway; each caller has a separate visitor ID.
async function transport(url, options) {
  const method = new URL(url).pathname.split('/').at(-1);
  assert.ok(['ningyo_get_likes', 'ningyo_add_like'].includes(method));
  assert.equal(options.headers.apikey, config.publishableKey);
  assert.equal(options.credentials, 'omit');
  const body = JSON.parse(options.body);
  const { rows } = await db.query(`select public.${method}($1::integer, $2::uuid) as result`, [body.p_doll_id, body.p_visitor_id]);
  return { ok: true, json: async () => rows[0].result };
}

test('two visitors see the same persistent total but their own liked state', async () => {
  const a = createLikesApi(config, transport);
  const b = createLikesApi(config, transport);
  const idA = randomUUID();
  const idB = randomUUID();
  assert.deepEqual(await a.get(16, idA), { count: 0, liked: false });
  assert.deepEqual(await a.like(16, idA), { count: 1, liked: true });
  assert.deepEqual(await b.get(16, idB), { count: 1, liked: false });
  assert.deepEqual(await b.like(16, idB), { count: 2, liked: true });
  assert.deepEqual(await a.get(16, idA), { count: 2, liked: true });
});

test('repeated requests and reopening the page cannot count the same vote twice', async () => {
  const id = randomUUID();
  const a = createLikesApi(config, transport);
  await Promise.all(Array.from({ length: 12 }, () => a.like(22, id)));
  const reopened = createLikesApi(config, transport);
  assert.deepEqual(await reopened.get(22, id), { count: 1, liked: true });
  assert.deepEqual(await reopened.like(22, id), { count: 1, liked: true });
});

test('a lost success response can be retried without adding an extra vote', async () => {
  const id = randomUUID();
  let loseResponse = true;
  const client = createLikesApi(config, async (...args) => {
    const response = await transport(...args);
    if (loseResponse) { loseResponse = false; throw new Error('Connection lost after commit'); }
    return response;
  });
  await assert.rejects(client.like(28, id), /Connection lost/);
  assert.deepEqual(await client.like(28, id), { count: 1, liked: true });
  assert.deepEqual(await createLikesApi(config, transport).get(28, randomUUID()), { count: 1, liked: false });
});

test('different dolls have independent counters keyed to stable QR filenames', async () => {
  const api = createLikesApi(config, transport);
  const id = randomUUID();
  assert.deepEqual(await api.like(1, id), { count: 1, liked: true }); // Amabie, display No.41.
  assert.deepEqual(await api.get(41, id), { count: 0, liked: false });
  for (let n = 1; n <= 43; n++) {
    const html = await readFile(new URL(`../${String(n).padStart(2, '0')}.html`, import.meta.url), 'utf8');
    assert.equal((html.match(/class="likes"/g) || []).length, 1);
    assert.ok(html.includes(`data-doll-id="${n}"`));
    assert.ok(html.includes('<script type="module" src="likes.js"></script>'));
  }
});

test('public visitors cannot read voter IDs, set totals, or delete votes', async () => {
  await assert.rejects(db.query('select * from ningyo_private.doll_like_votes'), /permission denied/);
  await assert.rejects(db.query('update ningyo_private.doll_like_counts set like_count = 999'), /permission denied/);
  await assert.rejects(db.query('delete from ningyo_private.doll_like_votes'), /permission denied/);
});

test('server rejects missing or out-of-range IDs without changing counts', async () => {
  for (const id of [0, 44, null]) {
    await assert.rejects(db.query('select public.ningyo_add_like($1::integer, $2::uuid)', [id, randomUUID()]), /Invalid like request/);
  }
  await assert.rejects(db.query('select public.ningyo_add_like(2, null)'), /Invalid like request/);
  assert.deepEqual(await createLikesApi(config, transport).get(2, randomUUID()), { count: 0, liked: false });
});

test('rerunning the migration preserves existing likes', async () => {
  await db.exec('reset role');
  await db.exec(migration);
  await db.exec('set role anon');
  assert.deepEqual(await createLikesApi(config, transport).get(16, randomUUID()), { count: 2, liked: false });
});

test('failed requests and invalid counts are errors, never invented successes', async () => {
  const id = randomUUID();
  for (const value of [{ count: -1, liked: false }, { count: '3', liked: false }, { count: 4 }, { count: 2, liked: false }]) {
    const api = createLikesApi(config, async () => ({ ok: true, json: async () => value }));
    await assert.rejects(api.like(2, id), /Invalid shared likes response/);
  }
  await assert.rejects(createLikesApi(config, async () => ({ ok: false })).like(2, id), /request failed/);
});

test('a slow request times out instead of leaving the button pending forever', async () => {
  const fetcher = (url, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(new Error('Timed out')), { once: true });
  });
  await assert.rejects(createLikesApi(config, fetcher, 10).get(2, randomUUID()), /Timed out/);
});

test('the same browser reuses its anonymous ID, and blocked storage has a fallback', () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
  const first = getVisitorId([storage], randomUUID);
  assert.equal(getVisitorId([storage], randomUUID), first);
  const blocked = { getItem() { throw Error('Blocked'); }, setItem() { throw Error('Blocked'); } };
  assert.ok(getVisitorId([blocked], randomUUID));
});

test('no shared backend or a secret key cannot activate the public widget', () => {
  assert.equal(isConfigured({}), false);
  assert.equal(isConfigured({ ...config, publishableKey: 'sb_secret_do_not_publish' }), false);
  assert.equal(isConfigured(config), true);
});
