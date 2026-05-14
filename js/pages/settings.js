/* ============================================
   设置页面 - 个人信息、BMI、数据导出
   ============================================ */

function refreshSettings() {
  if (!currentUser) return;

  const bmi = calcBMI(currentUser.weight, currentUser.height);
  const bmiInfo = bmiCategory(bmi);
  const dailyKcal = calcDailyKcal(currentUser.weight, currentUser.height, currentUser.age, currentUser.gender);
  const bmr = calcBMR(currentUser.weight, currentUser.height, currentUser.age, currentUser.gender);

  const container = document.getElementById('view-settings');
  container.innerHTML = `
    <!-- BMI 展示 -->
    <div class="bmi-display">
      <div style="font-size:13px;color:var(--text-light);">BMI</div>
      <div class="bmi-value">${bmi.toFixed(1)}</div>
      <span class="bmi-category ${bmiInfo.cat}">${bmiInfo.label}</span>
      <div style="font-size:12px;color:var(--text-light);margin-top:8px;">
        基础代谢 ${bmr} kcal · 每日推荐 ${dailyKcal} kcal
      </div>
    </div>

    <!-- 个人信息 -->
    <div class="card settings-section">
      <div class="card-title">👤 个人信息</div>
      <div class="input-group">
        <label>用户名</label>
        <input type="text" id="set-username" value="${escapeHtml(currentUser.username)}" disabled style="opacity:0.7;">
      </div>
      <div class="input-row">
        <div class="input-group">
          <label>身高 (cm)</label>
          <input type="number" id="set-height" value="${currentUser.height}" min="50" max="250">
        </div>
        <div class="input-group">
          <label>体重 (kg)</label>
          <input type="number" id="set-weight" value="${currentUser.weight}" min="10" max="300">
        </div>
      </div>
      <div class="input-row">
        <div class="input-group">
          <label>年龄</label>
          <input type="number" id="set-age" value="${currentUser.age}" min="1" max="120">
        </div>
        <div class="input-group">
          <label>性别</label>
          <select id="set-gender">
            <option value="female" ${currentUser.gender === 'female' ? 'selected' : ''}>女</option>
            <option value="male" ${currentUser.gender === 'male' ? 'selected' : ''}>男</option>
          </select>
        </div>
      </div>
      <button class="btn btn-primary btn-block" id="btn-save-profile">保存修改</button>
    </div>

    <!-- 密码修改 -->
    <div class="card settings-section">
      <div class="card-title">🔒 修改密码</div>
      <div class="input-group">
        <label>当前密码</label>
        <input type="password" id="set-old-pwd" placeholder="请输入当前密码">
      </div>
      <div class="input-group">
        <label>新密码</label>
        <input type="password" id="set-new-pwd" placeholder="请设置新密码（至少6位）">
      </div>
      <div class="input-group">
        <label>确认新密码</label>
        <input type="password" id="set-new-pwd2" placeholder="请再次输入新密码">
      </div>
      <button class="btn btn-secondary btn-block" id="btn-change-pwd">修改密码</button>
    </div>

    <!-- 数据操作 -->
    <div class="card settings-section">
      <div class="card-title">📦 数据管理</div>
      <div class="action-list">
        <div class="action-item" id="btn-export">
          <div class="action-item-left">
            <span class="action-item-icon">📤</span>
            <div>
              <div class="action-item-label">导出数据</div>
              <div class="action-item-desc">下载JSON格式备份文件</div>
            </div>
          </div>
          <span>›</span>
        </div>
        <div class="action-item" id="btn-clear-data">
          <div class="action-item-left">
            <span class="action-item-icon">🗑️</span>
            <div>
              <div class="action-item-label">清除所有数据</div>
              <div class="action-item-desc">不可恢复，请先导出备份</div>
            </div>
          </div>
          <span>›</span>
        </div>
      </div>
    </div>

    <!-- 退出 -->
    <button class="btn btn-secondary btn-block" id="btn-logout" style="margin-top:8px;margin-bottom:20px;">退出登录</button>
  `;

  // 保存个人信息
  document.getElementById('btn-save-profile').addEventListener('click', async () => {
    const height = parseFloat(document.getElementById('set-height').value);
    const weight = parseFloat(document.getElementById('set-weight').value);
    const age = parseInt(document.getElementById('set-age').value);
    const gender = document.getElementById('set-gender').value;

    if (isNaN(height) || height < 50 || height > 250) { showToast('请输入有效身高'); return; }
    if (isNaN(weight) || weight < 10 || weight > 300) { showToast('请输入有效体重'); return; }
    if (isNaN(age) || age < 1 || age > 120) { showToast('请输入有效年龄'); return; }

    currentUser.height = height;
    currentUser.weight = weight;
    currentUser.age = age;
    currentUser.gender = gender;

    await updateUser(currentUser);
    showToast('个人信息已更新～');
    notifyDataChanged();
  });

  // 修改密码
  document.getElementById('btn-change-pwd').addEventListener('click', async () => {
    const oldPwd = document.getElementById('set-old-pwd').value;
    const newPwd = document.getElementById('set-new-pwd').value;
    const newPwd2 = document.getElementById('set-new-pwd2').value;

    if (!oldPwd || !newPwd || !newPwd2) { showToast('请填写所有密码字段'); return; }
    if (newPwd.length < 6) { showToast('新密码至少6位'); return; }
    if (newPwd !== newPwd2) { showToast('两次新密码不一致'); return; }

    const oldHash = await sha256(oldPwd);
    if (oldHash !== currentUser.password) { showToast('当前密码错误'); return; }

    currentUser.password = await sha256(newPwd);
    await updateUser(currentUser);
    showToast('密码已修改～');
    document.getElementById('set-old-pwd').value = '';
    document.getElementById('set-new-pwd').value = '';
    document.getElementById('set-new-pwd2').value = '';
    notifyDataChanged();
  });

  // 导出数据
  document.getElementById('btn-export').addEventListener('click', async () => {
    const records = await getRecordsByDateRange('2000-01-01', '2099-12-31', currentUser.id);
    const foods = await getAllFoods(currentUser.id);
    const data = {
      exportTime: new Date().toISOString(),
      user: { ...currentUser, password: '[REDACTED]' },
      records,
      customFoods: foods.filter(f => f.isCustom),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `甜甜饮食_备份_${todayStr()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('数据导出成功～');
  });

  // 清除数据
  document.getElementById('btn-clear-data').addEventListener('click', async () => {
    const ok1 = await showConfirm('确定要清除所有记录吗？建议先导出备份。');
    if (!ok1) return;
    const ok2 = await showConfirm('再次确认：清除后数据不可恢复！');
    if (!ok2) return;

    const records = await getRecordsByDateRange('2000-01-01', '2099-12-31', currentUser.id);
    for (const r of records) {
      await deleteRecord(r.id);
    }
    // 删除自定义食物
    const foods = await getAllFoods(currentUser.id);
    for (const f of foods) {
      if (f.isCustom) await deleteCustomFood(f.id);
    }
    showToast('所有数据已清除');
    notifyDataChanged();
  });

  // 退出登录
  document.getElementById('btn-logout').addEventListener('click', logout);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
