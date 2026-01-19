<!--
 * @Author: zi.yang
 * @Date: 2024-12-09 11:34:25
 * @LastEditors: zi.yang
 * @LastEditTime: 2024-12-09 19:39:32
 * @Description: 字体列表
 * @FilePath: /reader-font/src/components/icon-list.vue
-->
<script setup lang="ts">
import { ref, Ref, useTemplateRef, watchEffect, computed } from 'vue';
import { NButton, NInput, NInputGroup, NModal, NSpace, useMessage } from 'naive-ui';
import type { Font, GlyphSet } from 'opentype.js';
import iconDetail from './icon-detail.vue';
import { getSafeStorageKey, saveFileNameData, IconProps, getFontData, saveFontData } from '../utils/storageUtil';
import JSZip from 'jszip';

const props = defineProps<{ font: Font|undefined|null; filename?: string }>();

const allIconList: Ref<IconProps[]> = ref([]);
const iconList: Ref<IconProps[]> = ref([]);

// 计算属性：判断当前文件数据是否已保存到localStorage
const isDataSaved = computed(() => {
  if (!props.filename) return false;
  try {
    const storageKey = getSafeStorageKey(props.filename);
    return localStorage.getItem(storageKey) !== null;
  } catch (error) {
    console.error('Failed to check if data is saved:', error);
    return false;
  }
});

/**
 * 从localStorage加载保存的图标数据
 * @returns 是否成功加载了缓存数据
 */
function loadSavedIconData(): boolean {
  if (!props.filename) return false;
  
  try {
    const savedIcons:IconProps[] = getFontData(props.filename);
    if (savedIcons && savedIcons.length > 0) {
      console.log(`Loaded saved icon data for ${props.filename}`);
      allIconList.value = savedIcons;
      iconList.value = savedIcons;
      return true; // 成功加载
    }
  } catch (error) {
    console.error('Failed to load saved icon data:', error);
    message.error('加载保存的图标数据失败：' + (error instanceof Error ? error.message : '未知错误'));
  }
  return false; // 加载失败
}

/**
 * 从给定的字体生成图标列表。
 *
 * @param font 包含字形的字体对象。
 * @returns 图标属性数组。
 */
function generatorIconList(font: Font) {
  const genIconList: IconProps[] = [];
  if (!font?.glyphs) return genIconList;
  const glyphs: GlyphSet = font.glyphs;
  for (let i = 0; i < glyphs.length; i++) {
    const glyph = glyphs.get(i);
    if (!glyph.unicode) continue;
    const path = glyph.getPath();
    const { x1, y1, x2, y2 } = path.getBoundingBox();
    genIconList.push({
      unicode: glyph.unicode,
      iconName: glyph.name || '',
      viewBox: `${x1} ${y1} ${x2 - x1} ${y2 - y1}`,
      svgPath: path.toSVG(2),
      isEditing: false,
      editingName: glyph.name || '',
    });
  }
  return genIconList;
}
/**
 * 观察字体的变化并更新图标列表。
 */
watchEffect(() => {
  // 优先尝试从缓存加载数据
  const hasLoadedFromCache = loadSavedIconData();
  
  // 如果成功加载了缓存数据，就不再从props生成
  if (hasLoadedFromCache) {
    console.log(`Successfully loaded icon data from cache for ${props.filename}`);
    return;
  }
  // 确保字体对象存在
  if (!props.font) {
    console.log('No font provided, clearing icon list');
    allIconList.value = [];
    iconList.value = [];
    return;
  }
  
  // 如果没有缓存数据，从props生成图标列表
  console.log(`Generating icon list for ${props.filename}`);
  const newIcons = generatorIconList(props.font);
  allIconList.value = newIcons;
  iconList.value = newIcons;
});

const iconDetailRef = useTemplateRef('iconDetailRef');

/**
 * 打开所选图标的图标详细弹窗。
 *
 * @param icon 要显示在详细弹窗中的图标。
 */
function handleOpenEdit(icon: IconProps) {
  iconDetailRef.value?.openModal(icon);
}

// 下载全部弹窗相关
const isDownloadModalVisible = ref(false);
const message = useMessage();
const isDownloading = ref(false); // 防止重复点击的状态

/**
 * 打开下载全部弹窗
 */
function openDownloadModal() {
  isDownloadModalVisible.value = true;
}

/**
 * 保存图标数据到localStorage
 */
function handleSave() {
  if (!props.filename) {
    message.error('无法保存：缺少文件名');
    return;
  }
  
  try {
    // 直接保存当前文件的图标数据，每个文件对应一个独立的localStorage项
    saveFontData(props.filename, allIconList.value);
    // 将暂存的文件名存起来
    saveFileNameData(props.filename);
    
    message.success(`成功保存 ${props.filename} 的图标数据`);
  } catch (error) {
    console.error('Failed to save icon data:', error);
    message.error('保存失败：' + (error instanceof Error ? error.message : '未知错误'));
  }
}

