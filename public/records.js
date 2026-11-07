import { groups } from './content.js';
import { icon } from './icons.js';
import { normalizeHome, activeSpaces, spaceItems, optionCatalog, feeCatalog, toSqm, toPyeong, homeProgress, homeSummary } from './home-model.js';

const storageKey = 'real-check.visits.v2';
const legacyStorageKey = 'real-check.visits.v1';
const items = groups.flatMap(group => group.items);
const checkIds = new Set(items.map(item => item.id));
const noteFields = ['strengths', 'concerns', 'notes'];
const noteLabels = { strengths: '강점', concerns: '아쉬운 점', notes: '추가 메모' };
const amountLabels = { deposit: '보증금', rent: '월세', fee: '관리비' };
const dateFormat = /^\d{4}-\d{2}-\d{2}$/;
const corruptNotice = '브라우저에 저장된 기록을 읽을 수 없습니다. 기존 기록을 보호하기 위해 저장을 멈췄습니다.';
let storageWarning = '';

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function localDate() {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0')].join('-');
}

function amount(value) {
  if (value == null || value === '' || typeof value === 'boolean') return '';
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : '';
}

function normalize(raw) {
  if (!raw || typeof raw.id !== 'string' || !raw.id ||
      typeof raw.address !== 'string' || !raw.address.trim()) throw new Error(corruptNotice);
  const fields = Object.fromEntries(['nickname', ...noteFields].map(key => [key,
    typeof raw[key] === 'string' ? raw[key] : '']));
  const checks = Object.fromEntries(Object.entries(raw.checks || {}).filter(([id, val]) =>
    checkIds.has(id) && (val === 'good' || val === 'bad')));
  return {
    id: raw.id, address: raw.address, deal: raw.deal === '전세' ? '전세' : '월세',
    deposit: amount(raw.deposit), rent: raw.deal === '전세' ? '' : amount(raw.rent),
    fee: amount(raw.fee), date: dateFormat.test(raw.date) ? raw.date : '',
    ...fields, checks, favorite: raw.favorite === true, ...normalizeHome(raw),
  };
}

function readRecords() {
  let raw;
  try {
    raw = localStorage.getItem(storageKey);
    if (raw === null) raw = localStorage.getItem(legacyStorageKey);
  } catch {
    storageWarning = '브라우저 저장 공간에 접근할 수 없습니다. 이 사이트의 저장 권한을 확인해 주세요.';
    throw new Error(storageWarning);
  }
  try {
    const values = raw === null ? [] : JSON.parse(raw);
    if (!Array.isArray(values)) throw new Error();
    const records = values.map(normalize);
    storageWarning = '';
    return records;
  } catch {
    storageWarning = corruptNotice;
    throw new Error(storageWarning);
  }
}

function writeRecords(records) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(records));
    storageWarning = '';
  } catch {
    storageWarning = '저장하지 못했습니다. 브라우저 저장 공간과 사이트 저장 권한을 확인해 주세요.';
    throw new Error(storageWarning);
  }
}

export function getRecordStorageWarning() {
  return storageWarning;
}

export function listRecords() {
  try {
    return readRecords().sort((a, b) => b.date.localeCompare(a.date));
  } catch {
    return [];
  }
}

function updateRecord(id, update) {
  const records = readRecords();
  const index = records.findIndex(record => record.id === id);
  if (index === -1) throw new Error('이 방문 기록이 삭제되었습니다.');
  const record = normalize(update(records[index]));
  records[index] = record;
  writeRecords(records);
  return record;
}

function newId() {
  return globalThis.crypto?.randomUUID?.() ||
    'r-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
}

