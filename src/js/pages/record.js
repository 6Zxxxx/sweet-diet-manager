/* ============================================
   快速添加记录 - 从底部+按钮触发
   ============================================ */

async function showQuickAddModal() {
  const allFoods = await getAllFoods(currentUser.id);

  // 按分类分组
  const grouped = {};
  for (const f of allFoods) {
    if (!grouped[f.category]) grouped[f.category] = [];
    grouped[f.category].push(f);
  }

  const catTabs = Object.entries(FOOD_CATEGORIES)
    .filter(([k]) => grouped[k])
    .map(([k, v], i) =>
      `<button class="category-tag ${i === 0 ? 'active' : ''}" data-cat="${k}">${v.emoji} ${v.label}</button>`
    ).join('');

  const firstCat = Object.keys(grouped)[0];
  const firstFoods = grouped[firstCat] || [];

  showModal(`
    <div class="modal-title">🍽️ 快速添加</div>
    <input type="text" class="food-search" id="quick-search" placeholder="🔍 搜索食物...">
    <div class="food-categories" id="quick-categories">${catTabs}</div>
    <div class="food-list" id="quick-food-list">
      ${renderQuickFoodItems(firstFoods)}
    </div>
  `);

  let quickCat = firstCat;

  // 搜索
  document.getElementById('quick-search').addEventListener('input', (e) => {
    const term = e.target.value.trim().toLowerCase();
    const filtered = term
      ? allFoods.filter(f => f.name.toLowerCase().includes(term))
      : (grouped[quickCat] || []);
    document.getElementById('quick-food-list').innerHTML = renderQuickFoodItems(filtered);
    bindQuickFoodClicks();
  });

  // 分类切换
  document.getElementById('quick-categories').addEventListener('click', (e) => {
    if (e.target.classList.contains('category-tag')) {
      document.querySelectorAll('#quick-categories .category-tag').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      quickCat = e.target.dataset.cat;
      document.getElementById('quick-search').value = '';
      document.getElementById('quick-food-list').innerHTML = renderQuickFoodItems(grouped[quickCat] || []);
      bindQuickFoodClicks();
    }
  });

  bindQuickFoodClicks();
}

function renderQuickFoodItems(foods) {
  if (foods.length === 0) {
    return `<div class="empty-state"><div class="empty-state-emoji">🍽️</div><div class="empty-state-text">没有找到食物</div></div>`;
  }
  return foods.map(f => `
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
}

function bindQuickFoodClicks() {
  document.querySelectorAll('#quick-food-list .food-item').forEach(item => {
    item.addEventListener('click', async () => {
      const foodId = parseInt(item.dataset.foodId);
      const allFoods = await getAllFoods(currentUser.id);
      const food = allFoods.find(f => f.id === foodId);
      if (food) {
        closeModal();
        showAddFoodModal(food);
      }
    });
  });
}
