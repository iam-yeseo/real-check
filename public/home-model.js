import { groups } from './content.js';

export const SQM_PER_PYEONG = 400 / 121;
export const directions = ['', '남', '남동', '동', '북동', '북', '북서', '서', '남서'];

function object(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}
function text(value) { return typeof value === 'string' ? value : ''; }
function number(value, minimum = 0, maximum = Infinity, integer = false) {
  if ((typeof value !== 'number' && typeof value !== 'string') || value === '' ||
      (typeof value === 'string' && !value.trim())) return '';
  const result = Number(value);
  if (!Number.isFinite(result) || result < minimum || result > maximum ||
      (integer && !Number.isInteger(result))) return '';
  return result;
}
function choice(value, choices, fallback = '') { return choices.includes(value) ? value : fallback; }
function positive(value) {
  const n = number(value);
  return n === '' || n <= 0 ? '' : n;
}
export function toPyeong(value) {
  const n = positive(value);
  return n === '' ? '' : n / SQM_PER_PYEONG;
}
export function toSqm(value) {
  const n = positive(value);
  if (n === '') return '';
  const result = n * SQM_PER_PYEONG;
  return Number.isFinite(result) ? result : '';
}

export const optionCatalog = [
  { id: 'aircon', label: '에어컨' },
  { id: 'fridge', label: '냉장고' },
  { id: 'washer', label: '세탁기' },
  { id: 'stove', label: '가스레인지·인덕션' },
  { id: 'hood', label: '주방 후드' },
  { id: 'microwave', label: '전자레인지' },
  { id: 'bed', label: '침대' },
  { id: 'desk', label: '책상' },
  { id: 'closet', label: '옷장' },
  { id: 'shoe-cabinet', label: '신발장' },
  { id: 'doorlock', label: '도어록' },
  { id: 'bidet', label: '비데' },
];
export const feeCatalog = [
  { id: 'water', label: '수도' },
  { id: 'electricity', label: '세대 전기' },
  { id: 'gas', label: '가스' },
  { id: 'internet', label: '인터넷' },
  { id: 'tv', label: 'TV' },
  { id: 'common-electric', label: '공용 전기' },
  { id: 'cleaning', label: '청소' },
  { id: 'elevator', label: '승강기' },
  { id: 'heating', label: '난방' },
];
const optionIds = new Set(optionCatalog.map(item => item.id));
const feeIds = new Set(feeCatalog.map(item => item.id));
const spaceDefinitions = {
  room: [
    { id: 'daylight', title: '채광과 창밖 시선', tip: '불을 끄고 빛이 드는 범위를 보세요. 창 앞 건물과 맞은편 시선도 확인하세요.' },
    { id: 'noise', title: '소음', tip: '창문을 열고 닫아 보고, 옆방과 복도에서 들리는 소리도 확인하세요.' },
    { id: 'ventilation', title: '환기와 창문', tip: '창문을 직접 열어 바람이 통하는지, 잠금쇠와 방충망이 멀쩡한지 보세요.' },
    { id: 'damp', title: '누수와 곰팡이', tip: '천장·창틀·가구 뒤의 물자국, 들뜬 벽지와 곰팡이 냄새를 살펴보세요.' },
    { id: 'layout', title: '가구 배치와 수납', tip: '침대와 책상 자리를 재고 문을 열 공간, 붙박이장 깊이를 확인하세요.' },
    { id: 'power', title: '전기와 냉난방', tip: '조명과 콘센트 위치를 보고, 이 방의 난방과 에어컨 작동 여부를 확인하세요.' },
  ],
  bathroom: [
    { id: 'water', title: '수압과 온수', tip: '샤워기와 세면대를 같이 틀어 수압과 온수 유지 시간을 확인하세요.' },
    { id: 'drain', title: '배수와 하수구 냄새', tip: '바닥에 물을 흘려 고이는 곳이 있는지 보고 하수구 냄새를 확인하세요.' },
    { id: 'ventilation', title: '환기', tip: '환풍기를 켜 보고 창문이 있으면 직접 열어 보세요.' },
    { id: 'damp', title: '곰팡이와 누수', tip: '천장·실리콘·타일 줄눈과 세면대 아래 배관의 물자국을 살펴보세요.' },
    { id: 'toilet', title: '변기', tip: '물을 내려 보고 물이 계속 새거나 변기가 흔들리지 않는지 확인하세요.' },
    { id: 'fixtures', title: '수전과 문', tip: '수도꼭지·샤워기·문 잠금쇠를 써 보고 타일 균열과 미끄럼도 확인하세요.' },
  ],
};

