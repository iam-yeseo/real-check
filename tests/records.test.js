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

const v2Key = 'real-check.visits.v2';

test('v2 저장소가 있으면 v1 기록과 섞지 않고 v2를 우선한다', t => {
  const storage = useBrowserStorage(t);
  const legacy = JSON.stringify([{ id: 'legacy', address: '이전 집', strengths: '이전 메모' }]);
  storage.setItem(key, legacy);
  storage.setItem(v2Key, JSON.stringify([{ id: 'current', address: '새 집', roomCount: 2, strengths: '새 메모' }]));
  assert.deepEqual(listRecords().map(record => record.id), ['current']);
  assert.equal(listRecords()[0].roomCount, 2);
  assert.equal(storage.getItem(key), legacy, '이전 버전 원본은 변경하지 않는다');
});

test('v2에서 모든 집을 삭제한 경우 v1의 집이 다시 나타나지 않는다', t => {
  const storage = useBrowserStorage(t);
  storage.setItem(key, JSON.stringify([{ id: 'deleted', address: '이미 지운 집' }]));
  storage.setItem(v2Key, '[]');
  assert.deepEqual(listRecords(), []);
  assert.equal(getRecordStorageWarning(), '');
  assert.equal(storage.getItem(v2Key), '[]');
});

test('손상된 v2를 읽으면 v1으로 되돌리지 않고 오류와 원본을 보존한다', t => {
  const storage = useBrowserStorage(t);
  storage.setItem(key, JSON.stringify([{ id: 'old', address: '이전 버전의 집' }]));
  for (const damaged of ['', '{', 'null', '{}', '[{"id":"a","address":"A동"},{"id":"broken"}]']) {
    storage.setItem(v2Key, damaged);
    assert.deepEqual(listRecords(), []);
    assert.ok(getRecordStorageWarning());
    assert.equal(storage.getItem(v2Key), damaged);
  }
  storage.setItem(v2Key, '[]');
  assert.deepEqual(listRecords(), []);
  assert.equal(getRecordStorageWarning(), '', '복구 후 이전 오류를 유지하지 않는다');
});

test('확장된 집 조건과 옵션·공간 메모를 모두 다시 읽는다', t => {
  const storage = useBrowserStorage(t);
  const details = {
    roomCount: 2, bathroomCount: 1, areaSqm: 33.057851239669425, areaType: '전용',
    direction: '남동', directionBasis: '큰방 창', homeType: '다세대·연립',
    floorKind: '지상', floor: 3, totalFloors: 5, elevator: '없음',
    parking: '가능', parkingFee: 0, pets: '불가', heatType: '개별난방',
    buildingYear: 2018, moveInDate: '2026-12-01',
    feeIncludes: ['water', 'internet'],
    optionStates: { aircon: 'included', washer: 'included', bed: 'absent' },
    optionChecks: { aircon: 'good', washer: 'bad' }, optionNotes: '세탁기 수리 일정 확인',
    spaces: {
      'room-1': { name: '안방', notes: '오후에 밝음', direction: '남', checks: { daylight: 'good' } },
      'room-2': { name: '작은방', notes: '창틀 물자국', direction: '북', checks: { damp: 'bad' } },
      'bathroom-1': { name: '욕실', notes: '환풍기 점검', direction: '', checks: { water: 'good', ventilation: 'bad' } },
    },
  };
  storage.setItem(v2Key, JSON.stringify([{ id: 'home', address: '집 주소', ...details }]));
  const record = listRecords()[0];
  for (const [field, expected] of Object.entries(details)) assert.deepEqual(record[field], expected, field);
});

test('같은 공간 ID를 사용해도 두 집의 체크·메모는 독립적이다', t => {
  const storage = useBrowserStorage(t);
  storage.setItem(v2Key, JSON.stringify([
    { id: 'a', address: 'A동', roomCount: 1, spaces: { 'room-1': { name: '첫째 안방', notes: '밝음', checks: { daylight: 'good' } }, 'room-2': { notes: '개수를 줄인 방 메모', checks: { damp: 'bad' } } } },
    { id: 'b', address: 'B동', roomCount: 1, spaces: { 'room-1': { name: '둘째 안방', notes: '어두움', checks: { daylight: 'bad' } } } },
  ]));
  const records = listRecords();
  assert.equal(records[0].spaces['room-1'].checks.daylight, 'good');
  assert.equal(records[1].spaces['room-1'].checks.daylight, 'bad');
  assert.equal(records[0].spaces['room-2'].notes, '개수를 줄인 방 메모');
  records[0].spaces['room-1'].notes = '변경';
  records[0].spaces['room-1'].checks.daylight = 'bad';
  assert.equal(listRecords()[0].spaces['room-1'].notes, '밝음');
  assert.equal(listRecords()[0].spaces['room-1'].checks.daylight, 'good');
  assert.equal(listRecords()[1].spaces['room-1'].notes, '어두움');
});

test('정규화한 기록을 반복 저장해도 정확한 면적과 공간 기록이 바뀌지 않는다', t => {
  const storage = useBrowserStorage(t);
  const exactSqm = 10.555 * (400 / 121);
  storage.setItem(v2Key, JSON.stringify([{ id: 'precise', address: '면적 테스트', areaSqm: exactSqm, roomCount: 1, bathroomCount: 0,
    spaces: { 'room-1': { name: '방 1', notes: '메모', checks: { daylight: 'good' } } },
  }]));
  const first = listRecords();
  for (let i = 0; i < 5; i++) {
    storage.setItem(v2Key, JSON.stringify(listRecords()));
    assert.deepEqual(listRecords(), first);
    assert.equal(listRecords()[0].areaSqm, exactSqm);
  }
});
