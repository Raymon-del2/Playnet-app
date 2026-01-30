'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface CreateBottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function CreateBottomSheet({ isOpen, onClose }: CreateBottomSheetProps) {
    const router = useRouter();
    const [isAnimating, setIsAnimating] = useState(false);
    const [shouldRender, setShouldRender] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setShouldRender(true);
            // Small delay to trigger animation
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setIsAnimating(true);
                });
            });
        } else {
            setIsAnimating(false);
            const timer = setTimeout(() => setShouldRender(false), 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    const handleClose = () => {
        setIsAnimating(false);
        setTimeout(onClose, 300);
    };

    const handleNavigate = (path: string) => {
        handleClose();
        setTimeout(() => router.push(path), 150);
    };

    if (!shouldRender) return null;

    const menuItems = [
        {
            icon: (
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 via-yellow-500 to-blue-500 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                </div>
            ),
            label: 'Create a Style',
            description: 'Record vertical clips up to 60s',
            action: () => handleNavigate('/create/style'),
        },
        {
            icon: (
                <div className="w-12 h-12 rounded-2xl bg-zinc-800 border border-white/10 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                </div>
            ),
            label: 'Upload a video',
            description: 'Share from your gallery',
            action: () => handleNavigate('/studio/content'),
        },
        {
            icon: (
                <div className="w-12 h-12 rounded-2xl bg-red-600/20 border border-red-500/30 flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="4" />
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" opacity="0.3" />
                    </svg>
                </div>
            ),
            label: 'Go live',
            description: 'Start streaming now',
            action: () => handleNavigate('/studio/live'),
        },
        {
            icon: (
                <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                    </svg>
                </div>
            ),
            label: 'Create a post',
            description: 'Share with your community',
            action: () => handleNavigate('/create/post'),
        },
    ];

    return (
        <div className="fixed inset-0 z-[200] lg:hidden">
            {/* Scrim overlay */}
            <div
                className={`absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${isAnimating ? 'opacity-100' : 'opacity-0'}`}
                onClick={handleClose}
            />

            {/* Bottom sheet */}
            <div
                className={`absolute bottom-0 left-0 right-0 bg-zinc-900 rounded-t-[32px] transition-transform duration-300 ease-out ${isAnimating ? 'translate-y-0' : 'translate-y-full'}`}
                style={{ paddingBottom: 'env(safe-area-inset-bottom, 20px)' }}
            >
                {/* Handle bar */}
                <div className="flex justify-center pt-3 pb-2">
                    <div className="w-10 h-1 bg-zinc-600 rounded-full" />
                </div>

                {/* Header */}
                <div className="px-6 pb-4">
                    <h2 className="text-xl font-black text-white tracking-tight">Create</h2>
                </div>

                {/* Menu items */}
                <div className="px-4 pb-6 space-y-1">
                    {menuItems.map((item, index) => (
                        <button
                            key={index}
                            onClick={item.action}
                            className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-white/5 active:bg-white/10 active:scale-[0.98] transition-all text-left"
                        >
                            {item.icon}
                            <div className="flex-1">
                                <div className="text-white font-bold text-[15px]">{item.label}</div>
                                <div className="text-zinc-500 text-xs">{item.description}</div>
                            </div>
                            <svg className="w-5 h-5 text-zinc-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                            </svg>
                        </button>
                    ))}
                </div>

                {/* Cancel button */}
                <div className="px-4 pb-4">
                    <button
                        onClick={handleClose}
                        className="w-full py-3.5 bg-zinc-800 rounded-2xl text-white font-bold text-sm hover:bg-zinc-700 active:scale-[0.98] transition-all"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
