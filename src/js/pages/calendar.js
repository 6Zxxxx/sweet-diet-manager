/* ============================================
   日历视图页面
   ============================================ */

let calYear, calMonth;
let selectedDate = todayStr();
let calRecords = {};

function refreshCalendar() {
  const today = new Date();
  calYear = today.getFullYear();
  calMonth = today.getMonth() + 1;
  selectedDate = todayStr();
  loadAndRenderCalendar();
}

async function loadAndRenderCalendar() {
  // 获取当月所有记录
  const startDate = `${calYear}-${String(calMonth).padStart(2,'0')}-01`;
  const endDate = `${calYear}-${String(calMonth).padStart(2,'0')}-31`;
  const records = await getRecordsByDateRange(startDate, endDate, currentUser.id);

  calRecords = {};
  for (const r of records) {
    if (!calRecords[r.date]) calRecords[r.date] = [];
    calRecords[r.date].push(r);
  }

  renderCalendarView();
  await renderDayRecords();
}

function renderCalendarView() {
  const container = document.getElementById('view-calendar');

  const daysInMonth = new Date(calYear, calMonth, 0).getDate();
  const firstDay = new Date(calYear, calMonth - 1, 1).getDay(); // 0=Sun

  const dayHeaders = ['日', '一', '二', '三', '四', '五', '六'];

  let dayCells = '';

  // 空白填充
  for (let i = 0; i < firstDay; i++) {
    dayCells += `<div class="calendar-day other-month"></div>`;
  }

  // 当月日期
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calYear}-${String(calMonth).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday = dateStr === todayStr();
    const isSel = dateStr === selectedDate;
    const hasRecord = calRecords[dateStr] && calRecords[dateStr].length > 0;

    let cls = 'calendar-day';
    if (isToday && isSel) cls += ' today selected';
    else if (isToday) cls += ' today';
    else if (isSel) cls += ' selected';

    dayCells += `
      <div class="${cls}" data-date="${dateStr}">
        ${d}
        ${hasRecord ? '<div class="calendar-day-dot"></div>' : ''}
      </div>`;
  }

  container.innerHTML = `
    <div class="card">
      <div class="calendar-header">
        <span class="calendar-month">📅 ${calYear}年 ${calMonth}月</span>
        <div class="calendar-nav">
          <button class="btn btn-secondary btn-sm" id="cal-prev">◀</button>
          <button class="btn btn-secondary btn-sm" id="cal-today">今天</button>
          <button class="btn btn-secondary btn-sm" id="cal-next">▶</button>
        </div>
      </div>
      <div class="calendar-grid">
        ${dayHeaders.map(h => `<div class="calendar-day-header">${h}</div>`).join('')}
        ${dayCells}
      </div>
    </div>
    <div class="card day-records" id="day-records-container">
      <div class="day-records-title">📝 ${fmtDate(selectedDate)}</div>
      <div id="day-records-list"></div>
      <button class="btn btn-primary btn-block btn-sm" id="btn-add-today-record">＋ 添加记录</button>
    </div>
  `;

  // 日历点击事件
  container.querySelectorAll('.calendar-day[data-date]').forEach(day => {
    day.addEventListener('click', async () => {
      selectedDate = day.dataset.date;
      document.querySelectorAll('.calendar-day').forEach(d => {
        d.classList.remove('selected');
        if (d.dataset.date === selectedDate) d.classList.add('selected');
        if (d.dataset.date === todayStr() && selectedDate !== todayStr()) d.classList.add('today');
      });
      await loadDayRecords(selectedDate);
      await renderDayRecords();
    });
  });

  // 月份切换
  document.getElementById('cal-prev').addEventListener('click', () => {
    calMonth--;
    if (calMonth < 1) { calMonth = 12; calYear--; }
    loadAndRenderCalendar();
  });

  document.getElementById('cal-next').addEventListener('click', () => {
    calMonth++;
    if (calMonth > 12) { calMonth = 1; calYear++; }
    loadAndRenderCalendar();
  });

  document.getElementById('cal-today').addEventListener('click', () => {
    const today = new Date();
    calYear = today.getFullYear();
    calMonth = today.getMonth() + 1;
    selectedDate = todayStr();
    loadAndRenderCalendar();
  });

  document.getElementById('btn-add-today-record').addEventListener('click', () => {
    showQuickAddModal();
  });
}

async function loadDayRecords(dateStr) {
  const records = await getRecordsByDate(dateStr, currentUser.id);
  calRecords[dateStr] = records;
}

async function renderDayRecords() {
  const listEl = document.getElementById('day-records-list');
  if (!listEl) return;

  const records = calRecords[selectedDate] || [];
  const allFoods = await getAllFoods(currentUser.id);
  const foodMap = {};
  for (const f of allFoods) foodMap[f.id] = f.name;

  // 更新标题
  const titleEl = document.querySelector('.day-records-title');
  if (titleEl) {
    const isToday = selectedDate === todayStr();
    titleEl.textContent = `📝 ${fmtDate(selectedDate)}${isToday ? ' (今天)' : ''}`;
  }

  if (records.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-emoji">📭</div>
        <div class="empty-state-text">这一天还没有记录</div>
      </div>`;
    return;
  }

  // 按餐次分组
  const mealOrder = ['breakfast', 'lunch', 'dinner', 'snack'];
  const grouped = {};
  for (const m of mealOrder) grouped[m] = [];

  for (const r of records) {
    if (grouped[r.mealType]) grouped[r.mealType].push(r);
    else grouped.snack.push(r);
  }

  let html = '';
  let totalKcal = 0;

  for (const meal of mealOrder) {
    if (grouped[meal].length === 0) continue;
    const mealInfo = MEAL_TYPES[meal];
    html += `<div style="font-size:13px;font-weight:700;color:var(--text-light);margin:8px 0 4px;">${mealInfo.emoji} ${mealInfo.label}</div>`;

    for (const r of grouped[meal]) {
      const foodName = foodMap[r.foodId] || `食物#${r.foodId}`;
      totalKcal += r.calories || 0;
      html += `
        <div class="record-item" data-record-id="${r.id}">
          <span class="record-meal-tag ${mealInfo.tagClass}">${mealInfo.label}</span>
          <span class="record-food-name">${foodName}</span>
          <span class="record-kcal">${r.calories} kcal</span>
          <span class="record-delete" data-record-id="${r.id}">🗑️</span>
        </div>`;
    }
  }

  html += `<div style="text-align:right;font-weight:700;color:var(--pink-500);margin-top:8px;">合计：${totalKcal} kcal</div>`;

  listEl.innerHTML = html;

  // 删除按钮
  listEl.querySelectorAll('.record-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const recordId = parseInt(btn.dataset.recordId);
      const isToday = selectedDate === todayStr();
      if (!isToday) {
        const ok = await showConfirm('要修改过去的记录吗？');
        if (!ok) return;
      }
      await deleteRecord(recordId);
      await loadDayRecords(selectedDate);
      await renderDayRecords();
      notifyDataChanged();
      showToast('已删除');
    });
  });
}
