'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

interface Notification {
    id: string;
    channelName: string;
    channelAvatar: string;
    message: string;
    thumbnail: string;
    timestamp: string;
    isImportant?: boolean;
}

const mockNotifications: Notification[] = [
    {
        id: '1',
        channelName: 'askNK',
        channelAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=64&h=64&fit=crop',
        message: 'uploaded: Brand New Blender Addons You Probably Missed! - Jan #2',
        thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=120&h=68&fit=crop',
        timestamp: '1 day ago',
        isImportant: true,
    },
    {
        id: '2',
        channelName: 'NetworkChuck',
        channelAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=64&h=64&fit=crop',
        message: 'uploaded: Virtual Machines EXPLAINED (This Is the Magic)',
        thumbnail: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=120&h=68&fit=crop',
        timestamp: '3 days ago',
        isImportant: true,
    },
    {
        id: '3',
        channelName: 'Aniplex',
        channelAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64&fit=crop',
        message: 'uploaded: 「そりゃ無理な相談だぜ！」#15 | TVアニメ',
        thumbnail: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=120&h=68&fit=crop',
        timestamp: '9 hours ago',
    },
    {
        id: '4',
        channelName: 'InspirationTuts',
        channelAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=64&h=64&fit=crop',
        message: 'uploaded: New After Effects Plugins have Been Released',
        thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=120&h=68&fit=crop',
        timestamp: '1 day ago',
    },
    {
        id: '5',
        channelName: 'Tech Master',
        channelAvatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=64&h=64&fit=crop',
        message: 'uploaded: Building a Full Stack App with Next.js',
        thumbnail: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=120&h=68&fit=crop',
        timestamp: '2 days ago',
    },
];

interface NotificationsPopupProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function NotificationsPopup({ isOpen, onClose }: NotificationsPopupProps) {
    const popupRef = useRef<HTMLDivElement>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [notifications, setNotifications] = useState<Notification[]>([]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            // Simulate loading
            setIsLoading(true);
            const timer = setTimeout(() => {
                setNotifications(mockNotifications);
                setIsLoading(false);
            }, 1500);
            return () => {
                clearTimeout(timer);
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const importantNotifs = notifications.filter(n => n.isImportant);
    const otherNotifs = notifications.filter(n => !n.isImportant);

    return (
        <div
            ref={popupRef}
            className="absolute top-full mt-2 right-0 w-[420px] max-h-[80vh] bg-[#212121] rounded-xl shadow-2xl z-[100] text-white border border-white/10 overflow-hidden"
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <h2 className="text-[16px] font-bold">Notifications</h2>
                <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </button>
            </div>

            {/* Content */}
            <div className="max-h-[calc(80vh-60px)] overflow-y-auto custom-scrollbar">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-16">
                        <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                        <p className="text-zinc-500 text-sm mt-4">Loading notifications...</p>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16">
                        <svg className="w-16 h-16 text-zinc-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        <p className="text-zinc-500 text-sm">No notifications yet</p>
                    </div>
                ) : (
                    <>
                        {/* Important Section */}
                        {importantNotifs.length > 0 && (
                            <div className="py-2">
                                <h3 className="px-4 py-2 text-[13px] font-bold text-zinc-400">Important</h3>
                                {importantNotifs.map(notif => (
                                    <NotificationItem key={notif.id} notification={notif} />
                                ))}
                            </div>
                        )}

                        {/* More Notifications Section */}
                        {otherNotifs.length > 0 && (
                            <div className="py-2 border-t border-white/5">
                                <h3 className="px-4 py-2 text-[13px] font-bold text-zinc-400">More notifications</h3>
                                {otherNotifs.map(notif => (
                                    <NotificationItem key={notif.id} notification={notif} />
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

function NotificationItem({ notification }: { notification: Notification }) {
    return (
        <Link
            href={`/watch/${notification.id}`}
            className="flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition-colors group"
        >
            {/* Blue dot for unread */}
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-5 flex-shrink-0" />

            {/* Channel Avatar */}
            <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-700 flex-shrink-0">
                <img src={notification.channelAvatar} alt={notification.channelName} className="w-full h-full object-cover" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <p className="text-[13px] text-white leading-snug">
                    <span className="font-bold">{notification.channelName}</span>{' '}
                    <span className="text-zinc-300">{notification.message}</span>
                </p>
                <p className="text-[12px] text-zinc-500 mt-1">{notification.timestamp}</p>
            </div>

            {/* Thumbnail */}
            <div className="w-[100px] aspect-video rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0">
                <img src={notification.thumbnail} alt="" className="w-full h-full object-cover" />
            </div>

            {/* More options */}
            <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                className="p-1 text-zinc-500 hover:text-white hover:bg-white/10 rounded-full transition-colors opacity-0 group-hover:opacity-100"
            >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                </svg>
            </button>
        </Link>
    );
}
