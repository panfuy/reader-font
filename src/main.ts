/*
 * @Author: zi.yang
 * @Date: 2024-12-05 09:23:18
 * @LastEditors: zi.yang
 * @LastEditTime: 2024-12-14 22:56:05
 * @Description: 
 * @FilePath: /reader-font/src/main.ts
 */
import './style.css';

import { createApp } from 'vue';

import App from './App.vue';

// 全局配置
const globalConfig = {
  storageFontDatasKey: 'font-icons-',
  storageFileNames: 'font-icons-saved-file-names'
};

const app = createApp(App);
// 提供全局配置
app.provide('globalConfig', globalConfig);
app.mount('#app')
