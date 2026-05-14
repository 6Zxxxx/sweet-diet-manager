/* ============================================
   IndexedDB 数据库操作封装
   ============================================ */

const DB_NAME = 'SweetDietDB';
const DB_VERSION = 1;

let db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = function(e) {
      const db = e.target.result;

      // users 表
      if (!db.objectStoreNames.contains('users')) {
        const usersStore = db.createObjectStore('users', { keyPath: 'id', autoIncrement: true });
        usersStore.createIndex('username', 'username', { unique: true });
      }

      // foods 表
      if (!db.objectStoreNames.contains('foods')) {
        const foodsStore = db.createObjectStore('foods', { keyPath: 'id', autoIncrement: true });
        foodsStore.createIndex('category', 'category', { unique: false });
        foodsStore.createIndex('userId', 'userId', { unique: false });
      }

      // dailyRecords 表
      if (!db.objectStoreNames.contains('dailyRecords')) {
        const recordsStore = db.createObjectStore('dailyRecords', { keyPath: 'id', autoIncrement: true });
        recordsStore.createIndex('date', 'date', { unique: false });
        recordsStore.createIndex('userId', 'userId', { unique: false });
        recordsStore.createIndex('dateUser', ['date', 'userId'], { unique: false });
      }
    };

    request.onsuccess = function(e) {
      db = e.target.result;
      resolve(db);
    };

    request.onerror = function(e) {
      console.error('IndexedDB 打开失败:', e.target.error);
      reject(e.target.error);
    };
  });
}

// 通用 CRUD
function dbPut(storeName, data) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(data);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function dbGet(storeName, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function dbGetAll(storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function dbDelete(storeName, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function dbGetByIndex(storeName, indexName, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(value);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ============================================
//  用户相关
// ============================================

async function createUser(userData) {
  const existing = await dbGetByIndex('users', 'username', userData.username);
  if (existing.length > 0) {
    throw new Error('用户名已存在');
  }
  const id = await dbPut('users', userData);
  return { ...userData, id };
}

async function loginUser(username, passwordHash) {
  const users = await dbGetByIndex('users', 'username', username);
  if (users.length === 0) return null;
  const user = users[0];
  if (user.password !== passwordHash) return null;
  return user;
}

async function updateUser(user) {
  if (dbReady) await dbPut('users', user);
  // 同步到云端
  if (useCloud) {
    try {
      const data = await cloudGetFullData();
      if (data) {
        data.height = user.height;
        data.weight = user.weight;
        data.age = user.age;
        data.gender = user.gender;
        await cloudSaveFullData(data);
      }
    } catch (e) {}
  }
  return user;
}

// ============================================
//  食物相关
// ============================================

async function getAllFoods(userId) {
  // 预置食物总是可用
  let presetFoods = [];
  if (dbReady) {
    presetFoods = await dbGetByIndex('foods', 'userId', 0);
  }
  // 如果数据库不可用，直接从 PRESET_FOODS 返回
  if (presetFoods.length === 0) {
    presetFoods = PRESET_FOODS.map((f, i) => ({ ...f, id: -i - 1 }));
  }

  // 本地自定义食物
  let userFoods = [];
  if (dbReady) {
    userFoods = await dbGetByIndex('foods', 'userId', userId);
  }

  // 云端自定义食物
  let cloudFoods = [];
  if (useCloud) {
    try {
      const data = await cloudGetFullData();
      if (data && data.customFoods) {
        cloudFoods = data.customFoods;
      }
    } catch (e) {}
  }

  return [...presetFoods, ...userFoods, ...cloudFoods];
}

async function addCustomFood(food) {
  food.isCustom = true;
  const result = dbReady ? await dbPut('foods', food) : food;
  // 同步到云端
  if (useCloud) {
    try {
      const data = await cloudGetFullData();
      if (data) {
        data.customFoods = data.customFoods || [];
        data.customFoods.push(food);
        await cloudSaveFullData(data);
      }
    } catch (e) {}
  }
  return result;
}

async function deleteCustomFood(foodId) {
  const food = await dbGet('foods', foodId);
  if (food && food.isCustom) {
    await dbDelete('foods', foodId);
    return true;
  }
  return false;
}

// ============================================
//  饮食记录相关
// ============================================

function _genId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
}

function _mergeRecords(localRecords, cloudRecords) {
  // 用 (date, mealType, foodId, servings) 去重
  const seen = new Set();
  const merged = [];
  for (const r of [...localRecords, ...cloudRecords]) {
    const key = `${r.date}|${r.mealType}|${r.foodId}|${r.servings}`;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(r);
    }
  }
  return merged;
}

async function addRecord(record) {
  // 统一使用时间戳+随机ID，确保跨设备唯一
  if (!record.id || typeof record.id === 'number') record.id = _genId();
  if (!record.syncedAt) record.syncedAt = new Date().toISOString();
  const result = dbReady ? await dbPut('dailyRecords', record) : record;
  // 云端同步
  if (useCloud) {
    cloudAddRecord(record).catch(() => {});
  }
  return result;
}

async function getRecordsByDate(dateStr, userId) {
  const localRecords = [];
  const cloudRecords = [];

  // 本地数据
  if (dbReady) {
    try {
      const all = await dbGetByIndex('dailyRecords', 'date', dateStr);
      localRecords.push(...all.filter(r => r.userId === userId));
    } catch (e) {}
  }

  // 云端数据
  if (useCloud) {
    try {
      const cloudData = await cloudGetFullData();
      if (cloudData && cloudData.records) {
        cloudRecords.push(...cloudData.records.filter(r => r.date === dateStr));
      }
    } catch (e) {}
  }

  return _mergeRecords(localRecords, cloudRecords);
}

async function deleteRecord(recordId) {
  if (dbReady) {
    try { await dbDelete('dailyRecords', recordId); } catch (e) {}
  }
  if (useCloud) {
    cloudDeleteRecord(recordId).catch(() => {});
  }
}

async function getRecordsByDateRange(startDate, endDate, userId) {
  const localRecords = [];
  const cloudRecords = [];

  if (dbReady) {
    try {
      const all = await dbGetAll('dailyRecords');
      localRecords.push(...all.filter(r =>
        r.userId === userId && r.date >= startDate && r.date <= endDate
      ));
    } catch (e) {}
  }

  if (useCloud) {
    try {
      const cloudData = await cloudGetFullData();
      if (cloudData && cloudData.records) {
        cloudRecords.push(...cloudData.records.filter(r =>
          r.date >= startDate && r.date <= endDate
        ));
      }
    } catch (e) {}
  }

  return _mergeRecords(localRecords, cloudRecords);
}

// ============================================
//  初始化预置食物库
// ============================================

async function initPresetFoods() {
  const existing = await dbGetByIndex('foods', 'userId', 0);
  if (existing.length === 0) {
    for (const food of PRESET_FOODS) {
      await dbPut('foods', food);
    }
    console.log(`已初始化 ${PRESET_FOODS.length} 种预置食物`);
  }
}
