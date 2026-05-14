/* ============================================
   登录/注册 - 支持云端跨设备同步
   ============================================ */

// 切换登录/注册表单
document.getElementById('switch-to-register').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('login-form').classList.add('hidden');
  document.getElementById('register-form').classList.remove('hidden');
});
document.getElementById('switch-to-login').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('register-form').classList.add('hidden');
  document.getElementById('login-form').classList.remove('hidden');
});

// ============================================
//  登录
// ============================================
document.getElementById('btn-login').addEventListener('click', async () => {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;

  if (!username || !password) { showToast('请输入用户名和密码'); return; }

  try {
    const hash = await sha256(password);
    let user = null;
    let userId = null;

    // 1. 先尝试云端登录
    if (useCloud) {
      try {
        const cloudUser = await cloudLogin(username, hash);
        if (cloudUser) {
          user = {
            id: cloudUser.id,
            username: cloudUser.username,
            password: cloudUser.password,
            height: cloudUser.height,
            weight: cloudUser.weight,
            age: cloudUser.age,
            gender: cloudUser.gender,
            createdAt: cloudUser.createdAt,
          };
          userId = cloudUser.id;
        }
      } catch (e) { console.warn('云端登录失败:', e.message); }
    }

    // 2. 如果云端失败，尝试本地登录
    if (!user && dbReady) {
      const localUser = await loginUser(username, hash);
      if (localUser) {
        user = localUser;
        userId = localUser.id;
        // 如果云端可用，同步本地数据到云端
        if (useCloud) {
          try {
            // 导出本地数据到云端
            const records = await getRecordsByDateRange('2000-01-01', '2099-12-31', localUser.id);
            const cloudData = {
              type: 'user', username, password: hash,
              height: localUser.height, weight: localUser.weight,
              age: localUser.age, gender: localUser.gender,
              createdAt: localUser.createdAt,
              records: records,
              customFoods: [],
            };
            const allFoods = await getAllFoods(localUser.id);
            cloudData.customFoods = allFoods.filter(f => f.isCustom);
            await cloudSaveFullData(cloudData);
          } catch (e) { console.warn('本地数据云端同步失败:', e.message); }
        }
      }
    }

    if (!user) {
      showToast('用户名或密码错误');
      return;
    }

    // 保存登录状态
    currentUser = user;
    localStorage.setItem('currentUserId', userId);
    showToast('登录成功～');
    switchToApp();

  } catch (err) {
    showToast('登录失败：' + err.message);
  }
});

// ============================================
//  注册
// ============================================
document.getElementById('btn-register').addEventListener('click', async () => {
  const username = document.getElementById('reg-username').value.trim();
  const password = document.getElementById('reg-password').value;
  const password2 = document.getElementById('reg-password2').value;

  if (!username || !password) { showToast('请输入用户名和密码'); return; }
  if (username.length < 2) { showToast('用户名至少2个字符'); return; }
  if (password.length < 6) { showToast('密码至少6位'); return; }
  if (password !== password2) { showToast('两次密码输入不一致'); return; }

  const height = parseFloat(document.getElementById('reg-height').value) || 160;
  const weight = parseFloat(document.getElementById('reg-weight').value) || 55;
  const age = parseInt(document.getElementById('reg-age').value) || 25;
  const gender = document.getElementById('reg-gender').value;

  try {
    const hash = await sha256(password);
    let userId = null;
    let user = null;

    // 1. 先尝试云端注册
    if (useCloud) {
      try {
        userId = await cloudRegister(username, hash, { height, weight, age, gender });
      } catch (e) {
        if (e.message === '用户名已存在') {
          showToast('用户名已存在，请换一个');
          return;
        }
        console.warn('云端注册失败，尝试本地:', e.message);
      }
    }

    // 2. 如果云端失败，使用本地注册
    if (!userId && dbReady) {
      try {
        user = await createUser({ username, password: hash, height, weight, age, gender, createdAt: new Date().toISOString() });
        userId = user.id;
      } catch (e) {
        if (e.message === '用户名已存在') {
          showToast('用户名已存在，请换一个');
          return;
        }
        throw e;
      }
    }

    if (!userId) {
      showToast('注册失败：无法创建账号，请检查网络后重试');
      return;
    }

    // 构建用户对象
    if (!user) {
      user = { id: userId, username, password: hash, height, weight, age, gender };
    }

    currentUser = user;
    localStorage.setItem('currentUserId', userId);
    showToast('注册成功！🎉');
    switchToApp();

  } catch (err) {
    showToast('注册失败：' + err.message);
  }
});

// 回车登录
document.getElementById('login-password').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('btn-login').click();
});
