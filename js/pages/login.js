/* ============================================
   登录/注册页面逻辑
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

// 登录
document.getElementById('btn-login').addEventListener('click', async () => {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;

  if (!username || !password) {
    showToast('请输入用户名和密码');
    return;
  }

  try {
    const hash = await sha256(password);
    const user = await loginUser(username, hash);

    if (!user) {
      showToast('用户名或密码错误');
      return;
    }

    // 保存登录状态
    localStorage.setItem('currentUserId', user.id);
    showToast('登录成功，欢迎回来～');
    switchToApp();
  } catch (err) {
    showToast('登录失败：' + err.message);
  }
});

// 注册
document.getElementById('btn-register').addEventListener('click', async () => {
  const username = document.getElementById('reg-username').value.trim();
  const password = document.getElementById('reg-password').value;
  const password2 = document.getElementById('reg-password2').value;

  if (!username || !password) {
    showToast('请输入用户名和密码');
    return;
  }
  if (username.length < 2) {
    showToast('用户名至少2个字符');
    return;
  }
  if (password.length < 6) {
    showToast('密码至少6位');
    return;
  }
  if (password !== password2) {
    showToast('两次密码输入不一致');
    return;
  }

  const height = parseFloat(document.getElementById('reg-height').value) || 160;
  const weight = parseFloat(document.getElementById('reg-weight').value) || 55;
  const age = parseInt(document.getElementById('reg-age').value) || 25;
  const gender = document.getElementById('reg-gender').value;

  try {
    const hash = await sha256(password);
    const user = await createUser({
      username,
      password: hash,
      height,
      weight,
      age,
      gender,
      createdAt: new Date().toISOString(),
    });

    localStorage.setItem('currentUserId', user.id);
    showToast('注册成功！开始记录你的饮食吧～');
    switchToApp();
  } catch (err) {
    showToast('注册失败：' + err.message);
  }
});

// 回车登录
document.getElementById('login-password').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('btn-login').click();
});
