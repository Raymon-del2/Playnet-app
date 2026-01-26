'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getActiveProfile } from '@/app/actions/profile';

interface HistoryItem {
    id: string;
    title: string;
    thumbnail: string;
    views: string;
    timestamp: string;
    date: Date;
    type: 'video' | 'short';
    channel?: string;
    duration?: string;
}

const mockHistory: HistoryItem[] = [
    {
        id: '1',
        title: 'the way iñaki nailed luffy in his self-tape',
        thumbnail: 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?w=400&h=225&fit=crop',
        views: '2M views',
        timestamp: '1 hour ago',
        date: new Date(), // Today
        type: 'short',
    },
    {
        id: '2',
        title: 'The Flash | He possesses the power ...',
        thumbnail: 'https://images.unsplash.com/photo-1614728263952-84ea206f99b6?w=400&h=225&fit=crop',
        views: '4.6M views',
        timestamp: '2 hours ago',
        date: new Date(), // Today
        type: 'short',
    },
    {
        id: '3',
        title: 'She is not an empty-hearted toy | Foundati...',
        thumbnail: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&h=225&fit=crop',
        views: '6.9M views',
        timestamp: '3 hours ago',
        date: new Date(), // Today
        type: 'short',
    },
    {
        id: '4',
        title: 'Building a Next-Gen Discovery Platform',
        thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=225&fit=crop',
        views: '125K views',
        channel: 'Playra Engineering',
        duration: '15:32',
        timestamp: 'Yesterday',
        date: new Date(Date.now() - 86400000), // Yesterday
        type: 'video',
    },
    {
        id: '5',
        title: 'Advanced React Patterns in 2025',
        thumbnail: 'https://images.unsplash.com/photo-1633356122102-3fe601e05bd2?w=400&h=225&fit=crop',
        views: '89K views',
        channel: 'Tech Talk',
        duration: '22:10',
        timestamp: 'Jan 20, 2025',
        date: new Date('2025-01-20'),
        type: 'video',
    },
];