const directions = ['', '남', '남동', '동', '북동', '북', '북서', '서', '남서'];
const formKeys = ['roomCount', 'bathroomCount', 'areaType', 'direction', 'directionBasis', 'homeType', 'floorKind', 'floor', 'totalFloors', 'elevator', 'parking', 'parkingFee', 'pets', 'moveInDate', 'heatType', 'buildingYear'];
const roundedInput = value => value === '' ? '' : String(Number(Number(value).toFixed(6)));
function selectField(key, label, value, options, blank = '미확인') {
  return `<label class="rc-field"><span>${label}</span><select name="${key}">${options.map(option => `<option value="${escapeHtml(option)}" ${value === option ? 'selected' : ''}>${escapeHtml(option || blank)}</option>`).join('')}</select></label>`;
}
function numberField(key, label, value, min, max, unit = '', step = '1') {
  return `<label class="rc-field"><span>${label}</span><span class="rc-unit"><input name="${key}" type="number" min="${min}" max="${max}" step="${step}" inputmode="${step === '1' ? 'numeric' : 'decimal'}" placeholder="미입력" value="${escapeHtml(value)}">${unit ? `<span aria-hidden="true">${unit}</span>` : ''}</span></label>`;
}
function moneyInput(key, value) {
  return `<div data-money="${key}">${numberField(key, amountLabels[key], value, 0, 999999999, '만원', '0.0001')}</div>`;
}

