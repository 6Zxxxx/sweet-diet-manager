/* ============================================
   应用主控制器 - 路由、初始化、导航
   ============================================ */

let currentUser = null;
let currentView = 'dashboard';
let dbReady = false;
let useCloud = false; // 云端模式开关

// ============================================
//  初始化应用
// ============================================
async function init() {
  // 显示加载画面
  showLoading(true);

  // 尝试初始化本地数据库
  try {
    await Promise.race([
      (async () => { await openDB(); await initPresetFoods(); })(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('db_timeout')), 5000))
    ]);
    dbReady = true;
    console.log('本地数据库就绪');
  } catch (err) {
    console.warn('本地数据库初始化失败，使用内存模式:', err.message);
    dbReady = false;
  }

  // 初始化云端连接
  try {
    await initCloud();
    useCloud = true;
    console.log('云端连接就绪');
  } catch (err) {
    console.warn('云端不可用，使用本地模式:', err.message);
    useCloud = false;
  }

  // 检查登录状态（优先云端，其次本地）
  let userId = null;

  if (useCloud) {
    userId = await cloudGetSession();
  }
  if (!userId) {
    userId = localStorage.getItem('currentUserId');
  }

  if (userId) {
    try {
      let user = null;
      if (useCloud) {
        user = await cloudGetUser(userId);
      }
      if (!user && dbReady) {
        user = await dbGet('users', parseInt(userId));
      }
      if (user) {
        currentUser = user;
        // 同步 localStorage
        localStorage.setItem('currentUserId', user.id);
        showLoading(false);
        switchToApp();
        return;
      }
    } catch (err) {
      console.warn('加载用户失败:', err.message);
    }
  }

  // 未登录，显示登录页
  showLoading(false);
  switchToAuth();
}

function showLoading(show) {
  const el = document.getElementById('loading-screen');
  if (!el) return;
  if (show) {
    el.classList.remove('done');
  } else {
    el.classList.add('done');
  }
}

// ============================================
//  页面切换
// ============================================
function switchToAuth() {
  document.getElementById('page-auth').classList.add('active');
  document.getElementById('page-app').classList.remove('active');
  document.getElementById('login-form').classList.remove('hidden');
  document.getElementById('register-form').classList.add('hidden');
  document.getElementById('login-username').value = '';
  document.getElementById('login-password').value = '';
}

function switchToApp() {
  document.getElementById('page-auth').classList.remove('active');
  document.getElementById('page-app').classList.add('active');
  showView('dashboard');
  refreshDashboard();
}

function showView(viewName) {
  currentView = viewName;

  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const target = document.getElementById(`view-${viewName}`);
  if (target) target.classList.add('active');

  document.querySelectorAll('.nav-item[data-view]').forEach(item => {
    item.classList.toggle('active', item.dataset.view === viewName);
  });

  // 刷新视图（带错误处理）
  refreshCurrentView();
}

// 数据变更后刷新当前活跃视图
function notifyDataChanged() {
  refreshCurrentView();
}

function refreshCurrentView() {
  try {
    if (currentView === 'dashboard') refreshDashboard();
    if (currentView === 'foodlib') refreshFoodLibrary();
    if (currentView === 'calendar') refreshCalendar();
    if (currentView === 'settings') refreshSettings();
  } catch (err) {
    console.error('刷新视图失败:', currentView, err);
  }
}

// ============================================
//  退出登录
// ============================================
async function logout() {
  const ok = await showConfirm('确定要退出登录吗？');
  if (!ok) return;
  localStorage.removeItem('currentUserId');
  if (useCloud) await cloudSignOut();
  currentUser = null;
  switchToAuth();
  showToast('已退出登录');
}

// ============================================
//  底部导航事件（延迟绑定）
// ============================================
function bindNavigation() {
  document.querySelectorAll('.nav-item[data-view]').forEach(item => {
    item.addEventListener('click', () => {
      showView(item.dataset.view);
    });
  });

  const quickAddBtn = document.getElementById('btn-quick-add');
  if (quickAddBtn) {
    quickAddBtn.addEventListener('click', () => {
      if (typeof showQuickAddModal === 'function') showQuickAddModal();
    });
  }

  const settingsBtn = document.getElementById('btn-settings');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => showView('settings'));
  }
}

// ============================================
//  启动
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  bindNavigation();
  init().catch(err => {
    console.error('初始化失败:', err);
    showLoading(false);
    // 最坏情况：直接显示登录页
    switchToAuth();
  });

  // 注册 Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
});
