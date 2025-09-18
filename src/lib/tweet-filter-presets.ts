/**
 * 推文筛选预制项管理器
 * 支持 listId 和用户名的预制配置，前端本地存储
 */

export interface ListIdPreset {
  id: string;
  name: string;
  listId: string;
  createdAt: number;
}

export interface UsernamePreset {
  id: string;
  name: string;
  username: string;
  createdAt: number;
}

const LIST_ID_STORAGE_KEY = 'tweet-processing-listid-presets';
const USERNAME_STORAGE_KEY = 'tweet-processing-username-presets';

export class TweetFilterPresets {
  // ========== ListId 预制项管理 ==========
  
  /**
   * 获取所有 ListId 预制项
   */
  static getListIdPresets(): ListIdPreset[] {
    if (typeof window === 'undefined') return [];
    
    try {
      const stored = localStorage.getItem(LIST_ID_STORAGE_KEY);
      if (!stored) return [];
      
      const presets = JSON.parse(stored) as ListIdPreset[];
      return presets.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      console.error('获取 ListId 预制项失败:', error);
      return [];
    }
  }

  /**
   * 添加 ListId 预制项
   */
  static addListIdPreset(preset: Omit<ListIdPreset, 'id' | 'createdAt'>): ListIdPreset {
    // 检查是否已存在相同的 listId
    const existing = this.getListIdPresets();
    if (existing.some(p => p.listId === preset.listId)) {
      throw new Error('该 List ID 已存在预制项中');
    }

    const newPreset: ListIdPreset = {
      id: `listid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...preset,
      createdAt: Date.now(),
    };

    const presets = existing;
    presets.push(newPreset);
    
    this.saveListIdPresets(presets);
    return newPreset;
  }

  /**
   * 删除 ListId 预制项
   */
  static deleteListIdPreset(presetId: string): void {
    const presets = this.getListIdPresets();
    const filteredPresets = presets.filter(preset => preset.id !== presetId);
    this.saveListIdPresets(filteredPresets);
  }

  /**
   * 更新 ListId 预制项
   */
  static updateListIdPreset(presetId: string, updates: Partial<Pick<ListIdPreset, 'name' | 'listId'>>): void {
    const presets = this.getListIdPresets();
    const index = presets.findIndex(p => p.id === presetId);
    
    if (index === -1) {
      throw new Error('预制项不存在');
    }

    // 检查是否与其他预制项的 listId 冲突
    if (updates.listId && updates.listId !== presets[index]!.listId) {
      if (presets.some(p => p.id !== presetId && p.listId === updates.listId)) {
        throw new Error('该 List ID 已存在预制项中');
      }
    }

    presets[index] = { ...presets[index]!, ...updates };
    this.saveListIdPresets(presets);
  }

  /**
   * 保存 ListId 预制项到 localStorage
   */
  private static saveListIdPresets(presets: ListIdPreset[]): void {
    try {
      localStorage.setItem(LIST_ID_STORAGE_KEY, JSON.stringify(presets));
    } catch (error) {
      console.error('保存 ListId 预制项失败:', error);
      throw new Error('保存预制项失败');
    }
  }

  // ========== Username 预制项管理 ==========
  
  /**
   * 获取所有用户名预制项
   */
  static getUsernamePresets(): UsernamePreset[] {
    if (typeof window === 'undefined') return [];
    
    try {
      const stored = localStorage.getItem(USERNAME_STORAGE_KEY);
      if (!stored) return [];
      
      const presets = JSON.parse(stored) as UsernamePreset[];
      return presets.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      console.error('获取用户名预制项失败:', error);
      return [];
    }
  }

  /**
   * 添加用户名预制项
   */
  static addUsernamePreset(preset: Omit<UsernamePreset, 'id' | 'createdAt'>): UsernamePreset {
    // 检查是否已存在相同的用户名
    const existing = this.getUsernamePresets();
    if (existing.some(p => p.username === preset.username)) {
      throw new Error('该用户名已存在预制项中');
    }

    const newPreset: UsernamePreset = {
      id: `username_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...preset,
      createdAt: Date.now(),
    };

    const presets = existing;
    presets.push(newPreset);
    
    this.saveUsernamePresets(presets);
    return newPreset;
  }

  /**
   * 删除用户名预制项
   */
  static deleteUsernamePreset(presetId: string): void {
    const presets = this.getUsernamePresets();
    const filteredPresets = presets.filter(preset => preset.id !== presetId);
    this.saveUsernamePresets(filteredPresets);
  }

  /**
   * 更新用户名预制项
   */
  static updateUsernamePreset(presetId: string, updates: Partial<Pick<UsernamePreset, 'name' | 'username'>>): void {
    const presets = this.getUsernamePresets();
    const index = presets.findIndex(p => p.id === presetId);
    
    if (index === -1) {
      throw new Error('预制项不存在');
    }

    // 检查是否与其他预制项的用户名冲突
    if (updates.username && updates.username !== presets[index]!.username) {
      if (presets.some(p => p.id !== presetId && p.username === updates.username)) {
        throw new Error('该用户名已存在预制项中');
      }
    }

    presets[index] = { ...presets[index]!, ...updates };
    this.saveUsernamePresets(presets);
  }

  /**
   * 保存用户名预制项到 localStorage
   */
  private static saveUsernamePresets(presets: UsernamePreset[]): void {
    try {
      localStorage.setItem(USERNAME_STORAGE_KEY, JSON.stringify(presets));
    } catch (error) {
      console.error('保存用户名预制项失败:', error);
      throw new Error('保存预制项失败');
    }
  }

  // ========== 工具方法 ==========

  /**
   * 清空所有预制项
   */
  static clearAllPresets(): void {
    try {
      localStorage.removeItem(LIST_ID_STORAGE_KEY);
      localStorage.removeItem(USERNAME_STORAGE_KEY);
    } catch (error) {
      console.error('清空预制项失败:', error);
    }
  }

  /**
   * 导出所有预制项
   */
  static exportPresets(): string {
    const data = {
      listIdPresets: this.getListIdPresets(),
      usernamePresets: this.getUsernamePresets(),
      exportedAt: new Date().toISOString(),
    };
    return JSON.stringify(data, null, 2);
  }

  /**
   * 导入预制项
   */
  static importPresets(presetsJson: string): void {
    try {
      const data = JSON.parse(presetsJson);
      
      if (data.listIdPresets && Array.isArray(data.listIdPresets)) {
        // 验证 listId 预制项格式
        const validListIdPresets = data.listIdPresets.filter((preset: any) => 
          preset.id && 
          preset.name && 
          preset.listId && 
          typeof preset.createdAt === 'number'
        );
        this.saveListIdPresets(validListIdPresets);
      }

      if (data.usernamePresets && Array.isArray(data.usernamePresets)) {
        // 验证用户名预制项格式
        const validUsernamePresets = data.usernamePresets.filter((preset: any) => 
          preset.id && 
          preset.name && 
          preset.username && 
          typeof preset.createdAt === 'number'
        );
        this.saveUsernamePresets(validUsernamePresets);
      }
    } catch (error) {
      console.error('导入预制项失败:', error);
      throw new Error('导入预制项失败：格式错误');
    }
  }
}
