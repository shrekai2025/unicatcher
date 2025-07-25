// 极简认证工具
const AUTH_KEY = 'unicatcher-auth';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'a2885828';

export interface SimpleSession {
  isAuthenticated: boolean;
  username?: string;
}

// 登录验证
export function login(username: string, password: string): boolean {
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    const authData = { isAuthenticated: true, username: ADMIN_USERNAME };
    const authString = JSON.stringify(authData);
    
    if (typeof window !== 'undefined') {
      // 同时设置 localStorage 和 cookie
      localStorage.setItem(AUTH_KEY, authString);
      // 使用 encodeURIComponent 编码 cookie 值
      document.cookie = `unicatcher-auth=${encodeURIComponent(authString)}; path=/; max-age=86400`; // 24小时
    }
    return true;
  }
  return false;
}

// 登出
export function logout(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(AUTH_KEY);
    // 清除 cookie
    document.cookie = 'unicatcher-auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  }
}

// 获取当前会话
export function getSession(): SimpleSession {
  if (typeof window === 'undefined') {
    return { isAuthenticated: false };
  }
  
  try {
    const stored = localStorage.getItem(AUTH_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // 忽略解析错误
  }
  
  return { isAuthenticated: false };
}

// 检查是否已登录
export function isAuthenticated(): boolean {
  return getSession().isAuthenticated;
} 