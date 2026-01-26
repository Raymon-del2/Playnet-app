'use client';

import { useState, useEffect } from 'react';
import { getActiveProfile } from '@/app/actions/profile';
import { getSubscriptions, getSuggestedCreators, subscribe, unsubscribe } from '@/app/actions/subscription';
import Link from 'next/link';

type Channel = {
    id: string;
    name: string;
    avatar: string;
    description: string;
    verified: boolean;
};

export default function SubscriptionsPage() {
    const [activeProfile, setActiveProfile] = useState<any>(null);
    const [subscriptions, setSubscriptions] = useState<Channel[]>([]);
    const [suggestions, setSuggestions] = useState<Channel[]>([]);
    const [selfChannel, setSelfChannel] = useState<Channel | null>(null);
    const [loading, setLoading] = useState(true);
    const [processingMap, setProcessingMap] = useState<Record<string, boolean>>({});

    useEffect(() => {
        const fetchData = async () => {
            try {
                const profile = await getActiveProfile();
                setActiveProfile(profile);

                if (profile) {
                    const [subs, suggsData] = await Promise.all([
                        getSubscriptions(profile.id),
                        getSuggestedCreators(profile.id)
                    ]);
                    setSubscriptions(subs);
                    // Handle new response structure
                    if (suggsData && typeof suggsData === 'object' && 'suggested' in suggsData) {
                        setSuggestions(suggsData.suggested);
                        setSelfChannel(suggsData.self);
                    } else {
                        // Fallback for safety if type mismatch (though we updated the action)
                        setSuggestions(Array.isArray(suggsData) ? suggsData : []);
                    }
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleSubscribe = async (channel: Channel, isSubscribing: boolean) => {
        if (!activeProfile || processingMap[channel.id]) return;

        setProcessingMap(prev => ({ ...prev, [channel.id]: true }));

        // Optimistic update
        if (isSubscribing) {
            setSubscriptions(prev => [...prev, channel]);
            setSuggestions(prev => prev.filter(c => c.id !== channel.id));
        } else {
            setSubscriptions(prev => prev.filter(c => c.id !== channel.id));
            setSuggestions(prev => [...prev, channel]);
        }

        try {
            if (isSubscribing) {
                await subscribe(activeProfile.id, channel.id);
            } else {
                await unsubscribe(activeProfile.id, channel.id);
            }

            // Refresh list from server to confirm
            const latestSubs = await getSubscriptions(activeProfile.id);
            setSubscriptions(latestSubs);

        } catch (error) {
            console.error(error);
            // Revert on error
            if (activeProfile) {
                const revertSubs = await getSubscriptions(activeProfile.id);
                setSubscriptions(revertSubs);
            }
        } finally {
            setProcessingMap(prev => ({ ...prev, [channel.id]: false }));
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-zinc-600 border-t-white rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!activeProfile) {
        return (
            <div className="min-h-screen bg-[#0f0f0f] text-white flex flex-col items-center justify-center gap-4">
                <h1 className="text-xl font-bold">Sign in to see updates from your favorite channels</h1>
                <Link href="/select-profile" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold transition-colors">
                    Sign In
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0f0f0f] text-white p-6 pb-20">
            <h1 className="text-2xl font-bold mb-6">Subscriptions</h1>

            {/* Subscriptions List */}
            {subscriptions.length > 0 ? (
                <div className="mb-10">
                    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                        {subscriptions.map((sub) => (
                            <div key={sub.id} className="flex flex-col items-center min-w-[80px] group cursor-pointer gap-2">
                                <Link href={`/channel/${sub.id}`}>
                                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-transparent group-hover:border-white transition-colors bg-zinc-800">
                                        <img src={sub.avatar} alt={sub.name} className="w-full h-full object-cover" />
                                    </div>
                                    <p className="text-xs text-center text-zinc-400 group-hover:text-white mt-1 truncate w-20 leading-tight">
                                        {sub.name}
                                    </p>
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center mb-8 border-b border-white/10 pb-10">
                    <div className="w-20 h-20 bg-zinc-800/50 rounded-full flex items-center justify-center mb-4 text-zinc-500">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                        </svg>
                    </div>
                    <h2 className="text-lg font-bold">You don't have any subscriptions</h2>
                    <p className="text-zinc-400 text-sm mt-1 max-w-md">
                        Subscribe to creators to see their videos here.
                    </p>
                </div>
            )}

            {/* Suggestions & Self */}
            {(suggestions.length > 0 || subscriptions.length === 0 || selfChannel) && (
                <div>
                    <h2 className="text-lg font-bold mb-2">Recommended for you</h2>
                    <p className="text-sm text-zinc-400 mb-6">Subscribe to get recommended videos from these top creators</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {selfChannel && (
                            <div key={selfChannel.id} className="bg-zinc-900/50 border border-blue-500/30 rounded-xl p-4 flex items-center gap-4 hover:bg-zinc-800/80 transition-colors relative overflow-hidden">
                                <div className="absolute top-0 right-0 bg-blue-600 text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">YOU</div>
                                <Link href={`/channel/${selfChannel.id}`} className="flex-shrink-0">
                                    <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-700 ring-2 ring-blue-500/50">
                                        <img src={selfChannel.avatar} alt={selfChannel.name} className="w-full h-full object-cover" />
                                    </div>
                                </Link>
                                <div className="flex-1 min-w-0">
                                    <Link href={`/channel/${selfChannel.id}`}>
                                        <h3 className="font-bold text-sm truncate text-white">{selfChannel.name}</h3>
                                        <p className="text-xs text-blue-400 truncate">Your Channel</p>
                                    </Link>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleSubscribe(selfChannel, true)}
                                        disabled={processingMap[selfChannel.id]}
                                        className="bg-zinc-800 text-white px-4 py-1.5 rounded-full text-xs font-bold hover:bg-zinc-700 transition-colors border border-white/10 disabled:opacity-50"
                                    >
                                        Sub
                                    </button>
                                    <Link href="/studio/content">
                                        <button className="bg-blue-600 text-white px-4 py-1.5 rounded-full text-xs font-bold hover:bg-blue-700 transition-colors">
                                            Manage
                                        </button>
                                    </Link>
                                </div>
                            </div>
                        )}

                        {suggestions.map((creator) => (
                            <div key={creator.id} className="bg-zinc-900 rounded-xl p-4 flex items-center gap-4 hover:bg-zinc-800/80 transition-colors border border-white/5">
                                <Link href={`/channel/${creator.id}`} className="flex-shrink-0">
                                    <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-700">
                                        <img src={creator.avatar} alt={creator.name} className="w-full h-full object-cover" />
                                    </div>
                                </Link>
                                <div className="flex-1 min-w-0">
                                    <Link href={`/channel/${creator.id}`}>
                                        <h3 className="font-bold text-sm truncate hover:text-blue-400 transition-colors">{creator.name}</h3>
                                        <p className="text-xs text-zinc-500 truncate">{creator.description || 'Content Creator'}</p>
                                    </Link>
                                </div>
                                <button
                                    onClick={() => handleSubscribe(creator, true)}
                                    disabled={processingMap[creator.id]}
                                    className="bg-white text-black px-4 py-1.5 rounded-full text-xs font-bold hover:bg-zinc-200 transition-colors disabled:opacity-50"
                                >
                                    Subscribe
                                </button>
                            </div>
                        ))}
                    </div>

                    {suggestions.length === 0 && !selfChannel && subscriptions.length === 0 && !loading && (
                        <div className="text-center py-10 text-zinc-500 text-sm">
                            No active creators found to recommend right now. <br /> Be the first to upload a video!
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
