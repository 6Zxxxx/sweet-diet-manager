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
  await dbPut('users', user);
  return user;
}

// ============================================
//  食物相关
// ============================================

async function getAllFoods(userId) {
  const presetFoods = await dbGetByIndex('foods', 'userId', 0);
  const userFoods = await dbGetByIndex('foods', 'userId', userId);
  return [...presetFoods, ...userFoods];
}

async function addCustomFood(food) {
  food.isCustom = true;
  return await dbPut('foods', food);
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

async function addRecord(record) {
  return await dbPut('dailyRecords', record);
}

async function getRecordsByDate(dateStr, userId) {
  const all = await dbGetByIndex('dailyRecords', 'date', dateStr);
  return all.filter(r => r.userId === userId);
}

async function deleteRecord(recordId) {
  await dbDelete('dailyRecords', recordId);
}

async function getRecordsByDateRange(startDate, endDate, userId) {
  const all = await dbGetAll('dailyRecords');
  return all.filter(r => {
    return r.userId === userId && r.date >= startDate && r.date <= endDate;
  });
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