export function spaceItems(kind) { return spaceDefinitions[kind] || []; }

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
  const timestamp = Date.parse(value + 'T00:00:00Z');
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value ? value : '';
}
function checkMap(value, ids) {
  return Object.fromEntries(Object.entries(object(value)).filter(([key, state]) =>
    ids.has(key) && (state === 'good' || state === 'bad')));
}
function normalizedSpaces(value) {
  const entries = [];
  for (const [id, raw] of Object.entries(object(value))) {
    const match = /^(room|bathroom)-([1-9]|1\d|20)$/.exec(id);
    if (!match) continue;
    const source = object(raw);
    const ids = new Set(spaceItems(match[1]).map(item => item.id));
    entries.push([id, {
      name: text(source.name), notes: text(source.notes),
      direction: choice(source.direction, directions),
      checks: checkMap(source.checks, ids),
    }]);
  }
  return Object.fromEntries(entries);
}

// Preserve stored space IDs even when the visible count shrinks. Re-expanding
// restores the same room's notes and checks instead of reassigning another room.
export function normalizeHome(input = {}) {
  const raw = object(input);
  const optionStates = Object.fromEntries(Object.entries(object(raw.optionStates)).filter(([id, state]) =>
    optionIds.has(id) && (state === 'included' || state === 'absent')));
  const includedIds = new Set(Object.keys(optionStates).filter(id => optionStates[id] === 'included'));
  return {
    roomCount: number(raw.roomCount, 0, 20, true),
    bathroomCount: number(raw.bathroomCount, 0, 20, true),
    areaSqm: number(raw.areaSqm, Number.MIN_VALUE, 100000),
    areaType: choice(raw.areaType, ['전용', '공급'], '전용'),
    direction: choice(raw.direction, directions),
    directionBasis: choice(raw.directionBasis, ['거실 창', '큰방 창', '주 출입문', '기타'], '거실 창'),
    homeType: choice(raw.homeType, ['', '원룸', '다가구·단독', '다세대·연립', '오피스텔', '아파트', '기타']),
    floorKind: choice(raw.floorKind, ['', '지상', '반지하', '지하', '옥탑']),
    floor: number(raw.floor, 1, 200, true),
    totalFloors: number(raw.totalFloors, 1, 200, true),
    elevator: choice(raw.elevator, ['', '있음', '없음']),
    parking: choice(raw.parking, ['', '가능', '불가']),
    parkingFee: number(raw.parkingFee),
    pets: choice(raw.pets, ['', '가능', '불가']),
    moveInDate: validDate(raw.moveInDate),
    heatType: choice(raw.heatType, ['', '개별난방', '중앙난방', '지역난방']),
    buildingYear: number(raw.buildingYear, 1800, 2100, true),
    optionStates,
    optionChecks: checkMap(raw.optionChecks, includedIds),
    optionNotes: text(raw.optionNotes),
    feeIncludes: [...new Set((Array.isArray(raw.feeIncludes) ? raw.feeIncludes : []).filter(id => feeIds.has(id)))],
    spaces: normalizedSpaces(raw.spaces),
  };
}

export function activeSpaces(record = {}) {
  const home = normalizeHome(record);
  const result = [];
  for (const [kind, count] of [['room', home.roomCount], ['bathroom', home.bathroomCount]]) {
    for (let index = 1; index <= (count || 0); index++) {
      const id = kind + '-' + index;
      const space = home.spaces[id] || { name: '', notes: '', direction: '', checks: {} };
      result.push({ ...space, id, kind, name: space.name.trim() || (kind === 'room' ? '방 ' : '화장실 ') + index });
    }
  }
  return result;
}

export function homeProgress(record = {}) {
  const ids = new Set(groups.flatMap(group => group.items.map(item => item.id)));
  let checked = Object.keys(checkMap(record.checks, ids)).length;
  let total = ids.size;
  for (const space of activeSpaces(record)) {
    checked += Object.keys(space.checks).length;
    total += spaceItems(space.kind).length;
  }
  const home = normalizeHome(record);
  total += Object.values(home.optionStates).filter(state => state === 'included').length;
  checked += Object.keys(home.optionChecks).length;
  return { checked, total };
}

const compactNumber = value => value.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
export function homeSummary(record = {}) {
  const home = normalizeHome(record);
  return [
    home.roomCount === '' ? '' : '방 ' + home.roomCount,
    home.bathroomCount === '' ? '' : '욕실 ' + home.bathroomCount,
    home.areaSqm === '' ? '' : home.areaType + ' ' + compactNumber(home.areaSqm) + '㎡ (약 ' + compactNumber(toPyeong(home.areaSqm)) + '평)',
    home.direction ? home.direction + '향' : '',
  ].filter(Boolean);
}
