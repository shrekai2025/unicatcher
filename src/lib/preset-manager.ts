export interface FilterPreset {
  id: string;
  name: string;
  listId: string;
  createdAt: number;
}

const STORAGE_KEY = 'unicatcher-filter-presets';

export class PresetManager {
  /**
   * 获取所有预制项目
   */
  static getPresets(): FilterPreset[] {
    if (typeof window === 'undefined') return [];
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      
      const presets = JSON.parse(stored) as FilterPreset[];
      // 按创建时间倒序排列
      return presets.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      console.error('获取预制项目失败:', error);
      return [];
    }
  }

  /**
   * 添加新的预制项目
   */
  static addPreset(preset: Omit<FilterPreset, 'id' | 'createdAt'>): FilterPreset {
    const newPreset: FilterPreset = {
      id: `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...preset,
      createdAt: Date.now(),
    };

    const presets = this.getPresets();
    presets.push(newPreset);
    
    this.savePresets(presets);
    return newPreset;
  }

  /**
   * 删除预制项目
   */
  static deletePreset(presetId: string): void {
    const presets = this.getPresets();
    const filteredPresets = presets.filter(preset => preset.id !== presetId);
    this.savePresets(filteredPresets);
  }

  /**
   * 根据ID获取预制项目
   */
  static getPresetById(presetId: string): FilterPreset | undefined {
    const presets = this.getPresets();
    return presets.find(preset => preset.id === presetId);
  }

  /**
   * 检查listId是否已存在于预制中
   */
  static isListIdExists(listId: string): boolean {
    const presets = this.getPresets();
    return presets.some(preset => preset.listId === listId);
  }

  /**
   * 保存预制项目到localStorage
   */
  private static savePresets(presets: FilterPreset[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
    } catch (error) {
      console.error('保存预制项目失败:', error);
      throw new Error('保存预制项目失败');
    }
  }

  /**
   * 清空所有预制项目
   */
  static clearAllPresets(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('清空预制项目失败:', error);
    }
  }

  /**
   * 导出预制项目（用于备份）
   */
  static exportPresets(): string {
    const presets = this.getPresets();
    return JSON.stringify(presets, null, 2);
  }

  /**
   * 导入预制项目（用于恢复）
   */
  static importPresets(presetsJson: string): void {
    try {
      const presets = JSON.parse(presetsJson) as FilterPreset[];
      
      // 验证数据格式
      const validPresets = presets.filter(preset => 
        preset.id && 
        preset.name && 
        preset.listId && 
        typeof preset.createdAt === 'number'
      );

      this.savePresets(validPresets);
    } catch (error) {
      console.error('导入预制项目失败:', error);
      throw new Error('导入预制项目失败：格式错误');
    }
  }
}