export function openRecordForm({ id, onSave, onDelete } = {}) {
  const original = id ? listRecords().find(record => record.id === id) : null;
  const values = original || { address: '', nickname: '', date: localDate(), deal: '월세', deposit: '', rent: '', fee: '', ...normalizeHome({}) };
  let canonicalArea = values.areaSqm;
  const dialog = document.createElement('dialog');
  dialog.className = 'rc-dialog';
  const titleId = 'rc-form-' + newId();
  dialog.setAttribute('aria-labelledby', titleId);
  dialog.innerHTML = `<form class="rc-form">
    <header class="rc-form-heading"><h2 id="${titleId}">${id ? '집 정보 수정' : '집 추가'}</h2>
      <button class="rc-icon-btn" type="button" data-close aria-label="닫기">${icon('x', 20)}</button></header>
    <div class="rc-fields">
      <label class="rc-field"><span>집 주소 <b aria-hidden="true">*</b></span>
        <input name="address" autocomplete="off" placeholder="도로명 또는 지번과 동·호수" required maxlength="180" value="${escapeHtml(values.address)}"></label>
      <div class="rc-form-pair">
        <label class="rc-field"><span>별칭</span><input name="nickname" placeholder="예: 역 앞 원룸" maxlength="60" value="${escapeHtml(values.nickname)}"></label>
        <label class="rc-field"><span>방문일</span><input type="date" name="date" required value="${escapeHtml(values.date || localDate())}"></label>
      </div>
      <fieldset class="rc-deal"><legend>계약 유형</legend><div class="rc-deal-options">${['월세', '전세'].map(deal => `<label><input type="radio" name="deal" value="${deal}" ${values.deal === deal ? 'checked' : ''}><span>${deal}</span></label>`).join('')}</div></fieldset>
      <div class="rc-money-inputs">${['deposit', 'rent', 'fee'].map(key => moneyInput(key, values[key])).join('')}</div>
      <details class="rc-form-section" open><summary>구조 · 면적 · 방향${icon('chevron-down', 17)}</summary><div class="rc-section-fields">
        ${selectField('homeType', '주택 유형', values.homeType, ['', '원룸', '다가구·단독', '다세대·연립', '오피스텔', '아파트', '기타'])}
        <div class="rc-form-pair">${numberField('roomCount', '방 수', values.roomCount, 0, 20, '개')}${numberField('bathroomCount', '화장실 수', values.bathroomCount, 0, 20, '개')}</div>
        <p class="rc-field-hint">원룸은 방 1개로 입력 · 저장하면 공간별 점검 생성</p>
        <p class="rc-field-hint rc-reduction-hint" data-reduction hidden>줄인 공간의 기록은 보관되며, 개수를 늘리면 다시 나타납니다.</p>
        ${selectField('areaType', '면적 기준', values.areaType, ['전용', '공급'])}
        <div class="rc-form-pair">${numberField('areaSqm', '면적 (㎡)', roundedInput(values.areaSqm), 0.000001, 100000, '㎡', 'any')}${numberField('areaPyeong', '면적 (평)', roundedInput(toPyeong(values.areaSqm)), 0.000001, 30250, '평', 'any')}</div>
        <p class="rc-field-hint">㎡ ↔ 평 자동 환산 · 1평 ≈ 3.3058㎡<br>전용: 집 내부 · 공급: 전용 + 주거 공용</p>
        <div class="rc-form-pair">${selectField('direction', '방향', values.direction, directions)}${selectField('directionBasis', '방향 기준', values.directionBasis, ['거실 창', '큰방 창', '주 출입문', '기타'])}</div>
      </div></details>
      <details class="rc-form-section"><summary>층수 · 건물 · 입주${icon('chevron-down', 17)}</summary><div class="rc-section-fields">
        ${selectField('floorKind', '층 구분', values.floorKind, ['', '지상', '반지하', '지하', '옥탑'])}
        <div class="rc-form-pair">${numberField('floor', '해당 층', values.floor, 1, 200, '층')}${numberField('totalFloors', '건물 지상 층수', values.totalFloors, 1, 200, '층')}</div>
        <div class="rc-form-pair">${numberField('buildingYear', '사용승인 연도', values.buildingYear, 1800, 2100, '년')}${selectField('elevator', '엘리베이터', values.elevator, ['', '있음', '없음'])}</div>
        <div class="rc-form-pair">${selectField('heatType', '난방', values.heatType, ['', '개별난방', '중앙난방', '지역난방'])}${selectField('pets', '반려동물', values.pets, ['', '가능', '불가'])}</div>
        <label class="rc-field"><span>입주 가능일</span><input type="date" name="moveInDate" value="${escapeHtml(values.moveInDate)}"></label>
      </div></details>
      <details class="rc-form-section"><summary>주차 · 관리비 포함 항목${icon('chevron-down', 17)}</summary><div class="rc-section-fields">
        <div class="rc-form-pair">${selectField('parking', '주차', values.parking, ['', '가능', '불가'])}${numberField('parkingFee', '월 주차비', values.parkingFee, 0, 999999999, '만원', '0.0001')}</div>
        <fieldset class="rc-fee-field"><legend>관리비에 포함된 항목</legend><div class="rc-choice-chips">${feeCatalog.map(item => `<label><input type="checkbox" name="feeIncludes" value="${item.id}" ${values.feeIncludes.includes(item.id) ? 'checked' : ''}><span>${item.label}</span></label>`).join('')}</div></fieldset>
        <p class="rc-field-hint">확인한 포함 항목만 선택 · 미선택은 미확인</p>
      </div></details>
    </div>
    <p class="rc-alert" role="alert" hidden></p>
    <footer class="rc-form-footer">${id ? '<button type="button" class="rc-delete-link" data-delete>기록 삭제</button>' : ''}
      <button class="btn btn-secondary" type="button" data-close>취소</button><button class="btn btn-primary" type="submit">저장</button></footer>
    <div class="rc-delete-confirm" hidden><strong>이 집의 체크리스트와 메모를 삭제할까요?</strong><p>삭제한 기록은 복구할 수 없습니다.</p>
      <div><button class="btn btn-secondary" type="button" data-keep>취소</button><button class="btn btn-primary" type="button" data-destroy>삭제</button></div></div></form>`;
  const form = dialog.querySelector('form');
  const fields = form.elements;
  const message = dialog.querySelector('.rc-alert');
  const footer = dialog.querySelector('.rc-form-footer');
  const confirm = dialog.querySelector('.rc-delete-confirm');
  const origin = document.activeElement;
  const showError = error => { message.textContent = error.message; message.hidden = false; message.scrollIntoView({ block: 'nearest' }); };
  function syncDeal() { const isLease = fields.deal.value === '전세'; fields.rent.disabled = isLease; dialog.querySelector('[data-money="rent"]').hidden = isLease; }
  syncDeal();
  form.addEventListener('change', event => { if (event.target.name === 'deal') syncDeal(); });
  form.addEventListener('invalid', event => { const section = event.target.closest('details'); if (section) section.open = true; }, true);
  form.addEventListener('input', event => {
    const field = event.target;
    if (field.name === 'areaSqm') { canonicalArea = field.value === '' ? '' : Number(field.value); fields.areaPyeong.value = roundedInput(toPyeong(canonicalArea)); }
    if (field.name === 'areaPyeong') { canonicalArea = toSqm(field.value); fields.areaSqm.value = roundedInput(canonicalArea); }
    if (field.name === 'roomCount' || field.name === 'bathroomCount') {
      const reduced = original && ['roomCount', 'bathroomCount'].some(key => Number(fields[key].value || 0) < Number(original[key] || 0));
      dialog.querySelector('[data-reduction]').hidden = !reduced;
    }
  });
  fields.address.addEventListener('input', () => fields.address.setCustomValidity(''));
  dialog.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => dialog.close()));
  form.querySelector('[data-delete]')?.addEventListener('click', () => { footer.hidden = true; confirm.hidden = false; confirm.querySelector('[data-keep]').focus(); });
  confirm.querySelector('[data-keep]').addEventListener('click', () => { footer.hidden = false; confirm.hidden = true; footer.querySelector('[data-delete]').focus(); });
  confirm.querySelector('[data-destroy]').addEventListener('click', () => {
    try { writeRecords(readRecords().filter(record => record.id !== id)); } catch (error) { showError(error); return; }
    dialog.close(); onDelete?.(id);
  });
  form.addEventListener('submit', event => {
    event.preventDefault(); if (!confirm.hidden) return;
    if (!fields.address.value.trim()) { fields.address.setCustomValidity('집 주소를 입력해 주세요.'); fields.address.reportValidity(); return; }
    const data = {
      address: fields.address.value.trim(), nickname: fields.nickname.value.trim(), deal: fields.deal.value, date: fields.date.value,
      deposit: amount(fields.deposit.value), rent: fields.rent.disabled ? '' : amount(fields.rent.value), fee: amount(fields.fee.value),
      ...Object.fromEntries(formKeys.map(key => [key, fields[key].value])), areaSqm: canonicalArea,
      feeIncludes: [...form.querySelectorAll('[name="feeIncludes"]:checked')].map(input => input.value),
    };
    let saved;
    try {
      if (id) saved = updateRecord(id, record => ({ ...record, ...data }));
      else { const records = readRecords(); saved = normalize({ ...data, id: newId() }); writeRecords([saved, ...records]); }
    } catch (error) { showError(error); return; }
    dialog.close(); onSave?.(saved);
  });
  dialog.addEventListener('close', () => { dialog.remove(); if (origin?.isConnected && (document.activeElement === document.body || !document.activeElement)) origin.focus({ preventScroll: true }); }, { once: true });
  document.body.append(dialog); dialog.showModal(); fields.address.focus({ preventScroll: true });
  if (id && !original) showError(new Error(storageWarning || '방문 기록을 찾을 수 없습니다.'));
  return dialog;
}

