import test from 'node:test';
import assert from 'node:assert/strict';
import { groups } from '../public/content.js';
import {
  SQM_PER_PYEONG, toPyeong, toSqm, normalizeHome,
  activeSpaces, spaceItems, homeProgress, homeSummary,
} from '../public/home-model.js';

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10, actual + ' ≈ ' + expected);

test('㎡와 평은 중간 반올림 없이 변환하며 미입력·잘못된 값은 비워 둔다', () => {
  close(SQM_PER_PYEONG, 400 / 121);
  close(toPyeong(33.057851239669425), 10);
  for (const sqm of [1, 18.6, 33.057851239669425, 84.96, 1000]) close(toSqm(toPyeong(sqm)), sqm);
  for (const input of ['', ' ', null, undefined, false, [], {}, NaN, Infinity, -1, 0, 'no']) {
    assert.equal(toSqm(input), '');
    assert.equal(toPyeong(input), '');
  }
});

test('이전 방문 기록에 임의의 방 개수나 면적을 만들지 않는다', () => {
  const old = { id: 'legacy', address: '역 앞', checks: { daylight: 'good' }, strengths: '조용함' };
  const extra = normalizeHome(old);
  assert.equal(extra.roomCount, '');
  assert.equal(extra.bathroomCount, '');
  assert.equal(extra.areaSqm, '');
  assert.deepEqual(activeSpaces(old), []);
  assert.deepEqual(homeSummary(old), []);
  assert.deepEqual({ ...old, ...extra }.checks, { daylight: 'good' });
  assert.equal({ ...old, ...extra }.strengths, '조용함');
  assert.equal(homeProgress(old).checked, 1);
});

test('방 개수를 줄였다 늘려도 같은 방의 체크와 메모가 복원된다', () => {
  const initial = normalizeHome({
    roomCount: 2, bathroomCount: 1,
    spaces: {
      'room-1': { name: '작은방', notes: '옷방', checks: { daylight: 'bad' } },
      'room-2': { name: '안방', notes: '창틀 확인', direction: '남동', checks: { daylight: 'good', damp: 'bad' } },
      'bathroom-1': { notes: '냄새 없음', checks: { water: 'good' } },
    },
  });
  const reduced = normalizeHome({ ...initial, roomCount: 1 });
  assert.deepEqual(activeSpaces(reduced).map(space => space.id), ['room-1', 'bathroom-1']);
  assert.deepEqual(reduced.spaces['room-2'], initial.spaces['room-2']);
  const restored = normalizeHome({ ...reduced, roomCount: 2 });
  const second = activeSpaces(restored)[1];
  assert.equal(second.name, '안방');
  assert.equal(second.notes, '창틀 확인');
  assert.equal(second.direction, '남동');
  assert.deepEqual(second.checks, { daylight: 'good', damp: 'bad' });
  second.checks.daylight = 'bad';
  assert.equal(restored.spaces['room-2'].checks.daylight, 'good', '읽은 공간을 바꿔도 원본 기록은 변경되지 않는다');
});

test('방과 욕실의 체크는 분리되고 없는 공간·잘못된 체크 ID는 적용되지 않는다', () => {
  const home = normalizeHome({ roomCount: '2', bathroomCount: '1', spaces: {
    'room-1': { checks: { daylight: 'good', water: 'bad' } },
    'room-2': { checks: { daylight: 'bad' } },
    'bathroom-1': { checks: { water: 'good', daylight: 'good', drain: 'pending' } },
    'room-21': { checks: { daylight: 'good' } },
    constructor: { checks: { daylight: 'good' } },
  } });
  assert.deepEqual(activeSpaces(home).map(space => space.checks), [{ daylight: 'good' }, { daylight: 'bad' }, { water: 'good' }]);
  assert.equal(home.spaces['room-21'], undefined);
  assert.equal(Object.hasOwn(home.spaces, 'constructor'), false);
  assert.equal(activeSpaces(home)[2].name, '화장실 1');
});

test('진행률은 공통 항목·현재 공간·포함 옵션만 집계한다', () => {
  const home = {
    ...normalizeHome({ roomCount: 1, bathroomCount: 1,
      spaces: {
        'room-1': { checks: { daylight: 'good' } },
        'room-2': { checks: { daylight: 'bad', damp: 'bad' } },
        'bathroom-1': { checks: { water: 'good', drain: 'bad' } },
      },
      optionStates: { aircon: 'included', fridge: 'included', washer: 'absent', unknown: 'included' },
      optionChecks: { aircon: 'good', washer: 'bad', unknown: 'good' },
    }),
    checks: { daylight: 'good', fake: 'good', damp: 'pending' },
  };
  assert.deepEqual(home.optionChecks, { aircon: 'good' });
  assert.deepEqual(homeProgress(home), {
    checked: 5,
    total: groups.flatMap(group => group.items).length + spaceItems('room').length + spaceItems('bathroom').length + 2,
  });
});

test('집 조건의 미확인·0원·실제 날짜를 구분한다', () => {
  const good = normalizeHome({ roomCount: 0, bathroomCount: 0, parkingFee: 0, direction: '남동', areaSqm: '33', moveInDate: '2028-02-29', feeIncludes: ['water', 'water', 'internet', 'fake'] });
  assert.equal(good.roomCount, 0);
  assert.equal(good.parkingFee, 0);
  assert.equal(good.moveInDate, '2028-02-29');
  assert.deepEqual(good.feeIncludes, ['water', 'internet']);
  assert.ok(homeSummary(good).includes('남동향'));
  const bad = normalizeHome({ roomCount: 21, bathroomCount: 1.2, areaSqm: -10, floor: 0, buildingYear: 9999, parkingFee: -2, direction: '남남', moveInDate: '2027-02-29' });
  for (const key of ['roomCount', 'bathroomCount', 'areaSqm', 'floor', 'buildingYear', 'parkingFee', 'direction', 'moveInDate']) assert.equal(bad[key], '');
});
