// 极简认证工具
const AUTH_KEY = 'unicatcher-auth';

// 用户配置
const USERS = {
  admin: {
    password: 'a2885828',
    role: 'admin'
  },
  viewer: {
    password: '012345678',
    role: 'viewer'
  }
} as const;

export type UserRole = 'admin' | 'viewer';

export interface SimpleSession {
  isAuthenticated: boolean;
  username?: string;
  role?: UserRole;
}

// 登录验证
export function login(username: string, password: string): boolean {
  const user = USERS[username as keyof typeof USERS];
  if (user && user.password === password) {
    const authData = { 
      isAuthenticated: true, 
      username: username,
      role: user.role 
    };
    const authString = JSON.stringify(authData);
    
    if (typeof window !== 'undefined') {
      // 同时设置 localStorage 和 cookie
      localStorage.setItem(AUTH_KEY, authString);
      // 设置cookie，确保在所有环境下都能工作
      document.cookie = `unicatcher-auth=${encodeURIComponent(authString)}; path=/; max-age=86400; SameSite=Lax`; // 24小时
      console.log('Authentication set:', { username, role: user.role }); // 调试日志
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