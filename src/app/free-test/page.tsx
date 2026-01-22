'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProjectService, type ProjectSummary } from '@/lib/project-service';
import Link from 'next/link';

export default function ProjectDashboard() {
    const router = useRouter();
    const [projects, setProjects] = useState<ProjectSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [showNameModal, setShowNameModal] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
    const [longPressProgress, setLongPressProgress] = useState(0);

    const [editingId, setEditingId] = useState<string | null>(null);

    useEffect(() => {
        loadProjects();
    }, []);

    const loadProjects = async () => {
        try {
            setLoading(true);
            const projectList = await ProjectService.listProjects();
            setProjects(projectList);
        } catch (error) {
            console.error('Failed to load projects:', error);
            alert('無法載入專案列表');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitProject = async () => {
        if (!newProjectName.trim()) {
            alert('請輸入專案名稱');
            return;
        }

        try {
            setCreating(true);

            if (editingId) {
                // Rename existing project
                await ProjectService.updateProject(editingId, { name: newProjectName.trim() });
                await loadProjects();
                setShowNameModal(false);
                setNewProjectName('');
                setEditingId(null);
            } else {
                // Create new project
                const projectId = await ProjectService.createProject(newProjectName.trim());
                setShowNameModal(false);
                setNewProjectName('');
                router.push(`/free-test/${projectId}`);
            }
        } catch (error) {
            console.error('Failed to save project:', error);
            alert(editingId ? '重新命名失敗' : '建立專案失敗');
        } finally {
            setCreating(false);
        }
    };

    const openRenameModal = (e: React.MouseEvent, project: ProjectSummary) => {
        e.preventDefault();
        e.stopPropagation();
        setNewProjectName(project.name);
        setEditingId(project.id);
        setShowNameModal(true);
    };

    const handleDeleteProject = async (projectId: string) => {
        if (!confirm('確定要刪除此專案嗎？此操作無法復原。')) {
            return;
        }

        try {
            await ProjectService.deleteProject(projectId);
            await loadProjects(); // Reload the list
        } catch (error) {
            console.error('Failed to delete project:', error);
            alert('刪除專案失敗');
        }
    };

    const handleLongPressStart = (e: React.MouseEvent | React.TouchEvent, projectId: string) => {
        e.preventDefault();
        e.stopPropagation();

        setDeletingId(projectId);
        setLongPressProgress(0);

        let progress = 0;
        const interval = setInterval(() => {
            progress += 10;
            setLongPressProgress(progress);

            if (progress >= 100) {
                clearInterval(interval);
                handleDeleteProject(projectId);
                setDeletingId(null);
                setLongPressProgress(0);
            }
        }, 100); // Update every 100ms for smooth animation

        setLongPressTimer(interval as any);
    };

    const handleLongPressEnd = () => {
        if (longPressTimer) {
            clearInterval(longPressTimer);
            setLongPressTimer(null);
        }
        setDeletingId(null);
        setLongPressProgress(0);
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return 'Unknown';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('zh-TW', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <main className="relative w-full min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
            {/* Background decorative elements */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl animate-pulse delay-1000" />
            </div>

            {/* Content */}
            <div className="relative z-10 px-8 py-12">
                {/* Header */}
                <div className="max-w-6xl mx-auto mb-12">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-4xl font-bold text-white mb-2">專案管理</h1>
                            <p className="text-gray-400">管理您的舞台視覺預覽專案</p>
                        </div>
                        <div className="flex gap-3">
                            <Link
                                href="/"
                                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                            >
                                返回首頁
                            </Link>
                            <button
                                onClick={() => {
                                    setNewProjectName('');
                                    setEditingId(null);
                                    setShowNameModal(true);
                                }}
                                className="px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                建立新專案
                            </button>
                        </div>
                    </div>
                </div>

                {/* Project List */}
                <div className="max-w-6xl mx-auto">
                    {loading ? (
                        <div className="text-center py-20">
                            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"></div>
                            <p className="text-gray-400 mt-4">載入中...</p>
                        </div>
                    ) : projects.length === 0 ? (
                        <div className="text-center py-20">
                            <div className="text-6xl mb-4">📁</div>
                            <h3 className="text-2xl font-bold text-white mb-2">尚無專案</h3>
                            <p className="text-gray-400 mb-6">點擊上方按鈕建立您的第一個專案</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {projects.map((project) => (
                                <div key={project.id} className="relative group">
                                    {/* Action Buttons */}
                                    <div className="absolute top-4 right-4 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {/* Rename Button */}
                                        <button
                                            onClick={(e) => openRenameModal(e, project)}
                                            className="w-10 h-10 bg-gray-700/80 hover:bg-violet-600 rounded-full flex items-center justify-center transition-all"
                                            title="重新命名"
                                        >
                                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                        </button>

                                        {/* Delete Button with Long-press */}
                                        <button
                                            onMouseDown={(e) => handleLongPressStart(e, project.id)}
                                            onMouseUp={handleLongPressEnd}
                                            onMouseLeave={handleLongPressEnd}
                                            onTouchStart={(e) => handleLongPressStart(e, project.id)}
                                            onTouchEnd={handleLongPressEnd}
                                            className="relative w-10 h-10 bg-red-600/80 hover:bg-red-600 rounded-full flex items-center justify-center transition-all overflow-hidden"
                                            title="長按一秒刪除"
                                        >
                                            <svg className="w-5 h-5 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>

                                            {/* Progress Overlay */}
                                            {deletingId === project.id && (
                                                <div
                                                    className="absolute inset-0 bg-white/30 z-0 origin-bottom transition-transform duration-100 ease-linear"
                                                    style={{ transform: `scaleY(${longPressProgress / 100})` }}
                                                />
                                            )}
                                        </button>
                                    </div>

                                    <Link
                                        href={`/free-test/${project.id}`}
                                        className="block bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-violet-500 transition-all hover:scale-105 hover:shadow-2xl hover:shadow-violet-500/20"
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="text-4xl">🎬</div>
                                            <div className="text-xs text-gray-500">
                                                {formatDate(project.updatedAt || project.createdAt)}
                                            </div>
                                        </div>
                                        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-violet-400 transition-colors pr-16 truncate">
                                            {project.name}
                                        </h3>
                                        <p className="text-sm text-gray-400">
                                            建立於 {formatDate(project.createdAt)}
                                        </p>
                                    </Link>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Create/Rename Project Modal */}
            {showNameModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                    <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-md mx-4 border border-gray-700 shadow-2xl">
                        <h3 className="text-2xl font-bold text-white mb-2 text-center">
                            {editingId ? '重新命名專案' : '建立新專案'}
                        </h3>
                        <p className="text-gray-400 text-sm text-center mb-6">請輸入專案名稱</p>

                        <input
                            type="text"
                            value={newProjectName}
                            onChange={(e) => setNewProjectName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSubmitProject()}
                            placeholder="專案名稱..."
                            autoFocus
                            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 mb-6"
                        />

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowNameModal(false);
                                    setNewProjectName('');
                                    setEditingId(null);
                                }}
                                disabled={creating}
                                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg transition-colors disabled:opacity-50"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleSubmitProject}
                                disabled={creating || !newProjectName.trim()}
                                className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
                            >
                                {creating ? '處理中...' : '確認'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
