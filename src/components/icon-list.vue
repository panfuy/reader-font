<!--
 * @Author: zi.yang
 * @Date: 2024-12-09 11:34:25
 * @LastEditors: zi.yang
 * @LastEditTime: 2024-12-09 19:39:32
 * @Description: 字体列表
 * @FilePath: /reader-font/src/components/icon-list.vue
-->
<script setup lang="ts">
import { ref, Ref, useTemplateRef, watchEffect, onMounted, onUnmounted } from 'vue';

import { NButton, NInput, NInputGroup } from 'naive-ui';
import type { Font, GlyphSet } from 'opentype.js';

import iconDetail from './icon-detail.vue';

type IconProps = {
  unicode: number;
  iconName: string;
  viewBox: string;
  svgPath: string;
  isEditing?: boolean;
  editingName?: string;
};

const props = defineProps<{ font: Font }>();

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
      <n-button size="large" style="padding: 8px 16px;">下载全部</n-button>&nbsp;&nbsp;
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
