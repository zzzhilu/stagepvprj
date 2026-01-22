'use client';

import dynamic from 'next/dynamic';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useState, useEffect } from 'react';
import AdminControls from '@/components/admin/AdminControls';
import ClientControls from '@/components/client/ClientControls';
import { VideoControls } from '@/components/client/VideoControls';
import { ViewSwitcher } from '@/components/client/ViewSwitcher';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ClientUploader } from '@/components/client/ClientUploader';

const ADMIN_PASSWORD = '0903';
const AUTH_KEY = 'stagepv_admin_auth';

const Scene = dynamic(() => import('@/components/canvas/Scene'), {
    ssr: false,
    loading: () => <div className="text-white flex items-center justify-center w-full h-full bg-gray-900">Loading 3D Engine...</div>
});

function PasswordGate({ onSuccess }: { onSuccess: () => void }) {
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = () => {
        if (password === ADMIN_PASSWORD) {
            sessionStorage.setItem(AUTH_KEY, 'true');
            onSuccess();
        } else {
            setError('密碼錯誤');
            setPassword('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSubmit();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black">
            <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-md mx-4 border border-gray-700 shadow-2xl">
                <h3 className="text-2xl font-bold text-white mb-2 text-center">🔒 管理員驗證</h3>
                <p className="text-gray-400 text-sm text-center mb-6">請輸入密碼以進入編輯模式</p>

                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="請輸入密碼..."
                    autoFocus
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white text-center text-lg tracking-widest placeholder-gray-500 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                />

                {error && (
                    <p className="text-red-400 text-sm text-center mt-3">{error}</p>
                )}

                <div className="flex gap-3 mt-6">
                    <button
                        onClick={() => router.push('/')}
                        className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg transition-colors"
                    >
                        返回首頁
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-3 rounded-lg font-semibold transition-colors"
                    >
                        確認
                    </button>
                </div>
            </div>
        </div>
    );
}

function FreeTestContent() {
    const searchParams = useSearchParams();
    const isShareMode = searchParams.get('share') === '1';
    const projectName = searchParams.get('name') || '';
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        // Share mode bypasses auth
        if (isShareMode) {
            setIsAuthenticated(true);
            setIsChecking(false);
            return;
        }

        // Check sessionStorage for auth
        const authed = sessionStorage.getItem(AUTH_KEY) === 'true';
        setIsAuthenticated(authed);
        setIsChecking(false);
    }, [isShareMode]);

    // Show loading while checking auth
    if (isChecking) {
        return <div className="text-white flex items-center justify-center w-full h-full bg-gray-900">驗證中...</div>;
    }

    // Show password gate if not authenticated and not in share mode
    if (!isAuthenticated && !isShareMode) {
        return <PasswordGate onSuccess={() => setIsAuthenticated(true)} />;
    }

    return (
        <main className="relative w-full h-full">
            {/* Project Name Display - Share mode only */}
            {isShareMode && projectName && (
                <div className="absolute top-4 left-4 z-50 pointer-events-none">
                    <div className="bg-black/60 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/10">
                        <span className="text-white font-semibold">{decodeURIComponent(projectName)}</span>
                    </div>
                </div>
            )}

            {/* Admin Controls - Hidden in share mode */}
            {!isShareMode && <AdminControls />}

            {/* Client Controls */}
            <ClientControls />

            {/* Video Controls */}
            <VideoControls />

            {/* View Switcher - Always visible */}
            <ViewSwitcher />

            {/* Client Uploader for Share Mode */}
            {isShareMode && <ClientUploader />}

            {/* 3D Scene */}
            <ErrorBoundary>
                <Scene />
            </ErrorBoundary>
        </main>
    );
}

export default function FreeTestPage() {
    return (
        <Suspense fallback={<div className="text-white flex items-center justify-center w-full h-full bg-gray-900">Loading...</div>}>
            <FreeTestContent />
        </Suspense>
    );
}

