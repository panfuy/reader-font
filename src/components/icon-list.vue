<!--
 * @Author: zi.yang
 * @Date: 2024-12-09 11:34:25
 * @LastEditors: zi.yang
 * @LastEditTime: 2024-12-09 19:39:32
 * @Description: 字体列表
 * @FilePath: /reader-font/src/components/icon-list.vue
-->
<script setup lang="ts">
import { ref, Ref, useTemplateRef, watchEffect } from 'vue';

import { NButton, NInput, NInputGroup, NModal, NSpace, useMessage } from 'naive-ui';
import type { Font, GlyphSet } from 'opentype.js';

import iconDetail from './icon-detail.vue';
import JSZip from 'jszip';

type IconProps = {
  unicode: number;
  iconName: string;
  viewBox: string;
  svgPath: string;
  isEditing?: boolean;
  editingName?: string;
};

const props = defineProps<{ font: Font; filename?: string }>();

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

const allIconList: Ref<IconProps[]> = ref([]);
const iconList: Ref<IconProps[]> = ref([]);

/**
 * 观察字体的变化并更新图标列表。
 */
watchEffect(() => {
  allIconList.value = generatorIconList(props.font);
  iconList.value = allIconList.value;
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
      const baseFilename = props.filename ? props.filename.replace(/\.[^/.]+$/, '') : 'icons';
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
      const baseFilename = props.filename ? props.filename.replace(/\.[^/.]+$/, '') : 'icons';
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
        // isDownloadModalVisible.value = false;
      }, 3000);
    });
  } catch (error) {
    console.error('Failed to convert icons to PNG:', error);
    message.error('PNG图标转换失败');
    // 重置状态
    isDownloading.value = false;
    // isDownloadModalVisible.value = false;
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
  <div style="width: 80%; margin: 30px auto">
    <n-input-group style="justify-content: left">
      <n-button size="large" style="padding: 8px 16px;">暂存</n-button>&nbsp;&nbsp;
      <n-button size="large" style="padding: 8px 16px;" @click="openDownloadModal">下载全部</n-button>&nbsp;&nbsp;
      <n-input @change="handleSearch" style="width: 300px" size="large" placeholder="请输入名称"></n-input>
      <n-button type="primary" ghost size="large">搜索</n-button>
    </n-input-group>
  </div>

  <div style="width: 100%; max-height: 400px; overflow-y: auto;">
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
.icon-list--wrapper {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  margin: 0;
  padding: 0;
}

.icon--item {
  list-style: none;
  margin: 16px 0;
  width: 16%;
  min-width: 200px;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;

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
