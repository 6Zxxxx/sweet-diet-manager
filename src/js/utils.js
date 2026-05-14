/* ============================================
   工具函数 - BMI、热量计算、格式化等
   ============================================ */

// SHA-256 哈希（用于密码存储）
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// BMI 计算
function calcBMI(weight, height) {
  const h = height / 100;
  return weight / (h * h);
}

// BMI 评级
function bmiCategory(bmi) {
  if (bmi < 18.5) return { cat: 'underweight', label: '偏瘦', color: '#1565C0' };
  if (bmi < 24) return { cat: 'normal', label: '标准', color: '#2E7D32' };
  if (bmi < 28) return { cat: 'overweight', label: '偏胖', color: '#E65100' };
  return { cat: 'obese', label: '肥胖', color: '#C62828' };
}

// 每日基础代谢 BMR (Mifflin-St Jeor)
function calcBMR(weight, height, age, gender) {
  const bmr = 10 * weight + 6.25 * height - 5 * age;
  return Math.round(gender === 'male' ? bmr + 5 : bmr - 161);
}

// 每日推荐热量（中等活动量 PAL=1.55）
function calcDailyKcal(weight, height, age, gender) {
  return Math.round(calcBMR(weight, height, age, gender) * 1.55);
}

// 营养目标（基于推荐热量的比例）
function nutrientGoals(dailyKcal) {
  return {
    protein: Math.round(dailyKcal * 0.175 / 4),  // 17.5% 来自蛋白质
    fat: Math.round(dailyKcal * 0.25 / 9),        // 25% 来自脂肪
    carbs: Math.round(dailyKcal * 0.575 / 4),     // 57.5% 来自碳水
  };
}

// 格式化日期
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function fmtDate(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return `${y}年${parseInt(m)}月${parseInt(d)}日`;
}

function fmtDateShort(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return `${parseInt(m)}/${parseInt(d)}`;
}

// Toast 提示
function showToast(msg, duration = 2000) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.remove('hidden');
  // 强制重绘以重新触发动画
  void toast.offsetWidth;
  toast.style.animation = 'none';
  void toast.offsetWidth;
  toast.style.animation = '';
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => toast.classList.add('hidden'), duration);
}

// 通用弹窗
function showModal(html) {
  const overlay = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-content');
  content.innerHTML = `<div class="modal-handle"></div>${html}`;
  overlay.classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

// 点击遮罩关闭
document.getElementById('modal-overlay').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

// 餐次映射
const MEAL_TYPES = {
  breakfast: { label: '早餐', emoji: '🌅', tagClass: 'breakfast' },
  lunch: { label: '午餐', emoji: '☀️', tagClass: 'lunch' },
  dinner: { label: '晚餐', emoji: '🌙', tagClass: 'dinner' },
  snack: { label: '加餐', emoji: '🍪', tagClass: 'snack' },
};

// 食物分类映射
const FOOD_CATEGORIES = {
  homemade: { label: '自己做菜', emoji: '🍳' },
  takeout: { label: '外卖', emoji: '🥡' },
  snacks: { label: '零食饮品', emoji: '🍿' },
  staple: { label: '主食', emoji: '🍚' },
  vegFruit: { label: '蔬果', emoji: '🥬' },
  protein: { label: '肉蛋奶', emoji: '🥩' },
};

// 确认对话框
function showConfirm(msg) {
  return new Promise(resolve => {
    showModal(`
      <div class="modal-title">${msg}</div>
      <div style="display:flex;gap:10px;margin-top:16px;">
        <button class="btn btn-secondary btn-block" id="modal-cancel">取消</button>
        <button class="btn btn-primary btn-block" id="modal-confirm">确认</button>
      </div>
    `);
    document.getElementById('modal-cancel').onclick = () => { closeModal(); resolve(false); };
    document.getElementById('modal-confirm').onclick = () => { closeModal(); resolve(true); };
  });
}

// 获取 URL 参数（兼容文件协议和 http）
function getQueryParam(key) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(key);
}
