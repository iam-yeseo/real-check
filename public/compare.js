import { groups } from './content.js';
import { icon } from './icons.js';

const moneyFormat = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 4 });

function amount(value) {
  return typeof value === 'number' && Number.isFinite(value) ? moneyFormat.format(value) + '만원' : '미입력';
}

function monthlyCost(home) {
  const rent = home.deal === '전세' ? 0 : home.rent;
  if (typeof rent !== 'number' || typeof home.fee !== 'number') return '미입력';
  return amount(rent + home.fee);
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
    row('보증금', home => amount(home.deposit));
    row('월세', home => home.deal === '전세' ? '해당 없음' : amount(home.rent));
    row('관리비', home => amount(home.fee));
    row('월세 + 관리비', monthlyCost);
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
