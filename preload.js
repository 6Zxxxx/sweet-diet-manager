/* ============================================
   Electron 预加载脚本
   安全的上下文桥接（当前为空，应用使用纯浏览器 API）
   ============================================ */

const { contextBridge } = require('electron');

// 预留：未来可在此处暴露安全的 Node.js API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isElectron: true,
});
