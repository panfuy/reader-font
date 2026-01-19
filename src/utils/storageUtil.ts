
/**
 * 存储工具默认配置
 */
export const storageConfig = {
  storageFontDatasKey: 'font-icons-',
  storageFileNames: 'font-icons-saved-file-names'
};

/**
 * 全局配置（兼容旧代码）
 */
export const globalConfig = storageConfig;


/**
 * 获取安全的localStorage键名
 * @param filename 文件名
 * @returns 处理后的安全键名
 */
export function getSafeStorageKey(filename: string): string {
  // 移除文件路径，只保留文件名
  const basename = filename.split('/').pop() || filename;
  // 替换特殊字符，确保键名安全
  const safeName = basename.replace(/[^a-zA-Z0-9._-]/g, '_');
  // 限制长度，防止过长
  const maxLength = 50;
  if (safeName.length <= maxLength) {
    return `${globalConfig.storageFontDatasKey}${safeName}`;
  }
  // 如果过长，从后往前截取，保留文件后缀和有辨识度的部分
  const hash = btoa(safeName).substring(0, 8);
  // 从后往前截取，保留文件名的后半部分
  const truncatedName = safeName.slice(-(maxLength - 10));
  return `${globalConfig.storageFontDatasKey}${truncatedName}-${hash}`;
}

/**
 * 获取已保存的图标文件名集合
 * @returns 已保存的图标文件名数组
 */
export function getSavedFileNameData(): string[] {
    // 从缓存读取文件名集合
    let savedFileNames: string[] = [];
    try{
        // 尝试从localStorage获取已保存的文件名集合
        const existingData = localStorage.getItem(globalConfig.storageFileNames);
        if (existingData) {
        savedFileNames = JSON.parse(existingData);
        console.log(`Loaded saved file names: ${savedFileNames}`);
        }
    } catch (error) {
        console.error('Failed to load saved file names:', error);
    }
    return savedFileNames;
}

/**
 * 保存图标文件名到localStorage
 * @param filename 图标文件名
 */
export function saveFileNameData(filename: string): void {
    // 从缓存读取文件名集合
    let savedFileNames: string[] = getSavedFileNameData();
    // 如果文件名已存在时跳过
    if (savedFileNames.includes(filename)) {
        return;
    }
    // 如果文件名不在集合中，则添加
    savedFileNames.push(filename);
    console.log(`Added new file name: ${filename}`);
    // 保存更新后的文件名集合
    localStorage.setItem(globalConfig.storageFileNames, JSON.stringify(savedFileNames));
    console.log(`Saved updated file names: ${savedFileNames}`);
}

/**
 * 图标属性类型定义
 */
export type IconProps = {
  unicode: number;
  iconName: string;
  viewBox: string;
  svgPath: string;
  isEditing?: boolean;
  editingName?: string;
};

/**
 * 从localStorage加载保存的图标数据
 * @param filename 图标文件名
 * @returns 图标数据数组
 */
export function getFontData(filename: string):IconProps[] {
    try{
        // 获取安全的存储键名
        const storageKey = getSafeStorageKey(filename);
        // 从localStorage加载数据
        const storedData = localStorage.getItem(storageKey);
        if (storedData) {
        const savedIcons:IconProps[] = JSON.parse(storedData);
        console.log(`Loaded saved icon data for ${filename} using key: ${storageKey}`);
        return savedIcons; // 成功加载
        }
    } catch (error) {
        console.error('Failed to load saved icon data:', error);
    }
    return []; // 失败加载
}

/**
 * 保存图标数据到localStorage
 * @param filename 图标文件名
 * @param iconProps 图标数据数组
 */
export function saveFontData(filename: string, iconProps: IconProps[]): void {
    // 获取安全的存储键名
    const storageKey = getSafeStorageKey(filename);
    // 保存数据到localStorage
    localStorage.setItem(storageKey, JSON.stringify(iconProps));
    console.log(`Saved icon data for ${filename} using key: ${storageKey}`);
}

export function deleteStorageData(filename: string): void {
    // 获取安全的存储键名
    const storageKey = getSafeStorageKey(filename);
    // 删除字体数据
    localStorage.removeItem(storageKey);
    // 删除文件名
    const savedFileNames = getSavedFileNameData();
    const index = savedFileNames.indexOf(filename);
    if (index !== -1) {
        savedFileNames.splice(index, 1);
        localStorage.setItem(globalConfig.storageFileNames, JSON.stringify(savedFileNames));
    }
    console.log(`Deleted icon data for ${filename} using key: ${storageKey}, saved file names: `, savedFileNames);
}