/**
 * 下载全部图标为SVG
 */
function downloadAllSvg() {
  // 防止重复点击
  if (isDownloading.value) return;
  isDownloading.value = true;
  
  console.log('Downloading all icons as SVG...');
  const zip = new JSZip();
  
  try {
    // 遍历所有图标，添加到zip文件中
    allIconList.value.forEach(icon => {
      // 生成完整的SVG内容
      const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${icon.viewBox}" width="1024" height="1024">
${icon.svgPath}
</svg>`;
      // 添加到zip文件
      zip.file(`${icon.iconName || `icon_${icon.unicode}`}.svg`, svgContent);
    });
    
    // 生成zip文件并下载
    zip.generateAsync({ type: 'blob' }).then(content => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      // 使用当前解析的ttf文件名称作为zip文件名
      const baseFilename = props.filename ? props.filename.replace(/\.[^/.]+$/, '') : 'icons-svg';
      link.download = `${baseFilename}-svg.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      message.success('SVG图标下载成功');
    }).catch(error => {
      console.error('Failed to download SVG icons:', error);
      message.error('SVG图标下载失败');
    }).finally(() => {
      setTimeout(() => {
        // 重置状态
        isDownloading.value = false;
        // isDownloadModalVisible.value = false;
      }, 3000);
    });
  } catch (error) {
    console.error('Failed to download SVG icons:', error);
    message.error('SVG图标下载失败');
    // 重置状态
    isDownloading.value = false;
    // isDownloadModalVisible.value = false;
  }
}

/**
 * 将SVG内容转换为base64 URL
 * @param svgContent SVG内容
 * @returns base64 URL
 */
/**
 * 将单个SVG转换为PNG
 * @param icon 图标对象
 * @returns Promise<Blob> PNG的Blob对象
 */
function svgToPng(icon: IconProps): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      // 生成完整的SVG内容，确保格式正确
      const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${icon.viewBox}" width="1024" height="1024">
${icon.svgPath}
</svg>`;
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('Canvas context not available'));
        return;
      }
      
      const width = 1024;
      canvas.width = width;
      canvas.height = width;
      
      // 设置背景透明
      context.fillStyle = 'transparent';
      context.fillRect(0, 0, canvas.width, canvas.height);
      
      const image = new Image();
      // 解决跨域问题
      image.crossOrigin = 'anonymous';
      // 使用encodeURIComponent处理SVG内容，避免字符编码问题
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgContent)}`;
      
      image.onload = () => {
        try {
          // 绘制图像
          context.drawImage(image, 0, 0, width, width);
          // 将canvas转换为Blob对象
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob from canvas'));
            }
            // 清理资源
            canvas.remove();
          }, 'image/png', 1.0);
        } catch (error) {
          reject(error);
          canvas.remove();
        }
      };
      
      image.onerror = (error) => {
        reject(new Error(`Failed to load image: ${error}`));
        canvas.remove();
      };
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * 下载全部图标为PNG
 */
