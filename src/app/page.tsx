'use client';

import Link from 'next/link';

export default function LandingPage() {
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

        {/* Navigation Buttons */}
        <div className="flex flex-col md:flex-row gap-6 md:gap-10 w-full max-w-3xl">
          {/* Free Test Button */}
          <Link
            href="/free-test"
            className="flex-1 group relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 to-violet-800 p-1 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-violet-500/30"
          >
            <div className="flex flex-col items-center justify-center h-48 md:h-64 rounded-xl bg-gray-900/50 backdrop-blur-sm p-6 transition-all group-hover:bg-gray-900/30">
              <div className="text-5xl mb-4">🎮</div>
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
              <div className="text-5xl mb-4">📹</div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">影像進度</h2>
              <p className="text-gray-400 text-sm text-center">
                追蹤專案影像製作進度
              </p>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-blue-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          </Link>
        </div>

        {/* Footer */}
        <div className="absolute bottom-8 text-gray-500 text-sm">
          © 2026 StagePV - 3D Stage Preview System
        </div>
      </div>
    </main>
  );
}
