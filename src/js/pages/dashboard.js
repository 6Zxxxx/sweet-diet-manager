/* ============================================
   首页仪表盘 - 今日概览 + 营养分析 + 提醒
   ============================================ */

async function refreshDashboard() {
  if (!currentUser) return;

  const today = todayStr();
  const records = await getRecordsByDate(today, currentUser.id);

  // 获取食物名称
  const allFoods = await getAllFoods(currentUser.id);
  const foodMap = {};
  for (const f of allFoods) foodMap[f.id] = f.name;

  // 计算各餐次热量
  const mealKcal = { breakfast: 0, lunch: 0, dinner: 0, snack: 0 };
  let totalKcal = 0;
  let totalProtein = 0, totalFat = 0, totalCarbs = 0;

  for (const r of records) {
    mealKcal[r.mealType] = (mealKcal[r.mealType] || 0) + (r.calories || 0);
    totalKcal += r.calories || 0;
    const food = allFoods.find(f => f.id === r.foodId);
    if (food) {
      totalProtein += food.protein * r.servings;
      totalFat += food.fat * r.servings;
      totalCarbs += food.carbs * r.servings;
    }
  }

  // 推荐热量
  const dailyKcal = calcDailyKcal(currentUser.weight, currentUser.height, currentUser.age, currentUser.gender);
  const goals = nutrientGoals(dailyKcal);
  const kcalPercent = Math.min(Math.round(totalKcal / dailyKcal * 100), 150);

  // 进度条颜色
  let barClass = '';
  if (kcalPercent > 110) barClass = 'over';
  else if (kcalPercent > 90) barClass = 'warning';

  // 营养进度
  const proteinPct = Math.min(Math.round(totalProtein / goals.protein * 100), 150);
  const fatPct = Math.min(Math.round(totalFat / goals.fat * 100), 150);
  const carbsPct = Math.min(Math.round(totalCarbs / goals.carbs * 100), 150);

  function statusIcon(pct) {
    if (pct >= 85 && pct <= 115) return '<span class="nutrient-status good">✓</span>';
    if (pct < 85) return '<span class="nutrient-status warn">不足</span>';
    return '<span class="nutrient-status over">偏高</span>';
  }

  // 生成提醒文案
  const tips = [];
  if (proteinPct < 70) tips.push('今天的蛋白质还不够哦，记得补充肉蛋奶～🐮');
  if (totalKcal < dailyKcal * 0.4 && records.length > 0) tips.push('今天摄入热量偏低，要好好吃饭呀～🍚');
  if (kcalPercent > 110) tips.push('今天吃得有点多啦，晚餐可以清淡一些～🥗');
  if (records.length === 0) tips.push('今天还没记录呢，快来记录你的第一餐吧～🌸');
  if (tips.length === 0) tips.push('今天营养均衡，表现很棒哦！继续保持～✨');

  const container = document.getElementById('view-dashboard');
  container.innerHTML = `
    <!-- 今日摄入进度 -->
    <div class="card">
      <div class="card-title">🌸 今日摄入</div>
      <div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:13px;">
        <span>已摄入 <strong>${totalKcal}</strong> kcal</span>
        <span>推荐 <strong>${dailyKcal}</strong> kcal</span>
      </div>
      <div class="progress-bar">
        <div class="progress-bar-fill ${barClass}" style="width:${Math.min(kcalPercent, 100)}%"></div>
      </div>
      <div style="text-align:right;font-size:12px;color:var(--text-light);margin-top:4px;">${kcalPercent}%</div>
    </div>

    <!-- 餐次快捷卡片 -->
    <div class="card">
      <div class="card-title">🍽️ 今日餐次</div>
      <div class="meal-cards">
        ${Object.entries(MEAL_TYPES).map(([key, info]) => `
          <div class="meal-card" data-meal="${key}">
            <div class="meal-card-emoji">${info.emoji}</div>
            <div class="meal-card-label">${info.label}</div>
            <div class="meal-card-kcal">${mealKcal[key] > 0 ? mealKcal[key] + ' kcal' : '<span class="meal-card-empty">点击记录</span>'}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- 营养分析 -->
    <div class="card">
      <div class="card-title">🍩 营养分析</div>
      <div class="nutrient-row">
        <span class="nutrient-label">蛋白质</span>
        <div class="nutrient-bar-wrap">
          <div class="nutrient-bar-fill protein" style="width:${Math.min(proteinPct,100)}%"></div>
        </div>
        <span class="nutrient-status">${Math.round(totalProtein)}g</span>
        ${statusIcon(proteinPct)}
      </div>
      <div class="nutrient-row">
        <span class="nutrient-label">脂肪</span>
        <div class="nutrient-bar-wrap">
          <div class="nutrient-bar-fill fat" style="width:${Math.min(fatPct,100)}%"></div>
        </div>
        <span class="nutrient-status">${Math.round(totalFat)}g</span>
        ${statusIcon(fatPct)}
      </div>
      <div class="nutrient-row">
        <span class="nutrient-label">碳水</span>
        <div class="nutrient-bar-wrap">
          <div class="nutrient-bar-fill carbs" style="width:${Math.min(carbsPct,100)}%"></div>
        </div>
        <span class="nutrient-status">${Math.round(totalCarbs)}g</span>
        ${statusIcon(carbsPct)}
      </div>
      <div style="font-size:11px;color:var(--text-muted);margin-top:8px;">
        目标：蛋白质 ${goals.protein}g | 脂肪 ${goals.fat}g | 碳水 ${goals.carbs}g
      </div>
    </div>

    <!-- 可爱提醒 -->
    <div class="tip-card">
      <div class="tip-text">💬 ${tips[0]}</div>
    </div>
  `;

  // 餐次卡片点击
  container.querySelectorAll('.meal-card').forEach(card => {
    card.addEventListener('click', () => {
      const meal = card.dataset.meal;
      showMealAddModal(meal);
    });
  });
}

// 按餐次快速添加
async function showMealAddModal(mealType) {
  const allFoods = await getAllFoods(currentUser.id);
  const mealInfo = MEAL_TYPES[mealType];

  // 分组
  const grouped = {};
  for (const f of allFoods) {
    if (!grouped[f.category]) grouped[f.category] = [];
    grouped[f.category].push(f);
  }
  const firstCat = Object.keys(grouped)[0];
  let currentCat = firstCat;

  const catTabs = Object.entries(FOOD_CATEGORIES)
    .filter(([k]) => grouped[k])
    .map(([k, v], i) =>
      `<button class="category-tag ${i === 0 ? 'active' : ''}" data-cat="${k}">${v.emoji} ${v.label}</button>`
    ).join('');

  showModal(`
    <div class="modal-title">${mealInfo.emoji} 添加${mealInfo.label}</div>
    <input type="text" class="food-search" id="meal-search" placeholder="🔍 搜索食物...">
    <div class="food-categories" id="meal-categories">${catTabs}</div>
    <div class="food-list" id="meal-food-list">
      ${(grouped[firstCat] || []).map(f => `
        <div class="food-item" data-food-id="${f.id}">
          <div class="food-item-left">
            <div class="food-item-name">${f.name}</div>
            <div class="food-item-unit">${f.unit}</div>
          </div>
          <div class="food-item-right">
            <div class="food-item-kcal">${f.calories} kcal</div>
          </div>
        </div>
      `).join('')}
    </div>
  `);

  // 搜索
  document.getElementById('meal-search').addEventListener('input', (e) => {
    const term = e.target.value.trim().toLowerCase();
    const filtered = term ? allFoods.filter(f => f.name.toLowerCase().includes(term)) : (grouped[currentCat] || []);
    document.getElementById('meal-food-list').innerHTML = filtered.map(f => `
      <div class="food-item" data-food-id="${f.id}">
        <div class="food-item-left">
          <div class="food-item-name">${f.name}</div>
          <div class="food-item-unit">${f.unit}</div>
        </div>
        <div class="food-item-right">
          <div class="food-item-kcal">${f.calories} kcal</div>
        </div>
      </div>
    `).join('') || `<div class="empty-state"><div class="empty-state-text">没有找到</div></div>`;
    bindMealFoodClicks(mealType);
  });

  // 分类切换
  document.getElementById('meal-categories').addEventListener('click', (e) => {
    if (e.target.classList.contains('category-tag')) {
      document.querySelectorAll('#meal-categories .category-tag').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      currentCat = e.target.dataset.cat;
      document.getElementById('meal-search').value = '';
      document.getElementById('meal-food-list').innerHTML = (grouped[currentCat] || []).map(f => `
        <div class="food-item" data-food-id="${f.id}">
          <div class="food-item-left">
            <div class="food-item-name">${f.name}</div>
            <div class="food-item-unit">${f.unit}</div>
          </div>
          <div class="food-item-right">
            <div class="food-item-kcal">${f.calories} kcal</div>
          </div>
        </div>
      `).join('');
      bindMealFoodClicks(mealType);
    }
  });

  bindMealFoodClicks(mealType);
}

function bindMealFoodClicks(mealType) {
  document.querySelectorAll('#meal-food-list .food-item').forEach(item => {
    item.addEventListener('click', async () => {
      const foodId = parseInt(item.dataset.foodId);
      const allFoods = await getAllFoods(currentUser.id);
      const food = allFoods.find(f => f.id === foodId);
      if (food) {
        closeModal();
        showMealQuickRecord(food, mealType);
      }
    });
  });
}

function showMealQuickRecord(food, mealType) {
  const mealInfo = MEAL_TYPES[mealType];
  showModal(`
    <div class="modal-title">${mealInfo.emoji} 记录${mealInfo.label}</div>
    <div style="text-align:center;margin-bottom:8px;font-size:16px;font-weight:600;">${food.name}</div>
    <div style="text-align:center;margin-bottom:12px;font-size:13px;color:var(--text-light);">${food.unit}</div>
    <div class="serving-control">
      <button class="serving-btn" id="m-s-minus">−</button>
      <span class="serving-value" id="m-s-val">1</span>
      <span class="serving-unit">份</span>
      <button class="serving-btn" id="m-s-plus">＋</button>
    </div>
    <div style="text-align:center;margin:8px 0;font-size:24px;font-weight:800;color:var(--pink-400);">
      <span id="m-kcal">${food.calories}</span> kcal
    </div>
    <div style="display:flex;gap:10px;">
      <button class="btn btn-secondary btn-block" onclick="closeModal()">取消</button>
      <button class="btn btn-primary btn-block" id="btn-meal-save">记录</button>
    </div>
  `);

  let servings = 1;
  document.getElementById('m-s-minus').addEventListener('click', () => {
    if (servings > 0.5) {
      servings = Math.round((servings - 0.5) * 10) / 10;
      document.getElementById('m-s-val').textContent = servings;
      document.getElementById('m-kcal').textContent = Math.round(food.calories * servings);
    }
  });
  document.getElementById('m-s-plus').addEventListener('click', () => {
    servings = Math.round((servings + 0.5) * 10) / 10;
    document.getElementById('m-s-val').textContent = servings;
    document.getElementById('m-kcal').textContent = Math.round(food.calories * servings);
  });

  document.getElementById('btn-meal-save').addEventListener('click', async () => {
    await addRecord({
      date: todayStr(),
      mealType,
      foodId: food.id,
      servings,
      calories: Math.round(food.calories * servings),
      userId: currentUser.id,
    });
    closeModal();
    showToast(`已记录${mealInfo.label}：${food.name}`);
    refreshDashboard();
  });
}
