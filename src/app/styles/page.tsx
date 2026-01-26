'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getVideos } from '@/lib/supabase';
import Link from 'next/link';

export default function StylesPage() {
    const router = useRouter();
    const [noStyles, setNoStyles] = useState(false);

    useEffect(() => {
        const fetchFirstStyle = async () => {
            try {
                const data = await getVideos(50, 0);
                const firstStyle = (data || []).find(v => v.is_short);
                if (firstStyle) {
                    router.replace(`/styles/${firstStyle.id}`);
                } else {
                    setNoStyles(true);
                }
            } catch (error) {
                console.error(error);
                setNoStyles(true);
            }
        };
        fetchFirstStyle();
    }, [router]);

    if (noStyles) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-center">
                <div className="w-20 h-20 bg-zinc-800 rounded-2xl flex items-center justify-center mb-6">
                    <svg className="w-10 h-10 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 00-2 2z" />
                    </svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2 uppercase tracking-tighter">No Styles Found</h2>
                <p className="text-zinc-500 mb-8 max-w-xs">Be the first to upload a professional Style to Playra!</p>
                <Link href="/studio/content" className="px-8 py-3 bg-white text-black rounded-full font-black uppercase text-sm hover:bg-zinc-200 transition-colors">
                    Go to Studio
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
        </div>
    );
}
