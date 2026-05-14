/* ============================================
   云端同步 - 跨设备数据互通
   基于 jsonblob.com 免费 API
   ============================================ */

const CLOUD_BASE = 'https://jsonblob.com/api/jsonBlob';
// 固定索引 blob ID - 所有设备共享同一个索引
const INDEX_BLOB_ID = '019e26c4-c2dc-7d88-acbb-2cfc2774fc77';

// ============================================
//  索引操作（用户名 → 用户blobID映射）
// ============================================
async function loadIndex() {
  try {
    const r = await fetch(`${CLOUD_BASE}/${INDEX_BLOB_ID}`, {
      headers: { 'Accept': 'application/json' },
    });
    if (r.ok) return await r.json();
    return {};
  } catch (e) { return {}; }
}

async function saveIndex(index) {
  try {
    await fetch(`${CLOUD_BASE}/${INDEX_BLOB_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(index),
    });
  } catch (e) { console.warn('索引保存失败:', e.message); }
}

// ============================================
//  云端 API
// ============================================
async function initCloud() {
  return true;
}

async function cloudRegister(username, passwordHash, profile) {
  // 先检查用户名是否已存在
  const index = await loadIndex();
  if (index[username]) throw new Error('用户名已存在');

  const userBlob = {
    username,
    password: passwordHash,
    height: profile.height || 160,
    weight: profile.weight || 55,
    age: profile.age || 25,
    gender: profile.gender || 'female',
    createdAt: new Date().toISOString(),
    records: [],
    customFoods: [],
  };

  // 创建用户 blob
  const r = await fetch(CLOUD_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(userBlob),
  });
  if (!r.ok) throw new Error('云端创建失败');
  const loc = r.headers.get('Location');
  if (!loc) throw new Error('云端创建失败');
  const blobId = loc.split('/').pop();

  // 更新全局索引
  index[username] = blobId;
  await saveIndex(index);

  // 保存本地 token
  localStorage.setItem('cloud_token', username + ':::' + blobId);
  return blobId;
}

async function cloudLogin(username, passwordHash) {
  // 从全局索引查找
  const index = await loadIndex();
  let blobId = index[username];

  // 兜底：检查本地缓存的 token
  if (!blobId) {
    const saved = localStorage.getItem('cloud_token');
    if (saved && saved.startsWith(username + ':::')) {
      blobId = saved.split(':::')[1];
    }
  }
  if (!blobId) return null;

  // 获取用户数据
  try {
    const r = await fetch(`${CLOUD_BASE}/${blobId}`, {
      headers: { 'Accept': 'application/json' },
    });
    if (!r.ok) return null;
    const data = await r.json();
    if (data.password !== passwordHash) return null;

    localStorage.setItem('cloud_token', username + ':::' + blobId);
    return {
      id: blobId,
      username: data.username,
      password: data.password,
      height: data.height, weight: data.weight,
      age: data.age, gender: data.gender,
      createdAt: data.createdAt,
    };
  } catch (e) {
    return null;
  }
}

async function cloudGetUser(userId) {
  const token = localStorage.getItem('cloud_token');
  if (!token) return null;
  const blobId = token.split(':::')[1];

  try {
    const r = await fetch(`${CLOUD_BASE}/${blobId}`, { headers: { 'Accept': 'application/json' } });
    if (!r.ok) return null;
    const d = await r.json();
    return {
      id: userId, username: d.username, password: d.password,
      height: d.height, weight: d.weight, age: d.age, gender: d.gender,
      createdAt: d.createdAt,
    };
  } catch (e) { return null; }
}

async function cloudGetFullData() {
  const token = localStorage.getItem('cloud_token');
  if (!token) return null;
  const blobId = token.split(':::')[1];
  try {
    const r = await fetch(`${CLOUD_BASE}/${blobId}`, { headers: { 'Accept': 'application/json' } });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) { return null; }
}

async function cloudSaveFullData(data) {
  const token = localStorage.getItem('cloud_token');
  if (!token) return;
  const blobId = token.split(':::')[1];
  try {
    await fetch(`${CLOUD_BASE}/${blobId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch (e) { console.warn('云端保存失败:', e.message); }
}

async function cloudAddRecord(record) {
  const data = await cloudGetFullData();
  if (!data) return;
  data.records = data.records || [];
  data.records.push(record);
  await cloudSaveFullData(data);
}

async function cloudDeleteRecord(recordId) {
  const data = await cloudGetFullData();
  if (!data) return;
  // 同时按 id 和内容签名匹配删除（兼容本地/云端不同ID）
  data.records = (data.records || []).filter(r => {
    if (r.id === recordId) return false;          // 精确ID匹配
    if (String(r.id) === String(recordId)) return false; // 类型转换匹配
    return true;
  });
  await cloudSaveFullData(data);
}

async function cloudGetSession() {
  const token = localStorage.getItem('cloud_token');
  if (token) {
    const parts = token.split(':::');
    return parts.length === 2 ? parts[1] : null;
  }
  return null;
}

async function cloudSignOut() {
  localStorage.removeItem('cloud_token');
}