function formattedMoney(value) { return value === '' ? '미입력' : value.toLocaleString('ko-KR', { maximumFractionDigits: 4 }) + '만원'; }
function checkButton(item, state, value, extra = '') {
  const label = value === 'good' ? '양호' : '주의';
  return `<button type="button" class="rc-state rc-${value}" ${extra || `data-check="${escapeHtml(item.id)}"`} data-value="${value}" aria-label="${escapeHtml(item.title)} ${label}" aria-pressed="${state === value}"><span aria-hidden="true">${value === 'good' ? '✓' : '!'}</span>${label}</button>`;
}
function checklistRow(item, checks, extra = '') {
  return `<div class="rc-check-row"><div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.tip)}</p></div><div class="rc-check-actions" role="group" aria-label="${escapeHtml(item.title)}">${checkButton(item, checks[item.id], 'good', extra)}${checkButton(item, checks[item.id], 'bad', extra)}</div></div>`;
}
function checkGroups(checks) {
  return groups.map((group, index) => `<details class="rc-check-group" ${index === 0 ? 'open' : ''}><summary><span class="rc-group-icon">${icon(group.icon, 19)}</span><strong>${escapeHtml(group.title)}</strong><span class="rc-group-count" data-count="${escapeHtml(group.id)}"></span><span class="rc-chevron">${icon('chevron-down', 16)}</span></summary><div class="rc-check-list">${group.items.map(item => checklistRow(item, checks)).join('')}</div></details>`).join('');
}
function noteField(key, value) {
  return `<label class="rc-note-field"><span><i class="rc-note-dot rc-dot-${key}"></i>${noteLabels[key]}</span><textarea name="${key}" rows="3" maxlength="10000" placeholder="${{ strengths: '예: 오후에도 채광이 좋음', concerns: '예: 창문을 열면 차 소리가 큼', notes: '예: 입주 전 도배 일정 확인' }[key]}">${escapeHtml(value)}</textarea></label>`;
}
function spacesMarkup(record) {
  const spaces = activeSpaces(record);
  if (!spaces.length) return `<div class="rc-spaces-empty"><h3>공간별로 따로 확인하세요</h3><p>방과 화장실 개수를 입력하면 점검표가 생깁니다.</p><button class="btn btn-secondary" type="button" data-edit>방 · 화장실 수 입력</button></div>`;
  return `<div class="rc-space-intro"><span>방 ${record.roomCount === '' ? '미입력' : record.roomCount} · 화장실 ${record.bathroomCount === '' ? '미입력' : record.bathroomCount}</span><button type="button" class="rc-inline-edit" data-edit>개수 수정</button></div><div class="rc-groups">${spaces.map((space, index) => `<details class="rc-check-group rc-space" data-space="${space.id}" ${index === 0 ? 'open' : ''}><summary><span class="rc-group-icon">${icon(space.kind === 'room' ? 'house' : 'note', 19)}</span><strong data-space-title="${space.id}">${escapeHtml(space.name)}</strong><span class="rc-group-count" data-space-count="${space.id}"></span><span class="rc-chevron">${icon('chevron-down', 16)}</span></summary>
    <div class="rc-space-fields"><div class="rc-form-pair"><label class="rc-field"><span>공간 이름</span><input data-space-field="name" data-space-id="${space.id}" value="${escapeHtml(space.name)}" maxlength="60" placeholder="${space.kind === 'room' ? '예: 안방' : '예: 안방 화장실'}"></label>${space.kind === 'room' ? `<label class="rc-field"><span>창문 방향</span><select data-space-field="direction" data-space-id="${space.id}">${directions.map(d => `<option value="${d}" ${space.direction === d ? 'selected' : ''}>${d ? d + '향' : '미확인'}</option>`).join('')}</select></label>` : ''}</div></div>
    <div class="rc-check-list">${spaceItems(space.kind).map(item => checklistRow(item, space.checks, `data-space-check="${item.id}" data-space-id="${space.id}"`)).join('')}</div>
    <label class="rc-space-note rc-field"><span>이 공간 메모</span><textarea data-space-field="notes" data-space-id="${space.id}" rows="2" maxlength="10000" placeholder="치수, 수리할 곳 등">${escapeHtml(space.notes)}</textarea></label></details>`).join('')}</div>`;
}
function optionsMarkup(record) {
  return `<p class="rc-panel-hint">포함 여부를 표시하고, 포함된 옵션은 상태도 확인하세요.</p><div class="rc-option-list">${optionCatalog.map(option => `<div class="rc-option-row" data-option-row="${option.id}"><div class="rc-option-top"><h3>${option.label}</h3><div class="rc-option-segments" role="group" aria-label="${option.label} 포함 여부">${[['', '미확인'], ['included', '포함'], ['absent', '없음']].map(([state, label]) => `<button type="button" data-option-state="${state}" data-option-id="${option.id}" aria-pressed="${(record.optionStates[option.id] || '') === state}">${label}</button>`).join('')}</div></div><div class="rc-option-function" data-option-function="${option.id}" ${record.optionStates[option.id] === 'included' ? '' : 'hidden'}><span>상태</span><div class="rc-check-actions">${['good', 'bad'].map(value => checkButton({ id: option.id, title: option.label + ' 상태' }, record.optionChecks[option.id], value, `data-option-check="${option.id}"`)).join('')}</div></div></div>`).join('')}</div><label class="rc-note-field rc-option-note"><span>옵션 메모</span><textarea name="optionNotes" maxlength="10000" rows="3" placeholder="추가 옵션, 교체·수리 약속 등">${escapeHtml(record.optionNotes)}</textarea></label>`;
}

