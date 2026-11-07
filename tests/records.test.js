import test from 'node:test';
import assert from 'node:assert/strict';
import { listRecords, getRecordStorageWarning } from '../public/records.js';
import { groups } from '../public/content.js';

const key = 'real-check.visits.v1';

function useBrowserStorage(t) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const entries = new Map();
  const storage = {
    getItem(name) { return entries.get(name) ?? null; },
    setItem(name, value) { entries.set(name, String(value)); },
    removeItem(name) { entries.delete(name); },
    clear() { entries.clear(); },
  };
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete globalThis.localStorage;
  });
  return storage;
}

test('방문일 순으로 읽고 같은 날에는 추가 순서와 집별 기록을 유지한다', t => {
  const storage = useBrowserStorage(t);
  storage.setItem(key, JSON.stringify([
    { id: 'c', address: 'C동', date: '2026-11-01' },
    { id: 'b', address: 'B동', date: '2026-11-07', checks: { daylight: 'bad' }, concerns: '채광' },
    { id: 'a', address: 'A동', date: '2026-11-07', checks: { daylight: 'good' }, strengths: '채광' },
  ]));
  const visits = listRecords();
  assert.deepEqual(visits.map(visit => visit.id), ['b', 'a', 'c']);
  assert.deepEqual(visits.map(visit => visit.strengths), ['', '채광', '']);
  visits[0].checks.daylight = 'good';
  assert.equal(listRecords()[0].checks.daylight, 'bad');
  assert.equal(listRecords()[1].checks.daylight, 'good');
});

test('미입력 금액과 0원을 구별하고 전세에는 월세를 표시하지 않는다', t => {
  const storage = useBrowserStorage(t);
  storage.setItem(key, JSON.stringify([
    { id: 'a', address: 'A동', rent: '52.5', fee: 0 },
    { id: 'b', address: 'B동', deal: '전세', deposit: 12000, rent: 40, fee: '' },
  ]));
  const [monthly, lease] = listRecords();
  assert.deepEqual([monthly.deposit, monthly.rent, monthly.fee], ['', 52.5, 0]);
  assert.deepEqual([lease.deposit, lease.rent, lease.fee], [12000, '', '']);
});

test('손상된 데이터의 오류를 알리고 원래 저장값을 그대로 보존한다', t => {
  const storage = useBrowserStorage(t);
  for (const damaged of ['{', '{}', '[{"id":"a","address":"A동"},{"address":"B동"}]']) {
    storage.setItem(key, damaged);
    assert.deepEqual(listRecords(), []);
    assert.ok(getRecordStorageWarning());
    assert.equal(storage.getItem(key), damaged);
  }
  storage.removeItem(key);
  assert.deepEqual(listRecords(), []);
  assert.equal(getRecordStorageWarning(), '');
});

test('브라우저가 저장소 접근을 거부해도 경고와 빈 기록 목록을 반환한다', t => {
  const storage = useBrowserStorage(t);
  storage.getItem = () => { throw new Error('Storage access denied'); };
  assert.deepEqual(listRecords(), []);
  assert.ok(getRecordStorageWarning());
});

test('체크 항목은 집마다 한 항목에 하나의 유효한 결과만 갖는다', t => {
  const storage = useBrowserStorage(t);
  const ids = groups.flatMap(group => group.items.map(item => item.id));
  assert.equal(new Set(ids).size, ids.length, '중복 ID에 체크하면 다른 항목의 결과도 바뀝니다.');
  storage.setItem(key, JSON.stringify([
    { id: 'a', address: 'A동', checks: { daylight: 'good', unknown: 'good', damp: 'pending' } },
  ]));
  assert.deepEqual(listRecords()[0].checks, { daylight: 'good' });
});
