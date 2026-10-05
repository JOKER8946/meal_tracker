// Integration test against a real Supabase project. Uses ONLY the public key and
// two dedicated ordinary accounts. Writes random test records, then removes them.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const required = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'TEST_USER_A_EMAIL', 'TEST_USER_A_PASSWORD', 'TEST_USER_B_EMAIL', 'TEST_USER_B_PASSWORD'];
for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing ${key}. See README.md; no live test was run.`);
}
const base = process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, '');
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const cleanup = [];
const sessions = [];
let checks = 0;

async function request(path, { token, method = 'GET', body, binary, headers = {} } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { apikey: key, ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers },
    body: binary ?? (body !== undefined ? JSON.stringify(body) : undefined),
    signal: AbortSignal.timeout(30000),
  });
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { ok: response.ok, status: response.status, data };
}
function ok(result, label) {
  assert.equal(result.ok, true, `${label}: HTTP ${result.status}`);
  checks++;
  return result.data;
}
function denied(result, label) {
  assert.equal(result.ok, false, `${label}: unexpectedly succeeded`);
  assert.ok([400, 401, 403, 404].includes(result.status), `${label}: unexpected HTTP ${result.status}`);
  checks++;
}
function deniedRls(result, label) {
  denied(result, label);
  assert.equal(result.data?.code, '42501', `${label}: failed for a reason other than access control`);
}
const rest = (table, query = '') => `/rest/v1/${table}${query}`;
const object = name => `/storage/v1/object/meal-photos/${name}`;
const jpeg = Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABBQJ//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPwF//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPwF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQAGPwJ//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPyF//9oADAMBAAIAAwAAABD/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/EB//xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/EB//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/EB//2Q==', 'base64');

try {
  for (const label of ['A', 'B']) {
    const auth = ok(await request('/auth/v1/token?grant_type=password', { method: 'POST', body: {
      email: process.env[`TEST_USER_${label}_EMAIL`], password: process.env[`TEST_USER_${label}_PASSWORD`],
    } }), `Account ${label} login`);
    sessions.push({ label, token: auth.access_token, id: auth.user.id, records: {} });
  }
  assert.notEqual(sessions[0].id, sessions[1].id, 'Two distinct accounts are required');

  for (const user of sessions) {
    const photo = `${user.id}/${randomUUID()}.jpg`;
    user.photo = photo;
    cleanup.push(async () => ok(await request('/storage/v1/object/meal-photos', {
      token: user.token, method: 'DELETE', body: { prefixes: [photo] },
    }), 'Photo cleanup'));
    ok(await request(object(photo), { token: user.token, method: 'POST', binary: jpeg,
      headers: { 'Content-Type': 'image/jpeg', 'x-upsert': 'false' } }), 'Own photo upload');
    ok(await request(object(photo), { token: user.token }), 'Own photo download');
    denied(await request(`/storage/v1/object/public/meal-photos/${photo}`), 'Public photo download');
    const rejectedPhoto = `${user.id}/${randomUUID()}.jpg`;
    cleanup.push(async () => ok(await request('/storage/v1/object/meal-photos', {
      token: user.token, method: 'DELETE', body: { prefixes: [rejectedPhoto] },
    }), 'Rejected-upload cleanup'));
    denied(await request(object(rejectedPhoto), { token: user.token, method: 'POST', binary: Buffer.alloc(200001),
      headers: { 'Content-Type': 'image/jpeg' } }), 'Oversize photo upload');
    denied(await request(object(rejectedPhoto), { token: user.token, method: 'POST', binary: Buffer.from('not an image'),
      headers: { 'Content-Type': 'text/plain' } }), 'Wrong MIME upload');

    // Pick an unoccupied test day, leaving existing user data untouched.
    const occupied = ok(await request(rest('sleep_logs', '?select=sleep_date'), { token: user.token }), 'Read own sleep days');
    let testDate = new Date('2090-01-01T00:00:00Z');
    while (occupied.some(row => row.sleep_date === testDate.toISOString().slice(0, 10))) testDate.setUTCDate(testDate.getUTCDate() + 1);
    const day = testDate.toISOString().slice(0, 10);
    const bedtime = new Date(testDate.getTime() - 3600000).toISOString();
    const wake = new Date(testDate.getTime() + 7 * 3600000).toISOString();
    const bodies = {
      meals: { id: randomUUID(), user_id: user.id, meal_type: 'snack', notes: 'RLS integration fixture',
        eaten_at: `${day}T12:00:00Z`, meal_date: day, photo_path: photo },
      sleep_logs: { id: randomUUID(), user_id: user.id, sleep_date: day, slept_at: bedtime, woke_at: wake },
    };
    for (const [table, body] of Object.entries(bodies)) {
      user.records[table] = body;
      cleanup.push(async () => {
        ok(await request(rest(table, `?id=eq.${body.id}`), { token: user.token, method: 'DELETE' }), `${table} cleanup`);
        assert.deepEqual(ok(await request(rest(table, `?id=eq.${body.id}`), { token: user.token }), `${table} deleted`), []);
      });
      const rows = ok(await request(rest(table), { token: user.token, method: 'POST', body,
        headers: { Prefer: 'return=representation' } }), `${table} own insert`);
      assert.equal(rows[0].user_id, user.id);
      if (table === 'sleep_logs') assert.equal(Number(rows[0].duration_minutes), 480);
    }
  }

  for (const [user, other] of [[sessions[0], sessions[1]], [sessions[1], sessions[0]]]) {
    for (const table of ['meals', 'sleep_logs']) {
      const own = user.records[table];
      const foreign = other.records[table];
      const rows = ok(await request(rest(table, '?select=*'), { token: user.token }), `${table} unfiltered read`);
      assert.ok(rows.length > 0 && rows.every(row => row.user_id === user.id), `${table} leaked another user's data`);
      const filter = `?id=eq.${foreign.id}`;
      assert.deepEqual(ok(await request(rest(table, filter), { token: user.token }), 'Foreign read'), []);
      const patch = table === 'meals' ? { notes: 'edit verified' } : { woke_at: own.woke_at };
      assert.equal(ok(await request(rest(table, `?id=eq.${own.id}`), { token: user.token, method: 'PATCH', body: patch,
        headers: { Prefer: 'return=representation' } }), 'Own update').length, 1);
      assert.deepEqual(ok(await request(rest(table, filter), { token: user.token, method: 'PATCH', body: patch,
        headers: { Prefer: 'return=representation' } }), 'Foreign update'), []);
      assert.deepEqual(ok(await request(rest(table, filter), { token: user.token, method: 'DELETE',
        headers: { Prefer: 'return=representation' } }), 'Foreign delete'), []);
      const forgedId = randomUUID();
      cleanup.push(async () => ok(await request(rest(table, `?id=eq.${forgedId}`), { token: other.token, method: 'DELETE' }), 'Forged insert cleanup'));
      deniedRls(await request(rest(table), { token: user.token, method: 'POST', body: { ...foreign, id: forgedId } }), 'Forged owner insert');
      deniedRls(await request(rest(table, `?id=eq.${own.id}`), { token: user.token, method: 'PATCH',
        body: { user_id: other.id, ...(table === 'meals' ? { photo_path: other.photo } : {}) } }), 'Owner reassignment');
      deniedRls(await request(rest(table)), 'Anonymous read');
      deniedRls(await request(rest(table), { method: 'POST', body: { ...own, id: randomUUID() } }), 'Anonymous insert');
      // An owner re-read proves attacks did not silently remove the fixture.
      assert.equal(ok(await request(rest(table, filter), { token: other.token }), 'Owner re-read').length, 1);
    }
    denied(await request(object(other.photo), { token: user.token }), 'Foreign photo read');
    denied(await request(`/storage/v1/object/sign/meal-photos/${other.photo}`, {
      token: user.token, method: 'POST', body: { expiresIn: 60 },
    }), 'Foreign signed URL');
    const signed = ok(await request(`/storage/v1/object/sign/meal-photos/${user.photo}`, {
      token: user.token, method: 'POST', body: { expiresIn: 60 },
    }), 'Own signed URL');
    assert.ok(signed.signedURL, 'Missing own signed photo URL');
    denied(await request(object(other.photo), { token: user.token, method: 'PUT', binary: jpeg,
      headers: { 'Content-Type': 'image/jpeg' } }), 'Foreign photo overwrite');
    const forged = `${other.id}/${randomUUID()}.jpg`;
    cleanup.push(async () => ok(await request('/storage/v1/object/meal-photos', {
      token: other.token, method: 'DELETE', body: { prefixes: [forged] },
    }), 'Forged upload cleanup'));
    denied(await request(object(forged), { token: user.token, method: 'POST', binary: jpeg,
      headers: { 'Content-Type': 'image/jpeg' } }), 'Foreign photo insert');
    const listed = ok(await request('/storage/v1/object/list/meal-photos', { token: user.token, method: 'POST',
      body: { prefix: other.id, limit: 100 } }), 'Foreign folder listing');
    assert.deepEqual(listed, []);
    const deletion = await request('/storage/v1/object/meal-photos', { token: user.token, method: 'DELETE', body: { prefixes: [other.photo] } });
    if (deletion.ok) assert.deepEqual(deletion.data, []); else denied(deletion, 'Foreign photo delete');
    ok(await request(object(other.photo), { token: other.token }), 'Photo survives foreign deletion');
    denied(await request(object(user.photo)), 'Anonymous private photo read');
  }
} finally {
  const failures = [];
  for (const remove of cleanup.reverse()) {
    try { await remove(); } catch (error) { failures.push(error.message); }
  }
  for (const user of sessions) {
    try { ok(await request('/auth/v1/logout?scope=local', { token: user.token, method: 'POST' }), 'Test-session logout'); }
    catch (error) { failures.push(error.message); }
  }
  if (failures.length) throw new Error(`Test cleanup failed: ${failures.join('; ')}. Inspect test-account fixtures before rerunning.`);
}
console.log(`PASS: ${checks} live API checks with two distinct ordinary accounts, including database and Storage isolation and fixture cleanup.`);
