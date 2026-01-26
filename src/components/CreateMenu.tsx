'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

interface CreateMenuProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function CreateMenu({ isOpen, onClose }: CreateMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            ref={menuRef}
            className="absolute top-full mt-2 right-0 w-[180px] bg-[#282828] rounded-xl shadow-2xl z-[100] text-white border border-white/10 py-2 overflow-hidden"
        >
            <Link
                href="/upload"
                onClick={onClose}
                className="flex items-center gap-4 px-4 py-2.5 hover:bg-white/10 transition-colors group"
            >
                <div className="w-6 h-6 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                    </svg>
                </div>
                <span className="text-[14px] font-medium">Upload video</span>
            </Link>

            <button
                onClick={onClose}
                className="flex items-center gap-4 px-4 py-2.5 hover:bg-white/10 transition-colors group w-full text-left"
            >
                <div className="w-6 h-6 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
                    </svg>
                </div>
                <span className="text-[14px] font-medium">Go live</span>
            </button>

            <button
                onClick={onClose}
                className="flex items-center gap-4 px-4 py-2.5 hover:bg-white/10 transition-colors group w-full text-left"
            >
                <div className="w-6 h-6 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                    </svg>
                </div>
                <span className="text-[14px] font-medium">Create post</span>
            </button>
        </div>
    );
}
