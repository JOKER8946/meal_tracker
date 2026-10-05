import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const PHOTO = '33333333-3333-4333-8333-333333333333.jpg';

test('migration and RLS using two simulated JWT identities in local PostgreSQL', async t => {
  const db = new PGlite();
  t.after(() => db.close());
  // Minimal Supabase interfaces for SQL validation. These do NOT emulate Auth
  // or Storage HTTP services. scripts/verify-rls.mjs tests those on real Supabase.
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    create schema storage;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create function storage.foldername(text) returns text[] language sql immutable as
      $$ select (string_to_array($1, '/'))[1:array_length(string_to_array($1, '/'), 1)-1] $$;
    create table storage.buckets (
      id text primary key, name text, public boolean,
      file_size_limit bigint, allowed_mime_types text[]
    );
    create table storage.objects (id uuid default gen_random_uuid() primary key, bucket_id text, name text);
    alter table storage.objects enable row level security;
    grant usage on schema public, auth, storage to anon, authenticated;
    grant all on storage.objects to anon, authenticated;
    insert into auth.users values ('${A}'), ('${B}');
  `);
  await db.exec(await readFile(new URL('../supabase/migrations/202610050001_tracker.sql', import.meta.url), 'utf8'));

  async function as(user, sql, params = []) {
    await db.exec('begin');
    try {
      await db.exec(`set local role ${user ? 'authenticated' : 'anon'}`);
      await db.query("select set_config('request.jwt.claim.sub', $1, true)", [user ?? '']);
      const result = await db.query(sql, params);
      await db.exec('commit');
      return result;
    } catch (error) {
      await db.exec('rollback');
      throw error;
    }
  }
  async function denied(user, sql, params, code = '42501') {
    await assert.rejects(as(user, sql, params), error => error.code === code);
  }
  const mealInsert = `insert into public.meals(user_id, meal_type, notes, eaten_at, meal_date, photo_path)
    values ($1, 'breakfast', 'test meal', '2026-10-05T08:00:00+05:30', '2026-10-05', $2) returning *`;
  const sleepInsert = `insert into public.sleep_logs(user_id, sleep_date, slept_at, woke_at)
    values ($1, $2, $3, $4) returning *`;

  await t.test('private bucket accepts only compressed image formats under 200 KB', async () => {
    const { rows: [bucket] } = await db.query('select * from storage.buckets');
    assert.equal(bucket.public, false);
    assert.equal(Number(bucket.file_size_limit), 200000);
    assert.deepEqual(bucket.allowed_mime_types, ['image/webp', 'image/jpeg']);
  });

  await t.test('each identity creates, reads, edits and deletes only its own meals', async () => {
    const a = (await as(A, mealInsert, [A, `${A}/${PHOTO}`])).rows[0];
    const b = (await as(B, mealInsert, [B, `${B}/${PHOTO}`])).rows[0];
    for (const [user, own, other] of [[A, a, b], [B, b, a]]) {
      assert.deepEqual((await as(user, 'select id from meals')).rows, [{ id: own.id }]);
      assert.equal((await as(user, 'update meals set notes = $1 where id = $2 returning id', ['edited', own.id])).rows.length, 1);
      assert.equal((await as(user, 'update meals set notes = $1 where id = $2 returning id', ['attack', other.id])).rows.length, 0);
      assert.equal((await as(user, 'delete from meals where id = $1 returning id', [other.id])).rows.length, 0);
      await denied(user, mealInsert, [other.user_id, `${other.user_id}/${PHOTO}`]);
      await denied(user, 'update meals set user_id = $1, photo_path = $2 where id = $3', [other.user_id, `${other.user_id}/${PHOTO}`, own.id]);
      await denied(user, 'update meals set photo_path = $1 where id = $2', [`${other.user_id}/${PHOTO}`, own.id], '23514');
    }
    await denied(null, 'select * from meals', []);
    await denied(null, mealInsert, [A, `${A}/${PHOTO}`]);
    await denied(A, "update meals set meal_type = 'invalid'", [], '23514');
    await denied(A, "update meals set notes = repeat('x', 5001)", [], '23514');
    for (const user of [A, B]) assert.equal((await as(user, 'delete from meals returning id')).rows.length, 1);
  });

  await t.test('sleep is isolated and calculates overnight and DST durations', async () => {
    const args = ['2026-10-05', '2026-10-04T23:00:00+05:30', '2026-10-05T07:30:00+05:30'];
    const a = (await as(A, sleepInsert, [A, ...args])).rows[0];
    const b = (await as(B, sleepInsert, [B, ...args])).rows[0];
    assert.equal(Number(a.duration_minutes), 510);
    for (const [user, own, other] of [[A, a, b], [B, b, a]]) {
      assert.deepEqual((await as(user, 'select id from sleep_logs')).rows, [{ id: own.id }]);
      assert.equal((await as(user, 'update sleep_logs set woke_at = woke_at where id = $1 returning id', [own.id])).rows.length, 1);
      assert.equal((await as(user, 'update sleep_logs set woke_at = woke_at where id = $1 returning id', [other.id])).rows.length, 0);
      assert.equal((await as(user, 'delete from sleep_logs where id = $1 returning id', [other.id])).rows.length, 0);
      await denied(user, sleepInsert, [other.user_id, '2026-10-06', args[1], args[2]]);
      await denied(user, 'update sleep_logs set user_id = $1 where id = $2', [other.user_id, own.id]);
    }
    await denied(A, sleepInsert, [A, ...args], '23505');
    await denied(A, sleepInsert, [A, '2026-10-06', args[2], args[1]], '23514');
    await denied(A, sleepInsert, [A, '2026-10-06', args[1], args[1]], '23514');
    await denied(A, sleepInsert, [A, '2026-10-06', args[1], '2026-10-06T07:30:00+05:30'], '23514');
    await denied(null, 'select * from sleep_logs', []);
    const dst = (await as(A, sleepInsert, [A, '2026-11-01', '2026-10-31T23:00:00-04:00', '2026-11-01T07:00:00-05:00'])).rows[0];
    assert.equal(Number(dst.duration_minutes), 540);
    assert.equal((await as(A, 'delete from sleep_logs returning id')).rows.length, 2);
    assert.equal((await as(B, 'delete from sleep_logs returning id')).rows.length, 1);
  });

  await t.test('storage policies isolate reads, inserts, updates, moves and deletes', async () => {
    for (const user of [A, B]) await as(user, 'insert into storage.objects(bucket_id, name) values ($1, $2)', ['meal-photos', `${user}/${PHOTO}`]);
    for (const [user, other] of [[A, B], [B, A]]) {
      assert.deepEqual((await as(user, 'select name from storage.objects')).rows, [{ name: `${user}/${PHOTO}` }]);
      await denied(user, 'insert into storage.objects(bucket_id, name) values ($1, $2)', ['meal-photos', `${other}/${PHOTO}`]);
      await denied(user, 'insert into storage.objects(bucket_id, name) values ($1, $2)', ['other-bucket', `${user}/${PHOTO}`]);
      await denied(user, 'insert into storage.objects(bucket_id, name) values ($1, $2)', ['meal-photos', `${user}/file.html`]);
      await denied(user, 'update storage.objects set name = $1 where name = $2', [`${other}/${PHOTO}`, `${user}/${PHOTO}`]);
      assert.equal((await as(user, 'update storage.objects set name = name where name = $1 returning id', [`${other}/${PHOTO}`])).rows.length, 0);
      assert.equal((await as(user, 'delete from storage.objects where name = $1 returning id', [`${other}/${PHOTO}`])).rows.length, 0);
      assert.equal((await as(user, 'update storage.objects set name = name where name = $1 returning id', [`${user}/${PHOTO}`])).rows.length, 1);
    }
    assert.equal((await as(null, 'select * from storage.objects')).rows.length, 0);
    await denied(null, 'insert into storage.objects(bucket_id, name) values ($1, $2)', ['meal-photos', `${A}/${PHOTO}`]);
    for (const user of [A, B]) assert.equal((await as(user, 'delete from storage.objects returning id')).rows.length, 1);
  });
});
