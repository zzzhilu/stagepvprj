'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProjectService, type ProjectSummary } from '@/lib/project-service';
import Link from 'next/link';

export default function VideoProgressDashboard() {
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
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
                await ProjectService.updateProject(editingId, { name: newProjectName.trim() });
                await loadProjects();
                setShowNameModal(false);
                setNewProjectName('');
                setEditingId(null);
            } else {
                const projectId = await ProjectService.createProject(newProjectName.trim());
                setShowNameModal(false);
                setNewProjectName('');
                router.push(`/video-progress/${projectId}`);
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
            await loadProjects();
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
        }, 100);

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
        if (!timestamp) return '未知';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('zh-TW', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatShortDate = (timestamp: any) => {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('zh-TW', {
            month: 'short',
            day: 'numeric',
        });
    };

    return (
        <main className="relative w-full min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex">
            {/* ===== Left Sidebar ===== */}
            <aside className={`
                fixed top-0 left-0 h-full z-40 flex flex-col
                bg-gray-900/95 backdrop-blur-xl border-r border-gray-800
                transition-all duration-300 ease-in-out
                ${sidebarCollapsed ? 'w-20' : 'w-72'}
            `}>
                {/* Sidebar Header / Brand */}
                <div className="p-5 border-b border-gray-800 flex items-center justify-between">
                    {!sidebarCollapsed && (
                        <Link href="/" className="flex items-center gap-2.5 group">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-white tracking-tight">
                                    Stage<span className="text-blue-400">PV</span>
                                </h1>
                                <p className="text-[10px] text-gray-500 -mt-0.5">影像進度管理</p>
                            </div>
                        </Link>
                    )}
                    {sidebarCollapsed && (
                        <Link href="/" className="mx-auto">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                                </svg>
                            </div>
                        </Link>
                    )}
                    <button
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-gray-300 transition-colors"
                    >
                        <svg className={`w-4 h-4 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                        </svg>
                    </button>
                </div>

                {/* Navigation Links */}
                <nav className="p-3 space-y-1 border-b border-gray-800">
                    <Link
                        href="/"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/70 transition-all group"
                    >
                        <svg className="w-5 h-5 flex-shrink-0 text-gray-500 group-hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                        </svg>
                        {!sidebarCollapsed && <span className="text-sm">首頁</span>}
                    </Link>
                    <Link
                        href="/free-test"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/70 transition-all group"
                    >
                        <svg className="w-5 h-5 flex-shrink-0 text-gray-500 group-hover:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.39 48.39 0 01-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 01-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 00-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 01-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 00.657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 01-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 005.427-.63 48.05 48.05 0 00.582-4.717.532.532 0 00-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.959.401v0a.656.656 0 00.658-.663 48.422 48.422 0 00-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 01-.61-.58v0z" />
                        </svg>
                        {!sidebarCollapsed && <span className="text-sm">自由測試</span>}
                    </Link>
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-blue-600/10 text-blue-400 border border-blue-500/20">
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                            <path strokeLinecap="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                        {!sidebarCollapsed && <span className="text-sm font-medium">影像進度</span>}
                    </div>
                </nav>

                {/* Projects List in Sidebar */}
                <div className="flex-1 overflow-y-auto p-3">
                    {!sidebarCollapsed && (
                        <div className="flex items-center justify-between mb-3 px-1">
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">專案列表</h3>
                            <span className="text-xs text-gray-600 bg-gray-800 px-2 py-0.5 rounded-full">{projects.length}</span>
                        </div>
                    )}

                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {projects.map((project) => (
                                <Link
                                    key={project.id}
                                    href={`/video-progress/${project.id}`}
                                    className="group flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-800/70 transition-all relative"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-blue-600/15 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-600/25 transition-colors">
                                        <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0118 7.125v-1.5m1.125 2.625c-.621 0-1.125.504-1.125 1.125v1.5m2.625-2.625c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 016 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25C6 11.496 5.496 12 4.875 12M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m-12 5.25v-5.25m0 5.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125m-12 0v-1.5c0-.621-.504-1.125-1.125-1.125M18 18.375v-5.25m0 5.25v-1.5c0-.621.504-1.125 1.125-1.125M18 13.125v1.5c0 .621.504 1.125 1.125 1.125M18 13.125c0-.621.504-1.125 1.125-1.125M6 13.125v1.5c0 .621-.504 1.125-1.125 1.125M6 13.125C6 12.504 5.496 12 4.875 12m-1.5 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M19.125 12h1.5m0 0c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h1.5m14.25 0h1.5" />
                                        </svg>
                                    </div>
                                    {!sidebarCollapsed && (
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-gray-300 group-hover:text-white truncate transition-colors">{project.name}</p>
                                            <p className="text-[10px] text-gray-600">{formatShortDate(project.updatedAt || project.createdAt)}</p>
                                        </div>
                                    )}
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* Create New Project Button */}
                <div className="p-3 border-t border-gray-800">
                    <button
                        onClick={() => {
                            setNewProjectName('');
                            setEditingId(null);
                            setShowNameModal(true);
                        }}
                        className={`
                            w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                            bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500
                            text-white text-sm font-semibold transition-all
                            shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30
                            ${sidebarCollapsed ? 'px-2' : 'px-4'}
                        `}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        {!sidebarCollapsed && <span>建立新專案</span>}
                    </button>
                </div>
            </aside>

            {/* ===== Main Content Area ===== */}
            <div className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-20' : 'ml-72'}`}>
                {/* Background decorative elements */}
                <div className="fixed inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-blue-600/8 rounded-full blur-[120px]" />
                    <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-cyan-600/8 rounded-full blur-[100px]" />
                </div>

                {/* Content */}
                <div className="relative z-10 px-8 py-10">
                    {/* Page Header */}
                    <div className="mb-10">
                        <h1 className="text-3xl font-bold text-white mb-2">影像進度專案</h1>
                        <p className="text-gray-500">管理您的影像製作專案與分享連結</p>
                    </div>

                    {/* Project Grid */}
                    {loading ? (
                        <div className="text-center py-20">
                            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                            <p className="text-gray-400 mt-4">載入中...</p>
                        </div>
                    ) : projects.length === 0 ? (
                        <div className="text-center py-20">
                            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gray-800/50 border border-gray-700 flex items-center justify-center">
                                <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                                </svg>
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">尚無專案</h3>
                            <p className="text-gray-500 mb-8">點擊左下方按鈕建立您的第一個影像進度專案</p>
                            <button
                                onClick={() => {
                                    setNewProjectName('');
                                    setEditingId(null);
                                    setShowNameModal(true);
                                }}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                                建立新專案
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                            {projects.map((project) => (
                                <div key={project.id} className="relative group">
                                    {/* Action Buttons */}
                                    <div className="absolute top-4 right-4 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {/* Rename Button */}
                                        <button
                                            onClick={(e) => openRenameModal(e, project)}
                                            className="w-9 h-9 bg-gray-800/90 hover:bg-blue-600 rounded-lg flex items-center justify-center transition-all backdrop-blur-sm border border-gray-700 hover:border-blue-500"
                                            title="重新命名"
                                        >
                                            <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                            </svg>
                                        </button>

                                        {/* Delete Button with Long-press */}
                                        <button
                                            onMouseDown={(e) => handleLongPressStart(e, project.id)}
                                            onMouseUp={handleLongPressEnd}
                                            onMouseLeave={handleLongPressEnd}
                                            onTouchStart={(e) => handleLongPressStart(e, project.id)}
                                            onTouchEnd={handleLongPressEnd}
                                            className="relative w-9 h-9 bg-gray-800/90 hover:bg-red-600 rounded-lg flex items-center justify-center transition-all overflow-hidden backdrop-blur-sm border border-gray-700 hover:border-red-500"
                                            title="長按一秒刪除"
                                        >
                                            <svg className="w-4 h-4 text-gray-300 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                            </svg>

                                            {deletingId === project.id && (
                                                <div
                                                    className="absolute inset-0 bg-red-500/40 z-0 origin-bottom transition-transform duration-100 ease-linear"
                                                    style={{ transform: `scaleY(${longPressProgress / 100})` }}
                                                />
                                            )}
                                        </button>
                                    </div>

                                    <Link
                                        href={`/video-progress/${project.id}`}
                                        className="block bg-gray-900/60 backdrop-blur-sm rounded-xl p-6 border border-gray-800 hover:border-blue-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-0.5"
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center border border-blue-500/20">
                                                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                                                    <path strokeLinecap="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                                                </svg>
                                            </div>
                                            <div className="text-xs text-gray-600 flex items-center gap-1">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                {formatShortDate(project.updatedAt || project.createdAt)}
                                            </div>
                                        </div>
                                        <h3 className="text-lg font-bold text-white mb-1.5 group-hover:text-blue-400 transition-colors pr-16 truncate">
                                            {project.name}
                                        </h3>
                                        <p className="text-xs text-gray-500 flex items-center gap-1">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                                            </svg>
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
                    <div className="bg-gray-900 rounded-2xl p-8 w-full max-w-md mx-4 border border-gray-700 shadow-2xl">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center">
                                {editingId ? (
                                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                    </svg>
                                )}
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">
                                    {editingId ? '重新命名專案' : '建立新專案'}
                                </h3>
                                <p className="text-gray-500 text-xs">請輸入專案名稱</p>
                            </div>
                        </div>

                        <input
                            type="text"
                            value={newProjectName}
                            onChange={(e) => setNewProjectName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSubmitProject()}
                            placeholder="專案名稱..."
                            autoFocus
                            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 mb-6"
                        />

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowNameModal(false);
                                    setNewProjectName('');
                                    setEditingId(null);
                                }}
                                disabled={creating}
                                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-xl transition-colors disabled:opacity-50 border border-gray-700"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleSubmitProject}
                                disabled={creating || !newProjectName.trim()}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold transition-colors disabled:opacity-50"
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
