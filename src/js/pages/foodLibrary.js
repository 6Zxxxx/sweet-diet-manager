/* ============================================
   食物库页面
   ============================================ */

let currentCategory = 'all';
let foodSearchTerm = '';

function refreshFoodLibrary() {
  const container = document.getElementById('view-foodlib');
  container.innerHTML = `
    <!-- 搜索框 -->
    <input type="text" class="food-search" id="food-search" placeholder="🔍 搜索食物名称（如：鸡蛋、米饭、苹果...）">

    <!-- 分类标签 -->
    <div class="food-categories" id="food-categories">
      <button class="category-tag active" data-cat="all">全部</button>
      <button class="category-tag" data-cat="homemade">🍳 自己做菜</button>
      <button class="category-tag" data-cat="takeout">🥡 外卖</button>
      <button class="category-tag" data-cat="snacks">🍿 零食饮品</button>
      <button class="category-tag" data-cat="staple">🍚 主食</button>
      <button class="category-tag" data-cat="vegFruit">🥬 蔬果</button>
      <button class="category-tag" data-cat="protein">🥩 肉蛋奶</button>
    </div>

    <!-- 食物列表 -->
    <div class="food-list" id="food-list"></div>

    <!-- 自定义食物按钮 -->
    <div style="margin-top:16px; text-align:center;">
      <button class="btn btn-secondary" id="btn-add-custom-food">＋ 自定义添加食物</button>
    </div>
  `;

  // 搜索事件
  document.getElementById('food-search').addEventListener('input', (e) => {
    foodSearchTerm = e.target.value.trim().toLowerCase();
    renderFoodList();
  });

  // 分类切换事件
  document.getElementById('food-categories').addEventListener('click', (e) => {
    if (e.target.classList.contains('category-tag')) {
      document.querySelectorAll('.category-tag').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      currentCategory = e.target.dataset.cat;
      renderFoodList();
    }
  });

  // 自定义食物按钮
  document.getElementById('btn-add-custom-food').addEventListener('click', showCustomFoodForm);

  renderFoodList();
}

