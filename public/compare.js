import { groups } from './content.js';
import { icon } from './icons.js';
import { activeSpaces, spaceItems, optionCatalog, feeCatalog, toPyeong, homeProgress } from './home-model.js';

const moneyFormat = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 4 });

function amount(value) {
  return typeof value === 'number' && Number.isFinite(value) ? moneyFormat.format(value) + '만원' : '미입력';
}

function monthlyCost(home) {
  const rent = home.deal === '전세' ? 0 : home.rent;
  if (typeof rent !== 'number' || typeof home.fee !== 'number') return '미입력';
  return amount(rent + home.fee);
}

const present = value => value !== '' && value != null;
const number = value => Number(value).toLocaleString('ko-KR', { maximumFractionDigits: 2 });
const count = value => present(value) ? value + '개' : '미입력';
function area(home) {
  return present(home.areaSqm) ? home.areaType + ' ' + number(home.areaSqm) + '㎡ (약 ' + number(toPyeong(home.areaSqm)) + '평)' : '미입력';
}
function floor(home) {
  if (!home.floorKind && !present(home.floor) && !present(home.totalFloors)) return '미입력';
  return [home.floorKind, present(home.floor) ? home.floor + '층' : '', present(home.totalFloors) ? '전체 ' + home.totalFloors + '층' : ''].filter(Boolean).join(' · ');
}
function optionSummary(home) {
  return optionCatalog.map(option => {
    const state = home.optionStates[option.id];
    return option.label + ': ' + (state === 'included' ? '있음 · ' + ({ good: '상태 양호', bad: '상태 주의' }[home.optionChecks[option.id]] || '상태 미확인') : state === 'absent' ? '없음' : '미확인');
  }).join('\n');
}
function spacesSummary(home, kind) {
  const spaces = activeSpaces(home).filter(space => space.kind === kind);
  if (!spaces.length) return present(home[kind === 'room' ? 'roomCount' : 'bathroomCount']) ? '없음' : '개수 미입력';
  return spaces.map(space => {
    const checked = Object.keys(space.checks).length;
    const cautions = Object.values(space.checks).filter(value => value === 'bad').length;
    return [space.name, space.direction ? space.direction + '향' : '', checked + '/' + spaceItems(kind).length + ' 확인' + (cautions ? ' · 주의 ' + cautions : ''), space.notes].filter(Boolean).join(' · ');
  }).join('\n\n');
}
function checkSummary(group, home) {
  const counts = { good: 0, bad: 0, pending: 0 };
  for (const item of group.items) counts[home.checks[item.id] || 'pending']++;
  const summary = document.createElement('div');
  summary.className = 'cmp-counts';
  for (const [key, label] of [['good', '양호'], ['bad', '주의'], ['pending', '미확인']]) {
    const span = document.createElement('span');
    span.className = 'cmp-' + key;
    span.textContent = label + ' ' + counts[key];
    summary.append(span);
  }
  return summary;
}

function addRow(body, title, values) {
  const row = body.insertRow();
  const heading = document.createElement('th');
  heading.scope = 'row';
  heading.textContent = title;
  row.append(heading);
  for (const value of values) {
    const cell = row.insertCell();
    if (value instanceof Node) cell.append(value);
    else cell.textContent = value;
  }
}

export function openCompare(records) {
  if (records.length < 2) return;
  const opener = document.activeElement;
  const dialog = document.createElement('dialog');
  dialog.className = 'cmp-dialog';
  dialog.setAttribute('aria-labelledby', 'cmp-title');
  dialog.innerHTML = `<header class="cmp-header"><h2 id="cmp-title">집 비교</h2>
    <button type="button" class="cmp-close" aria-label="집 비교 닫기">${icon('x', 20)}</button></header>
    <div class="cmp-scroll"><table class="cmp-table" aria-label="두 집 비교">
      <colgroup><col class="cmp-label-col"><col><col></colgroup>
      <thead><tr><th scope="col">항목</th>
        <th scope="col"><label for="cmp-first">첫 번째 집</label><select id="cmp-first"></select></th>
        <th scope="col"><label for="cmp-second">두 번째 집</label><select id="cmp-second"></select></th>
      </tr></thead><tbody></tbody></table></div>`;
  const selects = [...dialog.querySelectorAll('select')];
  const body = dialog.querySelector('tbody');
  const close = dialog.querySelector('.cmp-close');
  const selected = [records[0], records[1]];
  for (const [side, select] of selects.entries()) {
    for (const record of records) {
      const name = record.nickname ? record.nickname + ' · ' + record.address : record.address;
      select.add(new Option(name, record.id));
    }
    select.value = selected[side].id;
    select.addEventListener('change', () => {
      const next = records.find(record => record.id === select.value);
      const other = 1 - side;
      if (next.id === selected[other].id) {
        selected[other] = selected[side];
        selects[other].value = selected[other].id;
      }
      selected[side] = next;
      render();
    });
  }

  function render() {
    body.replaceChildren();
    const row = (title, read) => addRow(body, title, selected.map(read));
    row('주소', home => home.address);
    row('계약 유형', home => home.deal);
    row('주택 유형', home => home.homeType || '미입력');
    row('방 / 화장실', home => count(home.roomCount) + ' / ' + count(home.bathroomCount));
    row('면적', area);
    row('방향', home => home.direction ? home.direction + '향 · ' + home.directionBasis + ' 기준' : '미입력');
    row('층수', floor);
    row('사용승인 연도', home => present(home.buildingYear) ? home.buildingYear + '년' : '미입력');
    row('엘리베이터', home => home.elevator || '미확인');
    row('주차', home => home.parking ? home.parking + (home.parking === '가능' ? ' · 월 ' + amount(home.parkingFee) : '') : '미확인');
    row('난방', home => home.heatType || '미확인');
    row('반려동물', home => home.pets || '미확인');
    row('입주 가능일', home => home.moveInDate || '미입력');
    row('보증금', home => amount(home.deposit));
    row('월세', home => home.deal === '전세' ? '해당 없음' : amount(home.rent));
    row('관리비', home => amount(home.fee));
    row('월세 + 관리비', monthlyCost);
    row('관리비 포함', home => feeCatalog.filter(item => home.feeIncludes.includes(item.id)).map(item => item.label).join(' · ') || '미확인');
    row('옵션', optionSummary);
    row('옵션 메모', home => home.optionNotes || '미작성');
    row('방별 점검', home => spacesSummary(home, 'room'));
    row('화장실별 점검', home => spacesSummary(home, 'bathroom'));
    row('전체 확인', home => { const progress = homeProgress(home); return progress.checked + ' / ' + progress.total; });
    row('강점', home => home.strengths || '미작성');
    row('아쉬운 점', home => home.concerns || '미작성');
    row('추가 메모', home => home.notes || '미작성');
    for (const group of groups) row(group.title, home => checkSummary(group, home));
  }

  render();
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    dialog.remove();
    if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true });
  }, { once: true });
  document.body.append(dialog);
  dialog.showModal();
  return dialog;
}
