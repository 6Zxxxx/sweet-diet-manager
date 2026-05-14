/* ============================================
   云端同步 - 跨设备数据互通
   基于 jsonblob.com 免费 API
   每个用户一个 blob，用户名索引用于查找
   ============================================ */

const CLOUD_BASE = 'https://jsonblob.com/api/jsonBlob';

// 索引 blob ID - 存储用户名到用户blob的映射
// 初始为空，首次注册时自动创建
let _indexBlobId = '';

async function getIndexBlobId() {
  if (_indexBlobId) return _indexBlobId;
  _indexBlobId = localStorage.getItem('sd_index_bid') || '';
  return _indexBlobId;
}

async function setIndexBlobId(id) {
  _indexBlobId = id;
  localStorage.setItem('sd_index_bid', id);
}

// ============================================
//  获取/创建用户名索引
// ============================================
async function loadIndex() {
  const bid = await getIndexBlobId();
  if (!bid) return {};
  try {
    const r = await fetch(`${CLOUD_BASE}/${bid}`, { headers: { 'Accept': 'application/json' } });
    if (r.ok) return await r.json();
    if (r.status === 404) { _indexBlobId = ''; localStorage.removeItem('sd_index_bid'); }
    return {};
  } catch (e) { return {}; }
}

async function saveIndex(index) {
  const bid = await getIndexBlobId();
  try {
    if (bid) {
      await fetch(`${CLOUD_BASE}/${bid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(index),
      });
    }
  } catch (e) { /* 非关键错误 */ }
}

async function createIndex(index) {
  try {
    const r = await fetch(CLOUD_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(index),
    });
    if (r.ok) {
      const loc = r.headers.get('Location');
      if (loc) {
        const bid = loc.split('/').pop();
        await setIndexBlobId(bid);
        return bid;
      }
    }
  } catch (e) { /* 重试 */ }
  return null;
}

// ============================================
//  云端 API
// ============================================
async function initCloud() {
  return true; // jsonblob 无需初始化
}

async function cloudRegister(username, passwordHash, profile) {
  const userBlob = {
    type: 'user',
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
  let userBlobId;
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(CLOUD_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(userBlob),
      });
      if (r.ok) {
        const loc = r.headers.get('Location');
        if (loc) { userBlobId = loc.split('/').pop(); break; }
      }
    } catch (e) { if (i === 2) throw e; }
    await sleep(500);
  }
  if (!userBlobId) throw new Error('云端创建失败');

  // 更新索引
  let index = await loadIndex();
  if (index[username]) throw new Error('用户名已存在');

  index[username] = userBlobId;
  let indexBid = await getIndexBlobId();
  if (!indexBid) {
    indexBid = await createIndex(index);
    if (!indexBid) throw new Error('索引创建失败');
  }
  await saveIndex(index);

  // 保存本地 token
  const token = username + ':::' + userBlobId;
  localStorage.setItem('cloud_token', token);
  return userBlobId;
}

async function cloudLogin(username, passwordHash) {
  // 查找用户 blob
  const index = await loadIndex();
  let blobId = index[username];

  // 也检查本地 token
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

    const token = username + ':::' + blobId;
    localStorage.setItem('cloud_token', token);
    return { id: blobId, ...data };
  } catch (e) {
    return null;
  }
}

async function cloudGetUser(userId) {
  const token = localStorage.getItem('cloud_token');
  if (!token) return null;
  const blobId = token.split(':::')[1];

  try {
    const r = await fetch(`${CLOUD_BASE}/${blobId}`, {
      headers: { 'Accept': 'application/json' },
    });
    if (!r.ok) return null;
    const d = await r.json();
    return {
      id: userId,
      username: d.username,
      password: d.password,
      height: d.height, weight: d.weight,
      age: d.age, gender: d.gender,
      createdAt: d.createdAt,
    };
  } catch (e) { return null; }
}

// 获取完整数据
async function cloudGetFullData() {
  const token = localStorage.getItem('cloud_token');
  if (!token) return null;
  const blobId = token.split(':::')[1];

  try {
    const r = await fetch(`${CLOUD_BASE}/${blobId}`, {
      headers: { 'Accept': 'application/json' },
    });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) { return null; }
}

// 保存完整数据
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

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
