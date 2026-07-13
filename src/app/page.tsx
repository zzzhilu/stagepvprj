'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProjectService, type ProjectSummary } from '@/lib/project-service';

const AUTH_KEY = 'stagepv_admin_auth';

export default function LandingPage() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  // 專案 dashboard(通過驗證後直接顯示所有專案,免去多層點擊)
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null); // `${id}:share` / `${id}:gdrive`

  useEffect(() => {
    if (!authed) return;
    setLoadingProjects(true);
    ProjectService.listProjects()
      .then(setProjects)
      .catch((e) => console.error('載入專案失敗', e))
      .finally(() => setLoadingProjects(false));
  }, [authed]);

  const copyLink = async (projectId: string, kind: 'share' | 'gdrive') => {
    const url = kind === 'share'
      ? `${window.location.origin}/share/${projectId}`
      : `${window.location.origin}/share/${projectId}?playlist=gdrive`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(`${projectId}:${kind}`);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      window.prompt('請手動複製連結:', url);
    }
  };

  const handleCreate = async () => {
    const name = window.prompt('新專案名稱:');
    if (!name?.trim()) return;
    try {
      setCreating(true);
      const id = await ProjectService.createProject(name.trim());
      router.push(`/free-test/${id}`);
    } catch (e) {
      console.error(e);
      alert('建立失敗');
    } finally {
      setCreating(false);
    }
  };

  const fmtDate = (d: unknown) => {
    try {
      const date = (d as { toDate?: () => Date })?.toDate?.() ?? new Date(d as string | number | Date);
      return date.toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch { return ''; }
  };

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
          /* 專案 Dashboard:所有專案直接列出,每卡直達自由測試/影像進度並可直接複製分享連結 */
          <div className="w-full max-w-5xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>{projects.length} 個專案</span>
                <Link href="/free-test" className="underline hover:text-gray-300">專案管理</Link>
                <Link href="/video-progress" className="underline hover:text-gray-300">影像進度列表</Link>
              </div>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold disabled:opacity-50"
              >
                {creating ? '建立中...' : '+ 新專案'}
              </button>
            </div>

            {loadingProjects ? (
              <div className="h-40 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-gray-600 border-t-violet-400 rounded-full animate-spin" />
              </div>
            ) : projects.length === 0 ? (
              <p className="text-gray-500 text-center py-16">尚無專案,點右上「+ 新專案」開始</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto pr-1">
                {projects.map((p) => (
                  <div key={p.id} className="bg-gray-800/80 backdrop-blur-sm border border-gray-700 rounded-2xl p-5 hover:border-gray-500 transition-colors">
                    <div className="flex items-start justify-between mb-1">
                      <svg className="w-7 h-7 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-2.625 1.125a1.125 1.125 0 01-1.125-1.125v-1.5c0-.621.504-1.125 1.125-1.125m0 3.75h-1.5A1.125 1.125 0 011.125 18.375m17.25 0h1.5m-1.5 0a1.125 1.125 0 01-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h1.5a1.125 1.125 0 001.125-1.125v-1.5a1.125 1.125 0 00-1.125-1.125h-1.5m-15 0v-9a1.125 1.125 0 011.125-1.125h13.5c.621 0 1.125.504 1.125 1.125v9" /></svg>
                      {p.updatedAt ? <span className="text-[10px] text-gray-500">{fmtDate(p.updatedAt)}</span> : null}
                    </div>
                    <h3 className="text-white font-bold text-lg truncate" title={p.name}>{p.name}</h3>
                    <p className="text-gray-500 text-xs mb-4">建立於 {fmtDate(p.createdAt)}</p>

                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <Link href={`/free-test/${p.id}`} className="text-center py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors">自由測試</Link>
                      <Link href={`/video-progress/${p.id}`} className="text-center py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors">影像進度</Link>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => copyLink(p.id, 'share')} className="py-1.5 rounded-lg bg-gray-700/70 hover:bg-gray-600 text-gray-200 text-xs transition-colors" title="複製 3D 預覽分享連結(share 頁)">
                        {copied === `${p.id}:share` ? '✅ 已複製' : '🔗 分享 3D 預覽'}
                      </button>
                      <button onClick={() => copyLink(p.id, 'gdrive')} className="py-1.5 rounded-lg bg-emerald-700/60 hover:bg-emerald-600 text-emerald-100 text-xs transition-colors" title="複製 GDrive 播放列表分享連結(客戶影像檢視)">
                        {copied === `${p.id}:gdrive` ? '✅ 已複製' : '☁️ GDrive 分享'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
