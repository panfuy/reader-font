<!--
 * @Author: zi.yang
 * @Date: 2024-12-05 09:23:18
 * @LastEditors: zi.yang
 * @LastEditTime: 2024-12-13 10:31:44
 * @Description: 
 * @FilePath: /reader-font/src/App.vue
-->
<script setup lang="ts">
import { ref, Ref } from 'vue';

import {
  NButton,
  NIcon,
  NMessageProvider,
  NP,
  NText,
  NTooltip,
  NUpload,
  NUploadDragger,
  UploadFileInfo,
} from 'naive-ui';
import opentype, { Font } from 'opentype.js';

import { ArchiveOutline as ArchiveIcon, LogoGithub } from '@vicons/ionicons5';

import iconList from './components/icon-list.vue';

const fontContent: Ref<Font | null> = ref(null);
const fileList = ref<UploadFileInfo[]>([]);
const currentFileIndex = ref(0);

function handleUploadChange(evt: any) {
  // 过滤掉重复的文件名
  const uniqueFiles: UploadFileInfo[] = [];
  const existingFileNames = new Set<string>();
  
  for (const file of evt) {
    if (!existingFileNames.has(file.name)) {
      existingFileNames.add(file.name);
      uniqueFiles.push(file);
    }
  }
  
  fileList.value = uniqueFiles;
  if (uniqueFiles.length > 0) {
    const currentFile = uniqueFiles[currentFileIndex.value];
    if (currentFile) {
      currentFile.file?.arrayBuffer().then(async (buffer: ArrayBuffer) => {
        fontContent.value = opentype.parse(await buffer);
      });
    }
  } else {
    fontContent.value = null;
  }
}

function handleRemove(_file: any, index: number) {
  console.log('handleRemove called, removing index:', index, 'currentFileIndex:', currentFileIndex.value);
  
  // 手动从fileList中移除指定索引的文件
  fileList.value.splice(index, 1);
  console.log('After splice, fileList length:', fileList.value.length);
  
  // 计算新的currentFileIndex
  let newIndex = currentFileIndex.value;
  if (index < currentFileIndex.value) {
    // 如果删除的文件在当前激活文件之前，当前索引减1
    newIndex--;
  } else if (index === currentFileIndex.value) {
    // 如果删除的是当前激活的文件
    if (currentFileIndex.value >= fileList.value.length) {
      // 如果是最后一个文件，切换到前一个文件
      newIndex = Math.max(0, fileList.value.length - 1);
    }
  }
  
  // 更新currentFileIndex
  currentFileIndex.value = newIndex;
  console.log('Updated currentFileIndex to:', currentFileIndex.value);
  
  if (fileList.value.length === 0) {
    // 文件列表为空，清空fontContent
    fontContent.value = null;
    console.log('fontContent cleared because fileList is empty');
  } else {
    // 更新fontContent为当前激活文件的内容
    const currentFile = fileList.value[currentFileIndex.value];
    if (currentFile && currentFile.file) {
      currentFile.file.arrayBuffer().then((buffer: ArrayBuffer) => {
        fontContent.value = opentype.parse(buffer);
        console.log('Font content updated to file:', currentFile.name);
      }).catch(error => {
        console.error('Failed to parse font file:', error);
        fontContent.value = null;
      });
    }
  }
}

function handleFileClick(index: number) {
  currentFileIndex.value = index;
  const currentFile = fileList.value[index];
  if (currentFile) {
    currentFile.file?.arrayBuffer().then(async (buffer: ArrayBuffer) => {
      fontContent.value = opentype.parse(await buffer);
    });
  }
}

</script>

