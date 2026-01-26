'use client';

import { useState, useEffect } from 'react';
import { getActiveProfile } from '@/app/actions/profile';
import Link from 'next/link';
import { supabase, Video } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';

export default function ChannelPage() {
    const [activeProfile, setActiveProfile] = useState<any>(null);
    const [videos, setVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('Home');

    useEffect(() => {
        const fetchData = async () => {
            const profile = await getActiveProfile();
            setActiveProfile(profile);

            if (profile) {
                // Fetch videos for this channel
                // NOTE: If RLS is enabled in Supabase, ensure you have a "Select" policy 
                // that allows public (anon) access to the 'videos' table.
                const { data, error } = await supabase!
                    .from('videos')
                    .select('*')
                    .eq('channel_id', profile.id)
                    .order('created_at', { ascending: false });

                if (data) {
                    setVideos(data);
                } else if (error) {
                    console.error('Error fetching channel videos:', error);
                }
            }
            setLoading(false);
        };
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] bg-black text-white">
                <div className="w-12 h-12 border-4 border-white/10 border-t-white rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!activeProfile) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 bg-black text-white">
                <h1 className="text-2xl font-bold">No active profile selected</h1>
                <Link href="/select-profile" className="px-6 py-2 bg-white text-black rounded-full font-bold">
                    Select Profile
                </Link>
            </div>
        );
    }

    const handle = `@${activeProfile.name.replace(/\s+/g, '')}-g8j`;

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Header Section */}
            <div className="max-w-[1284px] mx-auto px-4 md:px-6 pt-6 sm:pt-10">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-10">
                    {/* Avatar */}
                    <div className="w-[120px] h-[120px] sm:w-[160px] sm:h-[160px] rounded-full overflow-hidden bg-zinc-800 flex-shrink-0">
                        {activeProfile.avatar ? (
                            <img src={activeProfile.avatar} alt={activeProfile.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-zinc-500">
                                {activeProfile.name[0]?.toUpperCase()}
                            </div>
                        )}
                    </div>

                    {/* Info */}
                    <div className="flex flex-col items-center sm:items-start text-center sm:text-left flex-1">
                        <h1 className="text-[24px] sm:text-[36px] font-black leading-tight mb-1">{activeProfile.name}</h1>
                        <div className="flex flex-wrap justify-center sm:justify-start items-center gap-x-2 text-[14px] text-zinc-400 font-medium mb-3">
                            <span className="text-white font-bold">{handle}</span>
                            <span>•</span>
                            <span>No subscribers</span>
                            <span>•</span>
                            <span>{videos.length} videos</span>
                        </div>

                        <div className="text-[14px] text-zinc-400 mb-6 max-w-2xl group cursor-pointer">
                            More about this channel <span className="text-zinc-500 font-bold group-hover:text-white transition-colors">...more</span>
                        </div>

                        <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                            <Link href="/studio/content">
                                <button className="h-9 px-4 bg-zinc-800 hover:bg-zinc-700 rounded-full text-sm font-bold transition-colors">
                                    Manage videos
                                </button>
                            </Link>
                            <button className="h-9 px-4 bg-zinc-800 hover:bg-zinc-700 rounded-full text-sm font-bold transition-colors">
                                Customize channel
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="mt-8 border-b border-white/10">
                    <div className="flex items-center gap-4 sm:gap-8 overflow-x-auto no-scrollbar">
                        {['Home', 'Playlists', 'Posts'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`pb-3 text-sm sm:text-[15px] font-bold whitespace-nowrap transition-colors relative ${activeTab === tab ? 'text-white' : 'text-zinc-400 hover:text-white'
                                    }`}
                            >
                                {tab}
                                {activeTab === tab && (
                                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white rounded-full" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content Area */}
                <div className="py-8">
                    {/* Home Tab Content */}
                    {activeTab === 'Home' && (
                        videos.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
                                {videos.map((video) => (
                                    <Link key={video.id} href={video.is_short ? `/styles/${video.id}` : `/watch/${video.id}`} className="flex flex-col gap-2 group">
                                        <div className={`relative bg-zinc-800 rounded-xl overflow-hidden ${video.is_short ? 'aspect-[9/16]' : 'aspect-video'} shadow-lg border border-white/5`}>
                                            <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
                                            {video.duration && !video.is_short && (
                                                <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                                                    {video.duration}
                                                </div>
                                            )}
                                            {video.is_short && (
                                                <div className="absolute bottom-2 right-2 flex items-center gap-1">
                                                    <img src="/styles-icon.svg?v=white" className="w-4 h-4 drop-shadow-md" alt="" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <h3 className="text-white font-bold text-[14px] leading-tight line-clamp-2 group-hover:text-blue-400 transition-colors">
                                                {video.title}
                                            </h3>
                                            <div className="text-zinc-400 text-[12px] font-medium flex items-center gap-1">
                                                <span>{video.views} views</span>
                                                <span>•</span>
                                                <span>{formatDistanceToNow(new Date(video.created_at), { addSuffix: true })}</span>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center text-center py-20">
                                <div className="w-32 h-32 bg-zinc-900 rounded-full flex items-center justify-center mb-6 border border-white/5 shadow-2xl">
                                    <svg className="w-12 h-12 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 00-2 2z" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Upload a video to get started</h3>
                                <p className="text-zinc-400 mb-8 max-w-sm leading-relaxed text-sm">
                                    Start sharing your story and connecting with viewers. Videos you upload will show up here.
                                </p>
                                <Link href="/studio/content">
                                    <button className="bg-white hover:bg-zinc-200 text-black px-8 py-2.5 rounded-full font-bold text-sm transition-all active:scale-95 shadow-lg">
                                        Create Video
                                    </button>
                                </Link>
                            </div>
                        )
                    )}

                    {activeTab !== 'Home' && (
                        <div className="flex flex-col items-center justify-center py-32 text-zinc-500">
                            <p className="font-medium">This tab is empty</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