export function renderRecord(root, id, { onBack, onChange, onDeleted } = {}) {
  let record = listRecords().find(item => item.id === id);
  if (!record) {
    root.innerHTML = '<section class="rc-detail"><p class="rc-missing"></p><button class="btn btn-secondary" type="button">방문 기록으로</button></section>';
    root.querySelector('p').textContent = storageWarning || '방문 기록을 찾을 수 없습니다.'; root.querySelector('button').addEventListener('click', () => onBack?.()); return;
  }
  root.innerHTML = `<article class="rc-detail"><button class="rc-back" type="button" data-back>${icon('arrow-left', 17)} 방문 기록</button>
    <header class="rc-record-head"><div class="rc-record-title"><div class="rc-meta"><span class="rc-contract"></span><time></time></div><h1></h1><p class="rc-address" hidden></p></div><div class="rc-actions"><button type="button" data-favorite class="rc-icon-btn" aria-label="관심 집">${icon('heart', 19)}</button><button type="button" data-edit class="btn btn-secondary">${icon('edit', 16)} 수정</button></div></header>
    <dl class="rc-costs"></dl><div class="rc-home-facts"></div>
    <div class="rc-progress-head"><h2>전체 확인 항목</h2><span data-progress-text></span></div><progress class="rc-progress" aria-label="전체 확인 항목" max="1" value="0"></progress>
    <nav aria-label="방문 기록 보기" class="rc-tabs">${[['checklist', '공통 점검'], ['spaces', '공간별 점검'], ['options', '옵션'], ['notes', '메모']].map(([key, label], index) => `<button type="button" aria-pressed="${index === 0}" data-section="${key}">${label}</button>`).join('')}</nav>
    <div class="rc-status" role="status" aria-live="polite"></div>
    <section class="rc-checklist" data-panel="checklist" aria-label="집 공통 체크리스트"><div class="rc-groups">${checkGroups(record.checks)}</div></section>
    <section data-panel="spaces" aria-label="공간별 체크리스트" hidden>${spacesMarkup(record)}</section>
    <section data-panel="options" aria-label="옵션 확인" hidden>${optionsMarkup(record)}</section>
    <section class="rc-notes" data-panel="notes" aria-label="장단점과 메모" hidden>${noteFields.map(key => noteField(key, record[key])).join('')}</section>
    <div class="rc-save-state" role="status"></div></article>`;
  const scope = root.firstElementChild, status = scope.querySelector('.rc-status'), noteStatus = scope.querySelector('.rc-save-state');
  function updateHeader() {
    scope.querySelector('.rc-contract').textContent = record.deal;
    const time = scope.querySelector('time'); time.textContent = record.date ? record.date.replaceAll('-', '.') + ' 방문' : ''; time.dateTime = record.date;
    scope.querySelector('h1').textContent = record.nickname || record.address;
    const address = scope.querySelector('.rc-address'); address.hidden = !record.nickname; address.textContent = record.address;
    const favorite = scope.querySelector('[data-favorite]'); favorite.setAttribute('aria-pressed', String(record.favorite)); favorite.title = record.favorite ? '관심 집 해제' : '관심 집 표시';
    scope.querySelector('.rc-costs').innerHTML = (record.deal === '전세' ? ['deposit', 'fee'] : ['deposit', 'rent', 'fee']).map(key => `<div><dt>${amountLabels[key]}</dt><dd>${escapeHtml(formattedMoney(record[key]))}</dd></div>`).join('');
    const floorLabel = [record.floorKind, record.floor === '' ? '' : record.floor + '층', record.totalFloors === '' ? '' : '전체 ' + record.totalFloors + '층'].filter(Boolean).join(' / ');
    const extra = [['주택 유형', record.homeType], ['층수', floorLabel], ['사용승인', record.buildingYear === '' ? '' : record.buildingYear + '년'], ['엘리베이터', record.elevator], ['난방', record.heatType], ['주차', record.parking + (record.parking === '가능' && record.parkingFee !== '' ? ' · 월 ' + formattedMoney(record.parkingFee) : '')], ['반려동물', record.pets], ['입주 가능일', record.moveInDate], ['방향 기준', record.direction ? record.directionBasis : ''], ['관리비 포함', record.feeIncludes.map(id => feeCatalog.find(x => x.id === id)?.label).filter(Boolean).join(' · ')]].filter(([, value]) => value);
    scope.querySelector('.rc-home-facts').innerHTML = `<div class="rc-fact-chips">${homeSummary(record).map(value => `<span>${escapeHtml(value)}</span>`).join('')}</div>${extra.length ? `<details class="rc-extra-facts"><summary>집 정보${icon('chevron-down', 16)}</summary><dl>${extra.map(([key, value]) => `<div><dt>${key}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl></details>` : ''}`;
  }
  function updateCounts() {
    for (const group of groups) scope.querySelector(`[data-count="${group.id}"]`).textContent = group.items.filter(item => record.checks[item.id]).length + ' / ' + group.items.length;
    for (const space of activeSpaces(record)) {
      const el = scope.querySelector(`[data-space-count="${space.id}"]`); if (el) el.textContent = spaceItems(space.kind).filter(item => space.checks[item.id]).length + ' / ' + spaceItems(space.kind).length;
    }
    const progress = homeProgress(record); scope.querySelector('[data-progress-text]').textContent = progress.checked + ' / ' + progress.total; scope.querySelector('progress').max = progress.total || 1; scope.querySelector('progress').value = progress.checked;
  }
  function saveChange(change) {
    try { record = updateRecord(id, change); status.textContent = ''; noteStatus.textContent = '이 기기에 저장됨'; }
    catch (error) { status.textContent = error.message; noteStatus.textContent = '저장되지 않음'; return false; }
    onChange?.(record); return true;
  }
  function syncCheckButtons() {
    for (const button of scope.querySelectorAll('[data-check]')) button.setAttribute('aria-pressed', String(record.checks[button.dataset.check] === button.dataset.value));
    const spaces = new Map(activeSpaces(record).map(space => [space.id, space]));
    for (const button of scope.querySelectorAll('[data-space-check]')) button.setAttribute('aria-pressed', String(spaces.get(button.dataset.spaceId)?.checks[button.dataset.spaceCheck] === button.dataset.value));
    for (const button of scope.querySelectorAll('[data-option-check]')) button.setAttribute('aria-pressed', String(record.optionChecks[button.dataset.optionCheck] === button.dataset.value));
    updateCounts();
  }
  function updateSpace(spaceId, change) {
    return saveChange(current => { const space = activeSpaces(current).find(s => s.id === spaceId); if (!space) throw new Error('공간 개수가 변경되었습니다. 다시 열어 주세요.'); return { ...current, spaces: { ...current.spaces, [spaceId]: { ...space, ...change(space) } } }; });
  }
  function toggleValue(checks, key, value) { const next = { ...checks }; if (next[key] === value) delete next[key]; else next[key] = value; return next; }
  updateHeader(); updateCounts();
  scope.addEventListener('click', event => {
    const button = event.target.closest('button'); if (!button) return;
    if (button.hasAttribute('data-back')) onBack?.();
    else if (button.hasAttribute('data-favorite')) { if (saveChange(current => ({ ...current, favorite: !current.favorite }))) updateHeader(); }
    else if (button.hasAttribute('data-edit')) openRecordForm({ id, onSave(updated) { record = updated; updateHeader(); scope.querySelector('[data-panel="spaces"]').innerHTML = spacesMarkup(record); updateCounts(); onChange?.(record); }, onDelete(deletedId) { (onDeleted || onBack)?.(deletedId); } });
    else if (button.dataset.section) {
      for (const tab of scope.querySelectorAll('[data-section]')) tab.setAttribute('aria-pressed', String(tab === button));
      for (const panel of scope.querySelectorAll('[data-panel]')) panel.hidden = panel.dataset.panel !== button.dataset.section;
    } else if (button.dataset.check) {
      if (checkIds.has(button.dataset.check) && saveChange(current => ({ ...current, checks: toggleValue(current.checks, button.dataset.check, button.dataset.value) }))) syncCheckButtons();
    } else if (button.dataset.spaceCheck) {
      const space = activeSpaces(record).find(s => s.id === button.dataset.spaceId);
      if (space && spaceItems(space.kind).some(item => item.id === button.dataset.spaceCheck) && updateSpace(space.id, current => ({ checks: toggleValue(current.checks, button.dataset.spaceCheck, button.dataset.value) }))) syncCheckButtons();
    } else if (button.hasAttribute('data-option-state')) {
      const optionId = button.dataset.optionId;
      if (!optionCatalog.some(option => option.id === optionId)) return;
      if (saveChange(current => { const next = { ...current.optionStates }; if (button.dataset.optionState) next[optionId] = button.dataset.optionState; else delete next[optionId]; return { ...current, optionStates: next }; })) {
        for (const choice of scope.querySelectorAll(`[data-option-id="${optionId}"]`)) choice.setAttribute('aria-pressed', String((record.optionStates[optionId] || '') === choice.dataset.optionState));
        scope.querySelector(`[data-option-function="${optionId}"]`).hidden = record.optionStates[optionId] !== 'included'; syncCheckButtons();
      }
    } else if (button.dataset.optionCheck) {
      const optionId = button.dataset.optionCheck;
      if (record.optionStates[optionId] === 'included' && saveChange(current => ({ ...current, optionChecks: toggleValue(current.optionChecks, optionId, button.dataset.value) }))) syncCheckButtons();
    }
  });
  function saveField(event) {
    const field = event.target;
    if (field.dataset.spaceField) {
      const key = field.dataset.spaceField, spaceId = field.dataset.spaceId;
      if (!['name', 'notes', 'direction'].includes(key)) return;
      if (updateSpace(spaceId, () => ({ [key]: field.value })) && key === 'name') {
        scope.querySelector(`[data-space-title="${spaceId}"]`).textContent = activeSpaces(record).find(s => s.id === spaceId)?.name || '';
      }
    } else if ([...noteFields, 'optionNotes'].includes(field.name)) saveChange(current => ({ ...current, [field.name]: field.value }));
  }
  scope.addEventListener('input', event => { if (event.target.tagName !== 'SELECT') saveField(event); });
  scope.addEventListener('change', event => { if (event.target.tagName === 'SELECT') saveField(event); });
}