async function downloadAllPng() {
  // 防止重复点击
  if (isDownloading.value) return;
  isDownloading.value = true;
  
  console.log('Downloading all icons as PNG...');
  const zip = new JSZip();
  
  try {
    // 遍历所有图标，转换为PNG并添加到zip文件中
    const promises = allIconList.value.map(async (icon) => {
      try {
        // 直接获取Blob对象
        const pngBlob = await svgToPng(icon);
        // 直接将Blob添加到zip文件
        zip.file(`${icon.iconName || `icon_${icon.unicode}`}.png`, pngBlob);
      } catch (error) {
        console.error(`Failed to convert icon ${icon.iconName || icon.unicode} to PNG:`, error);
        // 跳过转换失败的图标，继续转换其他图标
      }
    });
    
    // 等待所有转换完成
    await Promise.all(promises);
    
    // 检查是否有转换成功的图标
    const zipFiles = Object.keys(zip.files);
    if (zipFiles.length === 0) {
      throw new Error('No icons were converted to PNG successfully');
    }
    
    // 生成zip文件并下载
    zip.generateAsync({ type: 'blob' }).then(content => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      // 使用当前解析的ttf文件名称作为zip文件名
      const baseFilename = props.filename ? props.filename.replace(/\.[^/.]+$/, '') : 'icons-png';
      link.download = `${baseFilename}-png.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      message.success('PNG图标下载成功');
    }).catch(error => {
      console.error('Failed to generate PNG zip:', error);
      message.error('PNG图标下载失败');
    }).finally(() => {
      setTimeout(() => {
        // 重置状态
        isDownloading.value = false;
      }, 3000);
    });
  } catch (error) {
    console.error('Failed to convert icons to PNG:', error);
    message.error('PNG图标转换失败');
    // 重置状态
    isDownloading.value = false;
  }
}

/**
 * 根据搜索文本过滤图标列表。
 *
 * @param text 要过滤图标的名称。
 */
function handleSearch(text: string) {
  iconList.value = allIconList.value.filter((item) =>
    item.iconName.toLowerCase().includes(text.toLowerCase())
  );
}

/**
 * 开始编辑图标名称
 */
function startEditing(icon: IconProps) {
  // 先关闭所有其他图标项的编辑状态
  iconList.value.forEach(item => {
    item.isEditing = false;
  });
  // 开始编辑当前图标项
  icon.isEditing = true;
  icon.editingName = icon.iconName;
}

/**
 * 完成编辑图标名称
 */
function finishEditing(icon: IconProps) {
  if (icon.editingName?.trim()) {
    icon.iconName = icon.editingName.trim();
  }
  icon.isEditing = false;
}

/**
 * 取消编辑图标名称
 */
function cancelEditing(icon: IconProps) {
  icon.isEditing = false;
}
</script>

<template>
  <div style="display: flex; flex-direction: column; height: 100%;">
    <!-- 固定操作栏 -->
    <div class="fixed-action-bar">
      <n-input-group style="justify-content: left">
        <n-button size="small" style="padding: 4px 12px;" @click="handleSave"
          :type="isDataSaved ? 'primary' : undefined" :ghost="isDataSaved ? true : false">暂存</n-button>&nbsp;&nbsp;
        <n-button size="small" style="padding: 4px 12px;" @click="openDownloadModal">下载全部</n-button>&nbsp;&nbsp;
        <n-input size="small" style="width: 200px" @change="handleSearch" placeholder="请输入名称"></n-input>
        <n-button size="small" ghost type="primary">搜索</n-button>
      </n-input-group>
    </div>

    <!-- 图标列表区域 -->
    <div class="icon-list-container">
      <ul class="icon-list--wrapper">
        <li v-for="svg of iconList" :key="svg.unicode" class="icon--item">
          <div class="icon--item-box" @click="handleOpenEdit(svg)">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              :viewBox="svg.viewBox"
              style="width: 100%; height: 100%"
              v-html="svg.svgPath"
            ></svg>
          </div>
          <div v-if="!svg.isEditing" @click="startEditing(svg)" class="icon-name">{{ svg.iconName }}</div>
          <n-input
            v-else
            v-model:value="svg.editingName"
            size="small"
            @blur="finishEditing(svg)"
            @keyup.enter="finishEditing(svg)"
            @keyup.esc="cancelEditing(svg)"
            autofocus
            style="width: 120px;"
          />
        </li>
      </ul>
    </div>
  </div>
  <icon-detail ref="iconDetailRef"></icon-detail>
  
  <!-- 下载全部弹窗 -->
  <n-modal
    v-model:show="isDownloadModalVisible"
    preset="card"
    :style="{ width: '400px' }"
    title="下载全部图标"
    size="medium"
    :bordered="false"
  >
    <div class="download-modal-content">
      <div style="margin-top: 20px">
        <n-space justify="center" size="large">
          <n-button type="primary" @click="downloadAllSvg" :disabled="isDownloading">下载 SVG</n-button>
          <n-button type="primary" @click="downloadAllPng" :disabled="isDownloading">下载 PNG</n-button>
        </n-space>
      </div>
    </div>
  </n-modal>
</template>

<style lang="scss" scoped>
/* 固定操作栏样式 */
.fixed-action-bar {
  padding: 0 10px 10px 10px;
  border-bottom: 1px solid #e2e2e2;
  box-sizing: border-box;
}

/* 图标列表容器样式 */
.icon-list-container {
  flex: 1;
  width: 100%;
  overflow-y: auto;
}

.icon-list--wrapper {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); /* 自动填充列，每列最小120px */
  grid-gap: 16px; /* 网格间距 */
  margin: 0 auto;
  padding: 16px;
  width: 100%;
  max-width: 100%; /* 取消最大宽度限制，充分利用屏幕空间 */
  justify-content: center;
  box-sizing: border-box; /* 确保padding不会增加总宽度 */
  overflow-x: hidden; /* 防止水平滚动 */
  
  /* 添加max-width限制，确保在极宽屏幕上也不会过于分散 */
  max-width: 2000px;
}

.icon--item {
  list-style: none;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  padding: 16px;
  margin: 0; /* 移除margin，使用grid-gap控制间距 */

  &-box {
    width: 30px;
    height: 30px;
    margin-bottom: 16px;
    cursor: pointer;

    &:hover > svg {
      fill: orange;
    }
  }

  .icon-name {
    cursor: pointer;
    padding: 2px 4px;
    border-radius: 2px;
    transition: all 0.2s ease;

    &:hover {
      background-color: #e6f7ff;
      color: #1890ff;
    }
  }
}

svg {
  fill: #fff;
  transition: fill 0.3s ease;
}

@media (prefers-color-scheme: light) {
  svg {
    fill: #000;
  }
}
</style>
