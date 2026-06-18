'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

const AUTH_KEY = 'stagepv_admin_auth';

export default function LandingPage() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 載入時檢查 sessionStorage 是否已有有效 token(避免重複輸入)
  useEffect(() => {
    const token = sessionStorage.getItem(AUTH_KEY);
    if (token && token.length === 32) setAuthed(true);
    setChecking(false);
  }, []);

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      // 密碼送 server 端驗證(前端不含密碼);成功取回 token 存 sessionStorage
      const res = await fetch('/api/admin-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.ok && data.token) {
        sessionStorage.setItem(AUTH_KEY, data.token);
        setAuthed(true);
      } else {
        setError('密碼錯誤');
        setPassword('');
      }
    } catch {
      setError('驗證失敗,請稍後再試');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative w-full h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Grid lines for tech aesthetic */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }} />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-8">
        {/* Logo / Title */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-4 tracking-tight">
            Stage<span className="text-violet-400">PV</span>
          </h1>
          <p className="text-gray-400 text-lg md:text-xl">
            3D 舞台視覺預覽系統
          </p>
        </div>

        {/* 驗證閘門:未通過顯示密碼框,通過顯示導覽按鈕 */}
        {checking ? (
          <div className="h-48 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-gray-600 border-t-violet-400 rounded-full animate-spin" />
          </div>
        ) : !authed ? (
          <div className="w-full max-w-sm">
            <div className="bg-gray-800/80 backdrop-blur-sm rounded-2xl p-8 border border-gray-700 shadow-2xl">
              <h3 className="text-xl font-bold text-white mb-2 text-center flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
                請輸入密碼
              </h3>
              <p className="text-gray-400 text-sm text-center mb-6">輸入正確密碼以進入系統</p>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
                placeholder="請輸入密碼..."
                autoFocus
                disabled={submitting}
                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white text-center text-lg tracking-widest placeholder-gray-500 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400/50 disabled:opacity-50"
              />

              {error && (
                <p className="text-red-400 text-sm text-center mt-3">{error}</p>
              )}

              <button
                onClick={handleSubmit}
                disabled={submitting || !password}
                className="w-full mt-6 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition-colors"
              >
                {submitting ? '驗證中...' : '進入'}
              </button>
            </div>
          </div>
        ) : (
          /* Navigation Buttons */
          <div className="flex flex-col md:flex-row gap-6 md:gap-10 w-full max-w-3xl">
            {/* Free Test Button */}
            <Link
              href="/free-test"
              className="flex-1 group relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 to-violet-800 p-1 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-violet-500/30 text-left"
            >
              <div className="flex flex-col items-center justify-center h-48 md:h-64 rounded-xl bg-gray-900/50 backdrop-blur-sm p-6 transition-all group-hover:bg-gray-900/30">
                <div className="text-5xl mb-4"><svg className="w-12 h-12 mx-auto text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.39 48.39 0 01-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 01-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 00-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 01-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 00.657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 01-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 005.427-.63 48.05 48.05 0 00.582-4.717.532.532 0 00-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.959.401v0a.656.656 0 00.658-.663 48.422 48.422 0 00-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 01-.61-.58v0z" /></svg></div>
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">自由測試</h2>
                <p className="text-gray-400 text-sm text-center">
                  上傳模型，自由預覽內容
                </p>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-violet-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </Link>

            {/* Video Progress Button */}
            <Link
              href="/video-progress"
              className="flex-1 group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 p-1 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/30"
            >
              <div className="flex flex-col items-center justify-center h-48 md:h-64 rounded-xl bg-gray-900/50 backdrop-blur-sm p-6 transition-all group-hover:bg-gray-900/30">
                <div className="text-5xl mb-4"><svg className="w-12 h-12 mx-auto text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" /></svg></div>
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">影像進度</h2>
                <p className="text-gray-400 text-sm text-center">
                  追蹤專案影像製作進度
                </p>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-blue-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </Link>
          </div>
        )}

        {/* Footer */}
        <div className="absolute bottom-8 text-gray-500 text-sm">
          © 2026 StagePV - 3D Stage Preview System
        </div>
      </div>
    </main>
  );
}
