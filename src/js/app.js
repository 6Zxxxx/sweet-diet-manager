/* ============================================
   应用主控制器 - 路由、初始化、导航
   ============================================ */

let currentUser = null;
let currentView = 'dashboard';

// 初始化应用
async function init() {
  try {
    await openDB();
    await initPresetFoods();
  } catch (err) {
    console.error('数据库初始化失败:', err);
    showToast('数据加载失败，请刷新重试');
    return;
  }

  // 检查登录状态
  const userId = localStorage.getItem('currentUserId');
  if (userId) {
    const user = await dbGet('users', parseInt(userId));
    if (user) {
      currentUser = user;
      switchToApp();
      return;
    }
  }

  // 未登录
  switchToAuth();
}

// 切换到登录页
function switchToAuth() {
  document.getElementById('page-auth').classList.add('active');
  document.getElementById('page-app').classList.remove('active');
  document.getElementById('login-form').classList.remove('hidden');
  document.getElementById('register-form').classList.add('hidden');
  document.getElementById('login-username').value = '';
  document.getElementById('login-password').value = '';
}

// 切换到主应用
function switchToApp() {
  document.getElementById('page-auth').classList.remove('active');
  document.getElementById('page-app').classList.add('active');
  showView('dashboard');
  refreshDashboard();
}

// 切换视图
function showView(viewName) {
  currentView = viewName;

  // 隐藏所有视图
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

  // 显示目标视图
  document.getElementById(`view-${viewName}`).classList.add('active');

  // 更新导航高亮
  document.querySelectorAll('.nav-item[data-view]').forEach(item => {
    item.classList.toggle('active', item.dataset.view === viewName);
  });

  // 刷新视图内容
  if (viewName === 'dashboard') refreshDashboard();
  if (viewName === 'foodlib') refreshFoodLibrary();
  if (viewName === 'calendar') refreshCalendar();
  if (viewName === 'settings') refreshSettings();
}

// 退出登录
async function logout() {
  const ok = await showConfirm('确定要退出登录吗？');
  if (!ok) return;
  localStorage.removeItem('currentUserId');
  currentUser = null;
  switchToAuth();
  showToast('已退出登录');
}

// ============================================
//  底部导航事件
// ============================================
document.querySelectorAll('.nav-item[data-view]').forEach(item => {
  item.addEventListener('click', () => {
    showView(item.dataset.view);
  });
});

// 快速添加按钮
document.getElementById('btn-quick-add').addEventListener('click', () => {
  showQuickAddModal();
});

// 设置按钮（头部）
document.getElementById('btn-settings').addEventListener('click', () => {
  showView('settings');
});

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  init();
  // 注册 Service Worker（PWA）
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
});
