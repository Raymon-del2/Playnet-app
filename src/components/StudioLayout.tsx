'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getActiveProfile } from '@/app/actions/profile';

interface StudioLayoutProps {
    children: React.ReactNode;
}

export default function StudioLayout({ children }: StudioLayoutProps) {
    const pathname = usePathname();
    const [activeProfile, setActiveProfile] = useState<any>(null);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            const profile = await getActiveProfile();
            setActiveProfile(profile);
        };
        fetchProfile();
    }, []);

    const menuItems = [
        { icon: 'dashboard', label: 'Dashboard', path: '/studio' },
        { icon: 'content', label: 'Content', path: '/studio/content' },
        { icon: 'analytics', label: 'Analytics', path: '/studio/analytics' },
        { icon: 'comments', label: 'Comments', path: '/studio/comments' },
        { icon: 'subtitles', label: 'Subtitles', path: '/studio/subtitles' },
    ];

    const bottomItems = [
        { icon: 'settings', label: 'Settings', path: '/studio/settings' },
        { icon: 'feedback', label: 'Send feedback', path: '/studio/feedback' },
    ];

    const getIcon = (icon: string) => {
        const icons: { [key: string]: JSX.Element } = {
            dashboard: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>,
            content: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" /></svg>,
            analytics: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>,
            comments: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>,
            subtitles: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>,
            settings: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
            feedback: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>,
        };
        return icons[icon] || icons.dashboard;
    };

    return (
        <div className="min-h-screen bg-[#0f0f0f] text-white flex">
            {/* Sidebar */}
            <aside className={`fixed left-0 top-0 h-screen bg-[#0f0f0f] border-r border-white/10 flex flex-col transition-all duration-300 z-50 ${isSidebarCollapsed ? 'w-16' : 'w-56'}`}>
                {/* Header */}
                <div className="h-14 flex items-center gap-3 px-4 border-b border-white/10">
                    <button
                        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                        </svg>
                    </button>
                    {!isSidebarCollapsed && (
                        <Link href="/studio" className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-red-600 rounded flex items-center justify-center">
                                <svg className="w-4 h-4" fill="white" viewBox="0 0 24 24">
                                    <path d="M10 15l5.19-3L10 9v6m11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 2.19-.16 3.8-.44 4.83-.25.9-.83 1.48-1.73 1.73-.47.13-1.33.22-2.65.28-1.3.07-2.49.1-3.59.1L12 19c-4.19 0-6.8-.16-7.83-.44-.9-.25-1.48-.83-1.73-1.73-.13-.47-.22-1.1-.28-1.9-.07-.8-.1-1.49-.1-2.09L2 12c0-2.19.16-3.8.44-4.83.25-.9.83-1.48 1.73-1.73.47-.13 1.33-.22 2.65-.28 1.3-.07 2.49-.1 3.59-.1L12 5c4.19 0 6.8.16 7.83.44.9.25 1.48.83 1.73 1.73z" />
                                </svg>
                            </div>
                            <span className="font-bold text-[15px]">Studio</span>
                        </Link>
                    )}
                </div>

                {/* Profile */}
                <div className={`py-4 border-b border-white/10 ${isSidebarCollapsed ? 'px-2' : 'px-4'}`}>
                    <div className={`flex ${isSidebarCollapsed ? 'justify-center' : 'flex-col items-center'}`}>
                        <div className={`${isSidebarCollapsed ? 'w-10 h-10' : 'w-24 h-24'} rounded-full overflow-hidden bg-zinc-800`}>
                            {activeProfile?.avatar ? (
                                <img src={activeProfile.avatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-zinc-500">
                                    {activeProfile?.name?.[0]?.toUpperCase() || 'U'}
                                </div>
                            )}
                        </div>
                        {!isSidebarCollapsed && (
                            <>
                                <p className="mt-3 text-[13px] font-medium">Your channel</p>
                                <p className="text-[12px] text-zinc-500">{activeProfile?.name || 'Unknown'}</p>
                            </>
                        )}
                    </div>
                </div>

                {/* Menu Items */}
                <nav className="flex-1 py-2">
                    {menuItems.map(item => (
                        <Link
                            key={item.path}
                            href={item.path}
                            className={`flex items-center gap-4 px-4 py-2.5 transition-colors ${pathname === item.path
                                    ? 'bg-white/10 text-white'
                                    : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                                } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                        >
                            {getIcon(item.icon)}
                            {!isSidebarCollapsed && <span className="text-[13px] font-medium">{item.label}</span>}
                        </Link>
                    ))}
                </nav>

                {/* Bottom Items */}
                <div className="border-t border-white/10 py-2">
                    {bottomItems.map(item => (
                        <Link
                            key={item.path}
                            href={item.path}
                            className={`flex items-center gap-4 px-4 py-2.5 text-zinc-400 hover:bg-white/5 hover:text-white transition-colors ${isSidebarCollapsed ? 'justify-center' : ''}`}
                        >
                            {getIcon(item.icon)}
                            {!isSidebarCollapsed && <span className="text-[13px] font-medium">{item.label}</span>}
                        </Link>
                    ))}
                </div>
            </aside>

            {/* Main Content */}
            <main className={`flex-1 transition-all duration-300 ${isSidebarCollapsed ? 'ml-16' : 'ml-56'}`}>
                {children}
            </main>
        </div>
    );
}