async function renderFoodList() {
  const listEl = document.getElementById('food-list');
  if (!listEl) return;

  const foods = await getAllFoods(currentUser.id);

  // 筛选
  let filtered = foods;
  if (currentCategory !== 'all') {
    filtered = filtered.filter(f => f.category === currentCategory);
  }
  if (foodSearchTerm) {
    filtered = filtered.filter(f => {
      return f.name.toLowerCase().includes(foodSearchTerm) ||
             FOOD_CATEGORIES[f.category]?.label.includes(foodSearchTerm);
    });
  }

  if (filtered.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-emoji">🍽️</div>
        <div class="empty-state-text">没有找到匹配的食物</div>
      </div>`;
    return;
  }

  listEl.innerHTML = filtered.map(food => `
    <div class="food-item" data-food-id="${food.id}">
      <div class="food-item-left">
        <div class="food-item-name">${food.isCustom ? '✏️ ' : ''}${food.name}</div>
        <div class="food-item-unit">每${food.unit}</div>
      </div>
      <div class="food-item-right">
        <div class="food-item-kcal">${food.calories} kcal</div>
        <div class="food-item-macros">蛋白${food.protein}g | 脂肪${food.fat}g | 碳水${food.carbs}g</div>
      </div>
    </div>
  `).join('');

  // 点击食物 → 添加记录
  listEl.querySelectorAll('.food-item').forEach(item => {
    item.addEventListener('click', async () => {
      const foodId = parseInt(item.dataset.foodId);
      const foods = await getAllFoods(currentUser.id);
      const food = foods.find(f => f.id === foodId);
      if (food) showAddFoodModal(food);
    });
  });
}

// 显示添加食物弹窗
function showAddFoodModal(food) {
  const meals = [
    { key: 'breakfast', label: '🌅 早餐' },
    { key: 'lunch', label: '☀️ 午餐' },
    { key: 'dinner', label: '🌙 晚餐' },
    { key: 'snack', label: '🍪 加餐' },
  ];

  showModal(`
    <div class="modal-title">${food.name}</div>
    <div style="text-align:center;margin-bottom:12px;">
      <span style="font-size:28px;font-weight:800;color:var(--pink-400);">${food.calories}</span>
      <span style="font-size:13px;color:var(--text-light);"> kcal / ${food.unit}</span>
    </div>
    <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-bottom:12px;">
      <span style="font-size:12px;background:#FFF0F3;padding:3px 8px;border-radius:8px;">蛋白质 ${food.protein}g</span>
      <span style="font-size:12px;background:#FFF3E0;padding:3px 8px;border-radius:8px;">脂肪 ${food.fat}g</span>
      <span style="font-size:12px;background:#E3F2FD;padding:3px 8px;border-radius:8px;">碳水 ${food.carbs}g</span>
      <span style="font-size:12px;background:#E8F5E9;padding:3px 8px;border-radius:8px;">纤维 ${food.fiber}g</span>
    </div>
    <div class="serving-control">
      <button class="serving-btn" id="serving-minus">−</button>
      <span class="serving-value" id="serving-val">1</span>
      <span class="serving-unit">份</span>
      <button class="serving-btn" id="serving-plus">＋</button>
    </div>
    <div style="margin-bottom:12px;">
      <label style="font-size:13px;font-weight:600;color:var(--text-light);display:block;margin-bottom:6px;">选择餐次</label>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;" id="meal-selector">
        ${meals.map((m, i) => `
          <button class="btn btn-secondary btn-sm meal-type-btn ${i===0?'active':''}" data-meal="${m.key}">${m.label}</button>
        `).join('')}
      </div>
    </div>
    <div style="display:flex;gap:10px;">
      <button class="btn btn-secondary btn-block" onclick="closeModal()">取消</button>
      <button class="btn btn-primary btn-block" id="btn-save-record">记录</button>
    </div>
  `);

  let servings = 1;
  let selectedMeal = 'breakfast';

  document.getElementById('serving-minus').addEventListener('click', () => {
    if (servings > 0.5) {
      servings = Math.round((servings - 0.5) * 10) / 10;
      document.getElementById('serving-val').textContent = servings;
    }
  });

  document.getElementById('serving-plus').addEventListener('click', () => {
    servings = Math.round((servings + 0.5) * 10) / 10;
    document.getElementById('serving-val').textContent = servings;
  });

  document.querySelectorAll('.meal-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.meal-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedMeal = btn.dataset.meal;
    });
  });

  document.getElementById('btn-save-record').addEventListener('click', async () => {
    const record = {
      date: todayStr(),
      mealType: selectedMeal,
      foodId: food.id,
      servings: servings,
      calories: Math.round(food.calories * servings),
      userId: currentUser.id,
    };
    await addRecord(record);
    closeModal();
    showToast(`已记录：${food.name} ${servings}份`);
    if (currentView === 'dashboard') refreshDashboard();
    if (currentView === 'calendar') refreshCalendar();
  });
}

// 自定义食物表单
function showCustomFoodForm() {
  const cats = Object.entries(FOOD_CATEGORIES).map(([k, v]) =>
    `<option value="${k}">${v.emoji} ${v.label}</option>`
  ).join('');

  showModal(`
    <div class="modal-title">✏️ 自定义食物</div>
    <div class="input-group">
      <label>食物名称 *</label>
      <input type="text" id="custom-name" placeholder="如：妈妈的拿手菜">
    </div>
    <div class="input-group">
      <label>分类 *</label>
      <select id="custom-category">${cats}</select>
    </div>
    <div class="input-row">
      <div class="input-group">
        <label>热量 (kcal) *</label>
        <input type="number" id="custom-kcal" placeholder="120" step="0.1">
      </div>
      <div class="input-group">
        <label>单位</label>
        <input type="text" id="custom-unit" placeholder="份(200g)">
      </div>
    </div>
    <div class="input-row">
      <div class="input-group">
        <label>蛋白质 (g)</label>
        <input type="number" id="custom-protein" placeholder="0" step="0.1">
      </div>
      <div class="input-group">
        <label>脂肪 (g)</label>
        <input type="number" id="custom-fat" placeholder="0" step="0.1">
      </div>
    </div>
    <div class="input-row">
      <div class="input-group">
        <label>碳水 (g)</label>
        <input type="number" id="custom-carbs" placeholder="0" step="0.1">
      </div>
      <div class="input-group">
        <label>膳食纤维 (g)</label>
        <input type="number" id="custom-fiber" placeholder="0" step="0.1">
      </div>
    </div>
    <div style="display:flex;gap:10px;margin-top:10px;">
      <button class="btn btn-secondary btn-block" onclick="closeModal()">取消</button>
      <button class="btn btn-primary btn-block" id="btn-save-custom">保存</button>
    </div>
  `);

  document.getElementById('btn-save-custom').addEventListener('click', async () => {
    const name = document.getElementById('custom-name').value.trim();
    const category = document.getElementById('custom-category').value;
    const calories = parseFloat(document.getElementById('custom-kcal').value);

    if (!name) { showToast('请输入食物名称'); return; }
    if (isNaN(calories) || calories <= 0) { showToast('请输入有效的热量值'); return; }

    const food = {
      name,
      category,
      calories,
      protein: parseFloat(document.getElementById('custom-protein').value) || 0,
      fat: parseFloat(document.getElementById('custom-fat').value) || 0,
      carbs: parseFloat(document.getElementById('custom-carbs').value) || 0,
      fiber: parseFloat(document.getElementById('custom-fiber').value) || 0,
      unit: document.getElementById('custom-unit').value.trim() || '份',
      isCustom: true,
      userId: currentUser.id,
    };

    await addCustomFood(food);
    closeModal();
    showToast(`已添加自定义食物：${name}`);
    renderFoodList();
  });
}