<template>
  <n-message-provider>
    <header class="header">
      <div class="header--title">Reader Font</div>
      <div>
        <a href="https://github.com/Alessandro-Pang/reader-font" target="_blank" class="header--icon">
          <LogoGithub />
        </a>
      </div>
    </header>
    <div class="main-content">
      <div class="upload-section">
        <n-upload v-model:file-list="fileList" directory-dnd @update:file-list="handleUploadChange"
          accept=".ttf,.woff" multiple :show-file-list="false">
          <template #default>
            <n-upload-dragger>
              <div style="display: flex; align-items: center; gap: 12px">
              <n-icon size="48" :depth="3">
                <ArchiveIcon />
              </n-icon>
              <div style="display: flex; flex-direction: column;">
                <n-text style="font-size: 18px; text-align: left;">
                  点击或者拖动文件到该区域来上传
                </n-text>
                <n-p depth="3" style="margin: 4px 0 0 0;">
                  请上传字体文件, 目前仅支持 ttf, woff 格式字体文件
                </n-p>
              </div>
            </div>
            </n-upload-dragger>
          </template>
        </n-upload>
                 
        <!-- 自定义文件列表，用于显示上传的文件并支持点击切换 -->
        <div v-if="fileList.length > 0" class="custom-file-list">
          <n-tooltip v-for="(file, index) in fileList" :key="index" placement="top">
            <template #trigger>
              <div class="custom-file-item"
                :class="{ 'active': index === currentFileIndex }"
                @click="handleFileClick(index) "
              >
                <n-text>{{ file.name }}</n-text>
                <n-button size="small" text 
                  @click.stop="handleRemove(file, index) " >X</n-button>
              </div>
            </template>
            {{ file.name }}
          </n-tooltip>
        </div>
        
        <!-- 内容区域 -->
        <div v-if="fileList.length > 0" class="content-area">
          <icon-list v-if="fontContent" :font="fontContent" :filename="fileList[currentFileIndex]?.name" />
        </div>
      </div>
    </div>
  </n-message-provider>
</template>

<style lang="scss">
  /* 全局样式，确保整个页面不超过视口高度 */
  html, body {
    height: 100%;
    margin: 0;
    padding: 0;
    overflow: hidden;
  }
  
  #app {
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
</style>

<style lang="scss" scoped>
  .header {
    display: flex;
    justify-content: space-between;
    height: 50px;
    padding: 0 20px;
    line-height: 50px;
    border-bottom: 1px solid #e2e2e2;

    &--title {
      font-size: 24px;
      font-weight: 600;
    }

    &--icon {
      width: 26px;
      display: inline-block;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 50px;
      cursor: pointer;
    }
  }
  
  .main-content {
    width: 80%;
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: 20px 0;
    margin: 0 auto;
  }
  
  .upload-section {
    width: 100%;
  }
  
  .custom-file-list {
    display: flex;
    flex-wrap: nowrap;
    gap: 0;
    margin-top: 10px;
    padding: 0;
    overflow-x: auto;
    background-color: transparent;
    border: none;
    border-bottom: 1px solid #d9d9d9;
    border-radius: 0;
    transition: all 0.3s ease;
  }

  .custom-file-item {
    display: inline-flex;
    align-items: center;
    padding: 8px 16px;
    margin: 0;
    border: 1px solid #d9d9d9;
    border-bottom: none;
    border-radius: 8px 8px 0 0;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;
    max-width: 200px;
    background-color: #f5f5f5;
    position: relative;
    top: 1px;
    margin-right: -1px;
  }

  .custom-file-item .n-text {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-right: 4px;
    max-width: 150px;
    display: inline-block;
  }

  .custom-file-item:hover {
    background-color: #e6f7ff;
    color: #1890ff;
    border-color: #91d5ff;
    z-index: 2;
  }
  .custom-file-item.active {
    background-color: white;
    color: #1890ff;
    border-color: #d9d9d9;
    border-bottom-color: white;
    z-index: 3;
  }

  .custom-file-item .n-button { 
    margin-left: 6px;
    font-size: 12px;
    background-color: transparent;
    color: #999;
    padding: 4px;
  }

  .custom-file-item .n-button:hover {
    background-color: #ff4d4f;
    color: white;
  }

  /* 内容区域样式 */
  .content-area {
    margin-top: 0;
    padding: 20px;
    border: 1px solid #d9d9d9;
    border-top: none;
    border-radius: 0 0 8px 8px;
    background-color: white;
    flex: 1;
    overflow: auto;
  }

  .main-content {
    width: 80%;
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: 20px 0;
    margin: 0 auto;
  }

  .upload-section {
    width: 100%;
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: hidden;
  }
</style>
