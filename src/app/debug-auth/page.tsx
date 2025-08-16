'use client';

import { useEffect, useState } from 'react';
import { getSession, login } from '~/lib/simple-auth';

export default function DebugAuthPage() {
  const [authInfo, setAuthInfo] = useState<any>({});
  const [cookieInfo, setCookieInfo] = useState('');

  useEffect(() => {
    // 获取认证信息
    const session = getSession();
    
    // 获取cookie信息
    const cookies = document.cookie;
    
    // 获取localStorage信息
    const localStorage_auth = localStorage.getItem('unicatcher-auth');
    
    setAuthInfo({
      session,
      localStorage_auth,
      cookies_contains_auth: cookies.includes('unicatcher-auth'),
      all_cookies: cookies
    });
    
    setCookieInfo(cookies);
  }, []);

  const handleTestLogin = () => {
    const success = login('viewer', '012345678');
    console.log('Test login result:', success);
    
    // 重新获取信息
    setTimeout(() => {
      const session = getSession();
      const cookies = document.cookie;
      const localStorage_auth = localStorage.getItem('unicatcher-auth');
      
      setAuthInfo({
        session,
        localStorage_auth,
        cookies_contains_auth: cookies.includes('unicatcher-auth'),
        all_cookies: cookies
      });
    }, 100);
  };

  const handleDirectAccess = () => {
    // 直接设置cookie用于测试
    const authData = { 
      isAuthenticated: true, 
      username: 'viewer',
      role: 'viewer' 
    };
    const authString = JSON.stringify(authData);
    document.cookie = `unicatcher-auth=${encodeURIComponent(authString)}; path=/; max-age=86400; SameSite=Lax`;
    
    alert('已设置临时认证cookie，请尝试访问 /viewer');
  };

  const handleClearAuth = () => {
    // 清除所有认证信息
    localStorage.removeItem('unicatcher-auth');
    document.cookie = 'unicatcher-auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    
    // 刷新显示信息
    setTimeout(() => {
      const session = getSession();
      const cookies = document.cookie;
      const localStorage_auth = localStorage.getItem('unicatcher-auth');
      
      setAuthInfo({
        session,
        localStorage_auth,
        cookies_contains_auth: cookies.includes('unicatcher-auth'),
        all_cookies: cookies
      });
    }, 100);
    
    alert('已清除所有认证信息');
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">认证调试页面</h1>
        
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-3">当前认证状态</h2>
            <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
              {JSON.stringify(authInfo, null, 2)}
            </pre>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-3">操作测试</h2>
            <div className="space-x-4">
              <button
                onClick={handleTestLogin}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
              >
                测试viewer登录
              </button>
              
              <button
                onClick={handleDirectAccess}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
              >
                设置临时认证
              </button>
              
              <button
                onClick={handleClearAuth}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
              >
                清除认证状态
              </button>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-3">快速访问链接</h2>
            <div className="space-y-2">
              <a href="/login" className="block text-blue-600 hover:text-blue-800">
                → 登录页面
              </a>
              <a href="/viewer" className="block text-blue-600 hover:text-blue-800">
                → Viewer页面
              </a>
              <a href="/dashboard" className="block text-blue-600 hover:text-blue-800">
                → Dashboard页面
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}