export default function HistoryPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [showClearModal, setShowClearModal] = useState(false);
    const [showPauseModal, setShowPauseModal] = useState(false);
    const [activeProfileName, setActiveProfileName] = useState('');

    useEffect(() => {
        const fetchProfile = async () => {
            const profile = await getActiveProfile();
            if (profile) setActiveProfileName(profile.name);
        };
        fetchProfile();
    }, []);

    const formatDateLabel = (date: Date) => {
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);

        if (date.toDateString() === today.toDateString()) return 'Today';
        if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

        const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };
        if (date.getFullYear() !== today.getFullYear()) {
            options.year = 'numeric';
        }
        return date.toLocaleDateString('en-US', options);
    };

    const groupedHistory = mockHistory.reduce((acc: any, item) => {
        const label = formatDateLabel(item.date);
        if (!acc[label]) acc[label] = [];
        acc[label].push(item);
        return acc;
    }, {});

    return (
        <div className="min-h-screen bg-black text-white flex">
            {/* Main Content */}
            <div className="flex-1 max-w-[1284px] p-6 lg:p-10">
                <h1 className="text-[36px] font-black mb-6">Watch history</h1>

                {/* Filter Chips */}
                <div className="flex gap-2 mb-8 overflow-x-auto no-scrollbar pb-2">
                    {['All', 'Videos', 'Styles', 'Podcasts', 'Music'].map((chip) => (
                        <button
                            key={chip}
                            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${chip === 'All' ? 'bg-white text-black' : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                                }`}
                        >
                            {chip}
                        </button>
                    ))}
                </div>

                {/* History Sections */}
                <div className="space-y-12">
                    {Object.keys(groupedHistory).map((label) => (
                        <div key={label} className="space-y-6">
                            <h2 className="text-[20px] font-black border-b border-white/5 pb-2">{label}</h2>

                            {/* Special handling for Shorts if grouped by date section */}
                            {groupedHistory[label].some((i: any) => i.type === 'short') && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 font-black uppercase text-lg">
                                        <img src="/styles-icon.svg?v=blue" alt="Styles" className="w-6 h-6 object-contain" />
                                        <span className="text-white">Styles</span>
                                    </div>
                                    <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                                        {groupedHistory[label]
                                            .filter((item: any) => item.type === 'short')
                                            .map((item: any) => (
                                                <Link key={item.id} href={`/watch/${item.id}`} className="group space-y-2">
                                                    <div className="aspect-[9/16] rounded-xl overflow-hidden bg-zinc-900 border border-white/5 relative group-hover:border-white/20 transition-all">
                                                        <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </div>
                                                    <div className="px-1">
                                                        <h3 className="text-sm font-bold line-clamp-2 leading-tight group-hover:text-blue-400 transition-colors uppercase tracking-tight">{item.title}</h3>
                                                        <p className="text-[12px] text-zinc-400 font-bold mt-1 uppercase tracking-tighter">{item.views}</p>
                                                    </div>
                                                </Link>
                                            ))}
                                    </div>
                                </div>
                            )}

                            {/* Standard Videos */}
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {groupedHistory[label]
                                    .filter((item: any) => item.type === 'video')
                                    .map((item: any) => (
                                        <Link key={item.id} href={`/watch/${item.id}`} className="flex gap-4 group">
                                            <div className="w-48 aspect-video rounded-xl overflow-hidden bg-zinc-900 flex-shrink-0 relative border border-white/5">
                                                <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                                <div className="absolute bottom-2 right-2 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-black">
                                                    {item.duration}
                                                </div>
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <h3 className="font-black text-sm line-clamp-2 leading-tight group-hover:text-blue-400 transition-colors uppercase tracking-tight">{item.title}</h3>
                                                <p className="text-[12px] text-zinc-400 font-bold uppercase tracking-tight">{item.channel}</p>
                                                <p className="text-[12px] text-zinc-500 font-bold uppercase tracking-tighter">{item.views} • {item.timestamp}</p>
                                            </div>
                                        </Link>
                                    ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Sidebar Controls */}
            <div className="hidden lg:block w-[400px] border-l border-white/5 p-10 space-y-10">
                <div className="relative group">
                    <input
                        type="text"
                        placeholder="Search watch history"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-zinc-900 border border-white/5 rounded-full px-12 py-3 text-sm font-bold focus:border-white/20 transition-all outline-none"
                    />
                    <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>

                <div className="space-y-4">
                    <ControlButton
                        icon={<ClearIcon />}
                        label="Clear all watch history"
                        onClick={() => setShowClearModal(true)}
                    />
                    <ControlButton
                        icon={<PauseIcon />}
                        label="Pause watch history"
                        onClick={() => setShowPauseModal(true)}
                    />
                    <ControlButton icon={<SettingsIcon />} label="Manage all history" />
                </div>

                <div className="space-y-4 pt-4 border-t border-white/5">
                    <a href="#" className="block text-sm font-bold text-zinc-400 hover:text-white transition-colors">Comments</a>
                    <a href="#" className="block text-sm font-bold text-zinc-400 hover:text-white transition-colors">Posts</a>
                    <a href="#" className="block text-sm font-bold text-zinc-400 hover:text-white transition-colors">Live chat</a>
                </div>
            </div>
            {/* Clear History Modal */}
            {showClearModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowClearModal(false)}
                    />

                    {/* Modal Content */}
                    <div className="relative w-full max-w-[450px] bg-[#212121] rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                        <h2 className="text-[20px] font-black text-white mb-4">Clear watch history?</h2>
                        <div className="text-[14px] text-zinc-400 mb-6 space-y-4 font-medium leading-relaxed">
                            <p className="text-zinc-300 font-bold">{activeProfileName}</p>
                            <p>Your Playra watch history will be cleared from all Playra apps on all devices.</p>
                            <p>
                                Your video recommendations will be reset, but may still be influenced by activity on other Google products. To learn more, visit <span className="text-blue-400 cursor-pointer hover:underline">My Activity</span>.
                            </p>
                        </div>

                        <div className="flex justify-end gap-3 mt-8">
                            <button
                                onClick={() => setShowClearModal(false)}
                                className="px-5 py-2 hover:bg-white/10 rounded-full text-white font-bold text-sm transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                className="px-5 py-2 text-blue-400 hover:bg-blue-400/10 rounded-full font-bold text-sm transition-colors"
                            >
                                Clear watch history
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Pause History Modal */}
            {showPauseModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowPauseModal(false)}
                    />

                    {/* Modal Content */}
                    <div className="relative w-full max-w-[450px] bg-[#212121] rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                        <h2 className="text-[20px] font-black text-white mb-4">Pause watch history?</h2>
                        <div className="text-[14px] text-zinc-400 mb-6 space-y-4 font-medium leading-relaxed">
                            <p className="text-zinc-300 font-bold">{activeProfileName}</p>
                            <p>Pausing Playra watch history can make it harder to find videos you watched, and you may see fewer recommendations for new videos in Playra and other Google products.</p>
                            <p>
                                Remember, pausing this setting doesn't delete any previous activity, but you can view, edit and delete your private <span className="text-blue-400 cursor-pointer hover:underline">Playra watch history</span> data anytime. When you pause and clear your watch history, Playra features that rely on history to personalize your experience are disabled.
                            </p>
                        </div>

                        <div className="flex justify-end gap-3 mt-8">
                            <button
                                onClick={() => setShowPauseModal(false)}
                                className="px-5 py-2 hover:bg-white/10 rounded-full text-white font-bold text-sm transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                className="px-5 py-2 text-blue-400 hover:bg-blue-400/10 rounded-full font-bold text-sm transition-colors"
                            >
                                Pause
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function ControlButton({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick?: () => void }) {
    return (
        <button
            onClick={onClick}
            className="flex items-center gap-4 w-full px-4 py-3 rounded-xl hover:bg-white/5 transition-all group text-left"
        >
            <span className="text-zinc-500 group-hover:text-white transition-colors">{icon}</span>
            <span className="text-sm font-bold text-zinc-200 group-hover:text-white transition-colors">{label}</span>
        </button>
    );
}

const ClearIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const PauseIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const SettingsIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);
