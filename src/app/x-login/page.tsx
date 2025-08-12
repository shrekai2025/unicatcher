'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';

export default function XLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [twoFA, setTwoFA] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [phase, setPhase] = useState<'username' | 'confirm' | 'password'>('username');

  const callLogin = async (payload: any) => {
    const res = await fetch('/api/external/x-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || '登录失败');
    return data;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      if (phase === 'username') {
        await callLogin({ phase, username });
        setMsg('第一步提交成功，如页面要求再次输入用户名，请执行第二步。');
        setPhase('confirm');
      } else if (phase === 'confirm') {
        await callLogin({ phase, username });
        setMsg('第二步提交成功，继续输入密码/验证码完成登录。');
        setPhase('password');
      } else {
        await callLogin({ phase, username, password, twoFA: twoFA || undefined });
        setMsg('登录完成，已保存会话。');
      }
    } catch (err: any) {
      setMsg(err.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-6">
        <h1 className="text-xl font-semibold mb-4">X 无头登录</h1>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">用户名（邮箱/手机号/@handle）</label>
            <input value={username} onChange={e=>setUsername(e.target.value)} required className="w-full border rounded px-3 py-2" placeholder="your_account" />
          </div>
          {phase !== 'username' && (
            <div className="p-3 bg-gray-50 rounded text-sm text-gray-600">当前阶段：{phase === 'confirm' ? '第二步：可能需要再次输入用户名' : '第三步：输入密码与验证码'}</div>
          )}
          {phase === 'password' && (
            <>
              <div>
                <label className="block text-sm text-gray-600 mb-1">密码</label>
                <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required className="w-full border rounded px-3 py-2" placeholder="••••••••" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">二步验证码（如启用）</label>
                <input value={twoFA} onChange={e=>setTwoFA(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="6位验证码（可选）" />
              </div>
            </>
          )}
          <div className="grid grid-cols-3 gap-2">
            <button type="button" onClick={() => { setPhase('username'); setMsg(null); }} className={`px-3 py-2 rounded ${phase==='username'?'bg-blue-100 text-blue-700':'bg-gray-100 text-gray-700'}`}>第一步</button>
            <button type="button" onClick={() => { setPhase('confirm'); setMsg(null); }} className={`px-3 py-2 rounded ${phase==='confirm'?'bg-blue-100 text-blue-700':'bg-gray-100 text-gray-700'}`}>第二步</button>
            <button type="button" onClick={() => { setPhase('password'); setMsg(null); }} className={`px-3 py-2 rounded ${phase==='password'?'bg-blue-100 text-blue-700':'bg-gray-100 text-gray-700'}`}>第三步</button>
          </div>
          <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded py-2 disabled:opacity-50">
            {loading ? '提交中...' : phase==='username' ? '提交第一步' : phase==='confirm' ? '提交第二步' : '提交第三步'}
          </button>
        </form>
        {msg && <p className="mt-4 text-sm text-gray-700">{msg}</p>}
        <p className="mt-2 text-xs text-gray-500">登录成功后将把会话写入服务器的浏览器状态，供爬虫任务使用。</p>
      </div>
    </div>
  );
}

