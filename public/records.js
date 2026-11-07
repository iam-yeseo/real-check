import { groups } from './content.js';
import { icon } from './icons.js';

const storageKey = 'real-check.visits.v1';
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
    ...fields, checks, favorite: raw.favorite === true,
  };
}

function readRecords() {
  let raw;
  try {
    raw = localStorage.getItem(storageKey);
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

function moneyInput(key, value) {
  return `<label class="rc-field" data-money="${key}"><span>${amountLabels[key]}</span>
    <span class="rc-unit"><input name="${key}" type="number" min="0" max="999999999" step="0.0001"
    inputmode="decimal" placeholder="금액" value="${escapeHtml(value)}"><span aria-hidden="true">만원</span></span>
    <small class="rc-sr-only">단위 만원</small></label>`;
}

export function openRecordForm({ id, onSave, onDelete } = {}) {
  const original = id ? listRecords().find(record => record.id === id) : null;
  const values = original || { address: '', nickname: '', date: localDate(), deal: '월세',
    deposit: '', rent: '', fee: '' };
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
      <fieldset class="rc-deal"><legend>계약 유형</legend>
        <div class="rc-deal-options">${['월세', '전세'].map(deal => `<label><input type="radio" name="deal" value="${deal}" ${values.deal === deal ? 'checked' : ''}><span>${deal}</span></label>`).join('')}</div>
      </fieldset>
      <div class="rc-money-inputs">${['deposit', 'rent', 'fee'].map(key => moneyInput(key, values[key])).join('')}</div>
    </div>
    <p class="rc-alert" role="alert" hidden></p>
    <footer class="rc-form-footer">${id ? '<button type="button" class="rc-delete-link" data-delete>기록 삭제</button>' : ''}
      <button class="btn btn-secondary" type="button" data-close>취소</button>
      <button class="btn btn-primary" type="submit">저장</button>
    </footer>
    <div class="rc-delete-confirm" hidden>
      <strong>이 집의 체크리스트와 메모를 삭제할까요?</strong><p>삭제한 기록은 복구할 수 없습니다.</p>
      <div><button class="btn btn-secondary" type="button" data-keep>취소</button>
        <button class="btn btn-primary" type="button" data-destroy>삭제</button></div>
    </div></form>`;
  const form = dialog.querySelector('form');
  const fields = form.elements;
  const message = dialog.querySelector('.rc-alert');
  const footer = dialog.querySelector('.rc-form-footer');
  const confirm = dialog.querySelector('.rc-delete-confirm');
  const origin = document.activeElement;
  const showError = error => {
    message.textContent = error.message;
    message.hidden = false;
  };
  function syncDeal() {
    const isLease = fields.deal.value === '전세';
    fields.rent.disabled = isLease;
    dialog.querySelector('[data-money="rent"]').hidden = isLease;
  }
  syncDeal();
  form.addEventListener('change', event => {
    if (event.target.name === 'deal') syncDeal();
  });
  fields.address.addEventListener('input', () => fields.address.setCustomValidity(''));
  dialog.querySelectorAll('[data-close]').forEach(button =>
    button.addEventListener('click', () => dialog.close()));
  form.querySelector('[data-delete]')?.addEventListener('click', () => {
    footer.hidden = true;
    confirm.hidden = false;
    confirm.querySelector('[data-keep]').focus();
  });
  confirm.querySelector('[data-keep]').addEventListener('click', () => {
    footer.hidden = false;
    confirm.hidden = true;
    footer.querySelector('[data-delete]').focus();
  });
  confirm.querySelector('[data-destroy]').addEventListener('click', () => {
    try {
      const records = readRecords();
      writeRecords(records.filter(record => record.id !== id));
    } catch (error) {
      showError(error);
      return;
    }
    dialog.close();
    onDelete?.(id);
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!confirm.hidden) return;
    if (!fields.address.value.trim()) {
      fields.address.setCustomValidity('집 주소를 입력해 주세요.');
      fields.address.reportValidity();
      return;
    }
    const data = {
      address: fields.address.value.trim(), nickname: fields.nickname.value.trim(),
      deal: fields.deal.value, date: fields.date.value, deposit: amount(fields.deposit.value),
      rent: fields.rent.disabled ? '' : amount(fields.rent.value), fee: amount(fields.fee.value),
    };
    let saved;
    try {
      if (id) {
        saved = updateRecord(id, record => ({ ...record, ...data }));
      } else {
        const records = readRecords();
        saved = normalize({ ...data, id: newId() });
        writeRecords([saved, ...records]);
      }
    } catch (error) {
      showError(error);
      return;
    }
    dialog.close();
    onSave?.(saved);
  });
  dialog.addEventListener('close', () => {
    dialog.remove();
    if (origin?.isConnected && (document.activeElement === document.body || !document.activeElement)) {
      origin.focus({ preventScroll: true });
    }
  }, { once: true });
  document.body.append(dialog);
  dialog.showModal();
  fields.address.focus({ preventScroll: true });
  if (id && !original) showError(new Error(storageWarning || '방문 기록을 찾을 수 없습니다.'));
  return dialog;
}

function formattedMoney(value) {
  return value === '' ? '미입력' : value.toLocaleString('ko-KR', { maximumFractionDigits: 4 }) + '만원';
}

function checkButton(item, state, value) {
  const label = value === 'good' ? '양호' : '주의';
  return `<button type="button" class="rc-state rc-${value}" data-check="${escapeHtml(item.id)}" data-value="${value}" aria-label="${escapeHtml(item.title)} ${label}"
    aria-pressed="${state === value}"><span aria-hidden="true">${value === 'good' ? '✓' : '!'}</span>${label}</button>`;
}

function checkGroups(checks) {
  return groups.map((group, index) => `<details class="rc-check-group" ${index === 0 ? 'open' : ''}>
    <summary><span class="rc-group-icon">${icon(group.icon, 19)}</span><strong>${escapeHtml(group.title)}</strong>
      <span class="rc-group-count" data-count="${escapeHtml(group.id)}"></span><span class="rc-chevron">${icon('chevron-down', 16)}</span></summary>
    <div class="rc-check-list">${group.items.map(item => `<div class="rc-check-row">
      <div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.tip)}</p></div>
      <div class="rc-check-actions" role="group" aria-label="${escapeHtml(item.title)}">${checkButton(item, checks[item.id], 'good')}${checkButton(item, checks[item.id], 'bad')}</div>
    </div>`).join('')}</div></details>`).join('');
}

function noteField(key, value) {
  return `<label class="rc-note-field"><span><i class="rc-note-dot rc-dot-${key}"></i>${noteLabels[key]}</span>
    <textarea name="${key}" rows="3" maxlength="10000" placeholder="${{ strengths: '예: 오후에도 채광이 좋음', concerns: '예: 창문을 열면 차 소리가 큼', notes: '예: 입주 전 도배 일정 확인' }[key]}">${escapeHtml(value)}</textarea></label>`;
}

export function renderRecord(root, id, { onBack, onChange, onDeleted } = {}) {
  let record = listRecords().find(item => item.id === id);
  if (!record) {
    root.innerHTML = '<section class="rc-detail"><p class="rc-missing"></p><button class="btn btn-secondary" type="button">방문 기록으로</button></section>';
    root.querySelector('p').textContent = storageWarning || '방문 기록을 찾을 수 없습니다.';
    root.querySelector('button').addEventListener('click', () => onBack?.());
    return;
  }
  root.innerHTML = `<article class="rc-detail">
    <button class="rc-back" type="button" data-back>${icon('arrow-left', 17)} 방문 기록</button>
    <header class="rc-record-head"><div class="rc-record-title"><div class="rc-meta">
      <span class="rc-contract"></span><time></time></div><h1></h1><p class="rc-address" hidden></p></div>
      <div class="rc-actions"><button type="button" data-favorite class="rc-icon-btn" aria-label="관심 집">${icon('heart', 19)}</button>
      <button type="button" data-edit class="btn btn-secondary">${icon('edit', 16)} 수정</button></div></header>
    <dl class="rc-costs"></dl>
    <nav aria-label="방문 기록 보기" class="rc-tabs"><button type="button" aria-pressed="true" data-section="checklist">체크리스트</button><button type="button" aria-pressed="false" data-section="notes">장단점 · 메모</button></nav>
    <div class="rc-status" role="status" aria-live="polite"></div>
    <section class="rc-checklist" data-panel="checklist" aria-label="집 체크리스트">
      <div class="rc-progress-head"><h2>확인한 항목</h2><span data-progress-text></span></div>
      <progress class="rc-progress" aria-label="확인한 항목" max="${items.length || 1}" value="0"></progress>
      <div class="rc-groups">${checkGroups(record.checks)}</div></section>
    <section class="rc-notes" data-panel="notes" aria-label="장단점과 메모" hidden>
      ${noteFields.map(key => noteField(key, record[key])).join('')}
      <div class="rc-save-state" role="status"></div></section>
  </article>`;
  const scope = root.firstElementChild;
  const status = scope.querySelector('.rc-status');
  const noteStatus = scope.querySelector('.rc-save-state');
  function updateHeader() {
    scope.querySelector('.rc-contract').textContent = record.deal;
    const time = scope.querySelector('time');
    time.textContent = record.date ? record.date.replaceAll('-', '.') + ' 방문' : '';
    time.dateTime = record.date;
    scope.querySelector('h1').textContent = record.nickname || record.address;
    const address = scope.querySelector('.rc-address');
    address.hidden = !record.nickname;
    address.textContent = record.address;
    const favorite = scope.querySelector('[data-favorite]');
    favorite.setAttribute('aria-pressed', String(record.favorite));
    favorite.title = record.favorite ? '관심 집 해제' : '관심 집 표시';
    const costKeys = record.deal === '전세' ? ['deposit', 'fee'] : ['deposit', 'rent', 'fee'];
    scope.querySelector('.rc-costs').innerHTML = costKeys.map(key =>
      `<div><dt>${amountLabels[key]}</dt><dd>${escapeHtml(formattedMoney(record[key]))}</dd></div>`).join('');
  }
  function updateCounts() {
    const counts = new Map(groups.map(group => [group.id,
      group.items.filter(item => record.checks[item.id]).length + ' / ' + group.items.length]));
    for (const el of scope.querySelectorAll('[data-count]')) el.textContent = counts.get(el.dataset.count);
    const checked = Object.keys(record.checks).length;
    scope.querySelector('[data-progress-text]').textContent = checked + ' / ' + items.length;
    scope.querySelector('progress').value = checked;
  }
  function saveChange(change) {
    try {
      record = updateRecord(id, change);
      status.textContent = '';
    } catch (error) {
      status.textContent = error.message;
      return false;
    }
    onChange?.(record);
    return true;
  }
  updateHeader();
  updateCounts();
  scope.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.hasAttribute('data-back')) {
      onBack?.();
    } else if (button.hasAttribute('data-favorite')) {
      if (saveChange(current => ({ ...current, favorite: !current.favorite }))) updateHeader();
    } else if (button.hasAttribute('data-edit')) {
      openRecordForm({
        id,
        onSave(updated) { record = updated; updateHeader(); onChange?.(record); },
        onDelete(deletedId) { (onDeleted || onBack)?.(deletedId); },
      });
    } else if (button.dataset.section) {
      for (const tab of scope.querySelectorAll('[data-section]')) {
        tab.setAttribute('aria-pressed', String(tab === button));
      }
      for (const panel of scope.querySelectorAll('[data-panel]')) panel.hidden = panel.dataset.panel !== button.dataset.section;
    } else if (button.dataset.check) {
      const checkId = button.dataset.check;
      const next = button.dataset.value;
      if (!checkIds.has(checkId)) return;
      if (saveChange(current => {
        const checks = { ...current.checks };
        if (checks[checkId] === next) delete checks[checkId];
        else checks[checkId] = next;
        return { ...current, checks };
      })) {
        for (const option of scope.querySelectorAll('[data-check]')) {
          option.setAttribute('aria-pressed', String(record.checks[option.dataset.check] === option.dataset.value));
        }
        updateCounts();
      }
    }
  });
  scope.addEventListener('input', event => {
    const field = event.target;
    if (!noteFields.includes(field.name)) return;
    const saved = saveChange(current => ({ ...current, [field.name]: field.value }));
    noteStatus.textContent = saved ? '이 기기에 저장됨' : '저장되지 않음';
  });
}
