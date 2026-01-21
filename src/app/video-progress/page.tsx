'use client';

import Link from 'next/link';

export default function VideoProgressPage() {
    return (
        <main className="relative w-full h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
            <div className="text-center">
                <div className="text-6xl mb-6">🚧</div>
                <h1 className="text-3xl font-bold text-white mb-4">影像進度</h1>
                <p className="text-gray-400 mb-8">此功能正在開發中...</p>
                <Link
                    href="/"
                    className="inline-block px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
                >
                    ← 返回首頁
                </Link>
            </div>
        </main>
    );
}
