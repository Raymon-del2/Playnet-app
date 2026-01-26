'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { getVideos, getStyles, Video, getVideoById } from '@/lib/supabase';

type ReactionState = {
  likes: number;
  dislikes: number;
  isLiked: boolean;
  isDisliked: boolean;
};

const shareApps = [
  { label: 'WhatsApp', color: 'bg-[#22c55e]', text: 'WA' },
  { label: 'Facebook', color: 'bg-[#2563eb]', text: 'f' },
  { label: 'X', color: 'bg-black', text: 'X' },
  { label: 'Email', color: 'bg-gray-500', text: '@' },
  { label: 'KakaoTalk', color: 'bg-[#facc15]', text: 'KT', textColor: 'text-black' },
  { label: 'More', color: 'bg-[#f97316]', text: '>' },
];

export default function StylesDetailPage() {
  const params = useParams();
  const router = useRouter();
  const styleId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [clips, setClips] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [reactions, setReactions] = useState<Record<string, ReactionState>>({});
  const [commentsForId, setCommentsForId] = useState<string | null>(null);
  const [shareForId, setShareForId] = useState<string | null>(null);

  const [shareCopied, setShareCopied] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const offsetRef = useRef(0);

  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  // Re-implementing the mount logic to avoid re-fetching on URL change caused by scrolling
  // We use a ref to track if we initialized
  const initializedRef = useRef(false);
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const init = async () => {
      // Same logic as above
      try {
        setIsLoading(true);
        const limit = 10;
        const data = await getStyles(limit, 0); // Get latest

        if (data && data.length > 0) {
          // If specific ID is requested, allow finding it
          let startIndex = 0;
          let mergedData = data;

          // Simple check: Is the requested ID in the first batch?
          const foundIndex = data.findIndex(v => v.id === styleId);

          if (styleId && foundIndex === -1) {
            // Not found in HEAD. Only fetch if styleId is valid
            // For MVP simplicity: we won't do complex "jump to middle of stream".
            // We will just let the user start at the top (Latest).
            // Or we could try fetching it? 
            // Let's fetch it to ensure it renders if they shared a link.
            // const specificVideo = await getVideoById(styleId);
            // if (specificVideo && specificVideo.is_short) {
            //    mergedData = [specificVideo, ...data.filter(d => d.id !== styleId)];
            //    startIndex = 0;
            // }
            // Ignoring complex deep-linking for now, focused on "Seeing all styles" feed.
          } else if (foundIndex !== -1) {
            startIndex = foundIndex;
          }

          setClips(mergedData);
          setActiveIndex(startIndex);
          offsetRef.current = limit;
          if (data.length < limit) setHasMore(false);

          // Reactions
          const initialReactions: Record<string, ReactionState> = {};
          mergedData.forEach(clip => {
            initialReactions[clip.id] = { likes: clip.views % 1000, dislikes: 0, isLiked: false, isDisliked: false };
          });
          setReactions(initialReactions);
        } else {
          setClips([]);
          setHasMore(false);
        }
      } catch (e) { console.error(e); } finally { setIsLoading(false); }
    }
    init();
  }, []); // Run ONCE on mount

  // Load More Logic
  useEffect(() => {
    if (activeIndex >= clips.length - 3 && hasMore && !isFetchingMore && clips.length > 0) {
      const loadMore = async () => {
        setIsFetchingMore(true);
        const limit = 10;
        const newData = await getStyles(limit, offsetRef.current);

        if (newData && newData.length > 0) {
          setClips(prev => {
            // Filter duplicates just in case
            const existingIds = new Set(prev.map(p => p.id));
            const uniqueNew = newData.filter(n => !existingIds.has(n.id));
            return [...prev, ...uniqueNew];
          });
          offsetRef.current += limit;

          // Add reactions for new items
          setReactions(prev => {
            const additional: Record<string, ReactionState> = {};
            newData.forEach(clip => additional[clip.id] = { likes: clip.views % 1000, dislikes: 0, isLiked: false, isDisliked: false });
            return { ...prev, ...additional };
          });
        } else {
          setHasMore(false);
        }
        setIsFetchingMore(false);
      };
      loadMore();
    }
  }, [activeIndex, clips.length, hasMore, isFetchingMore]);

  useEffect(() => {
    document.documentElement.classList.add('styles-scrollbar-hidden');
    document.body.classList.add('styles-scrollbar-hidden');
    return () => {
      document.documentElement.classList.remove('styles-scrollbar-hidden');
      document.body.classList.remove('styles-scrollbar-hidden');
    };
  }, []);

  const handleToggleShare = (clipId: string) => {
    setShareForId((prev) => (prev === clipId ? null : clipId));
    setShareCopied(false);
  };

  const handleCopyShare = (url: string) => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).catch(() => undefined);
    }
    setShareCopied(true);
    window.setTimeout(() => setShareCopied(false), 1500);
  };

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    slideRefs.current.forEach((element, index) => {
      if (!element) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveIndex(index);
            // Update URL to current clip without full reload
            const currentClip = clips[index];
            if (currentClip) {
              window.history.replaceState(null, '', `/styles/${currentClip.id}`);
            }
          }
        },
        { threshold: 0.6 },
      );
      observer.observe(element);
      observers.push(observer);
    });
    return () => observers.forEach((observer) => observer.disconnect());
  }, [clips]);

  useEffect(() => {
    videoRefs.current.forEach((video) => {
      if (!video) return;
      video.pause();
    });

    const timer = window.setTimeout(() => {
      const activeVideo = videoRefs.current[activeIndex];
      if (!activeVideo) return;
      activeVideo.play().catch(() => undefined);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [activeIndex, clips]);

  // Scroll to active index on load
  useEffect(() => {
    if (!isLoading && clips.length > 0 && activeIndex !== -1) {
      // Only scroll if we are not already near it (e.g. initial load)
      // Actually the 'snap' css handles scrolling mostly, we just need to set initial position
      const activeElement = slideRefs.current[activeIndex];
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'auto', block: 'start' });
      }
    }
  }, [isLoading]); // Only on loading finish

  const handleScrollTo = (index: number) => {
    if (index < 0 || index >= clips.length) return;
    const target = slideRefs.current[index];
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleLike = (clipId: string) => {
    setReactions((prev) => {
      const current = prev[clipId];
      if (!current) return prev;
      const next = { ...current };
      if (next.isLiked) {
        next.likes -= 1;
        next.isLiked = false;
      } else {
        if (next.isDisliked) {
          next.dislikes -= 1;
          next.isDisliked = false;
        }
        next.likes += 1;
        next.isLiked = true;
      }
      return { ...prev, [clipId]: next };
    });
  };

  const handleDislike = (clipId: string) => {
    setReactions((prev) => {
      const current = prev[clipId];
      if (!current) return prev;
      const next = { ...current };
      if (next.isDisliked) {
        next.dislikes -= 1;
        next.isDisliked = false;
      } else {
        if (next.isLiked) {
          next.likes -= 1;
          next.isLiked = false;
        }
        next.dislikes += 1;
        next.isDisliked = true;
      }
      return { ...prev, [clipId]: next };
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-white/10 border-t-white rounded-full animate-spin"></div>
        <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Loading Styles...</p>
      </div>
    );
  }

  if (clips.length === 0) {
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
    <div className="h-[calc(100vh-56px)] lg:h-[calc(100vh-64px)] bg-black text-white overflow-y-scroll snap-y snap-mandatory styles-scrollbar-hidden flex flex-col items-center no-scrollbar">
      <div className="w-full lg:max-w-[500px]">
        {clips.map((clip, index) => {
          const reaction = reactions[clip.id] || { likes: 0, dislikes: 0, isLiked: false, isDisliked: false };
          const isCommentsOpen = commentsForId === clip.id;
          const isShareOpen = shareForId === clip.id;
          const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/styles/${clip.id}` : '';

          return (
            <div
              key={clip.id}
              ref={(element) => {
                slideRefs.current[index] = element;
              }}
              className="relative h-screen lg:h-[calc(100vh-64px)] flex items-center justify-center snap-start snap-always lg:py-4"
            >
              <div className="relative w-full h-full lg:aspect-[9/16] bg-zinc-900 lg:rounded-2xl overflow-hidden shadow-2xl flex items-center group">
                <video
                  ref={(element) => {
                    videoRefs.current[index] = element;
                  }}
                  className="w-full h-full object-cover cursor-pointer"
                  poster={clip.thumbnail_url}
                  muted={isMuted}
                  loop
                  playsInline
                  preload="auto"
                  controls={false}
                  onClick={(e) => {
                    const v = e.currentTarget;
                    if (v.paused) v.play(); else v.pause();
                  }}
                >
                  <source src={clip.video_url} type="video/mp4" />
                </video>

                {/* Mute Toggle Overlay */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMuted(!isMuted);
                  }}
                  className="absolute top-4 right-4 p-2 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-black/60 transition-colors z-20"
                >
                  {isMuted ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" /></svg>
                  )}
                </button>

                {/* Overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

                {/* Bottom Section */}
                <div className="absolute bottom-6 left-4 right-16 pointer-events-auto">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-zinc-800 border border-white/10 overflow-hidden">
                        <img src={clip.channel_avatar} alt="" className="w-full h-full object-cover" />
                      </div>
                      <span className="font-bold text-[15px] drop-shadow-lg text-white uppercase tracking-tighter">@{clip.channel_name}</span>
                      <button className="px-5 py-1.5 bg-white text-black text-[13px] font-black rounded-full active:scale-95 transition-all shadow-xl uppercase">
                        Follow
                      </button>
                    </div>

                    <p className="text-[14px] leading-tight text-white font-medium drop-shadow-2xl line-clamp-2 max-w-[85%] uppercase italic tracking-tight">{clip.title}</p>

                    <div className="flex items-center gap-2 bg-black/30 backdrop-blur-xl w-fit px-3 py-1.5 rounded-full border border-white/10 group cursor-pointer active:scale-95 transition-all">
                      <div className="w-4 h-4 text-white">
                        <svg fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" /></svg>
                      </div>
                      <div className="flex items-center overflow-hidden h-4">
                        <span className="text-[11px] text-white font-black whitespace-nowrap uppercase tracking-widest">Original Style • {clip.channel_name}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Control Buttons (Right Side) */}
                <div className="absolute bottom-16 right-2 flex flex-col items-center gap-5 z-20 pointer-events-auto">
                  <button onClick={() => handleLike(clip.id)} className="flex flex-col items-center">
                    <div className={`p-2.5 rounded-full backdrop-blur-md transition-all active:scale-90 ${reaction.isLiked ? 'bg-white/20 text-blue-400' : 'hover:bg-white/10 text-white'}`}>
                      <svg className="w-8 h-8" fill={reaction.isLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.25c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 0 1 2.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 0 0 .322-1.672V2.75a.75.75 0 0 1 .75-.75 2.25 2.25 0 0 1 2.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 0 1-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 0 0-1.423-.23H5.904m10.598-9.75H14.25M5.904 18.5c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.527c-1.325 0-2.4-1.075-2.4-2.4V10.6c0-1.325 1.075-2.4 2.4-2.4h.527c.445 0 .72.498.523.898a4.512 4.512 0 0 0-.27.602" /></svg>
                    </div>
                    <span className="text-[12px] text-white mt-1 font-bold">{reaction.likes}</span>
                  </button>

                  <button onClick={() => handleDislike(clip.id)} className="flex flex-col items-center">
                    <div className={`p-2.5 rounded-full backdrop-blur-md transition-all active:scale-90 ${reaction.isDisliked ? 'bg-white/20 text-blue-400' : 'hover:bg-white/10 text-white'}`}>
                      <svg className="w-8 h-8" fill={reaction.isDisliked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 13.5l3 3m0 0l3-3m-3 3v-10m10 10a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" /></svg>
                    </div>
                    <span className="text-[12px] text-white mt-1 font-bold">Dislike</span>
                  </button>

                  <button onClick={() => setCommentsForId(clip.id)} className="group/btn flex flex-col items-center">
                    <div className="p-2.5 rounded-full backdrop-blur-md hover:bg-white/10 transition-all active:scale-90 text-white">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v5.009z" /></svg>
                    </div>
                    <span className="text-[12px] text-white mt-1 font-bold">0</span>
                  </button>

                  <button onClick={() => handleToggleShare(clip.id)} className="group/btn flex flex-col items-center">
                    <div className="p-2.5 rounded-full backdrop-blur-md hover:bg-white/10 transition-all active:scale-90 text-white">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 003.933 2.185 2.25 2.25 0 00-3.933 2.185z" /></svg>
                    </div>
                    <span className="text-[12px] text-white mt-1 font-bold uppercase">Share</span>
                  </button>

                  <div className="mt-2 group cursor-pointer relative">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 border-2 border-white/20 animate-[spin_4s_linear_infinite] overflow-hidden flex items-center justify-center p-1">
                      <div className="w-full h-full rounded-full bg-gradient-to-tr from-zinc-700 to-black animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>

              {isShareOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm">
                  <div className="bg-[#1c1c1c] w-full max-w-md rounded-2xl p-6 shadow-2xl">
                    <div className="flex justify-between items-center mb-8">
                      <h3 className="text-xl font-bold uppercase tracking-tighter">Share Style</h3>
                      <button onClick={() => setShareForId(null)} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="flex gap-5 overflow-x-auto pb-6 mb-8 scrollbar-hide">
                      {shareApps.map(app => (
                        <button key={app.label} className="flex flex-col items-center gap-3 min-w-[70px] group">
                          <div className={`${app.color} w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg group-hover:scale-110 transition-transform shadow-lg`}>{app.text}</div>
                          <span className="text-[11px] font-medium text-zinc-400 group-hover:text-white uppercase tracking-tighter">{app.label}</span>
                        </button>
                      ))}
                    </div>
                    <div className="bg-zinc-900 p-4 rounded-xl flex items-center gap-4 border border-zinc-800 ring-1 ring-white/5">
                      <p className="text-xs flex-1 truncate text-zinc-400 font-medium">{shareUrl}</p>
                      <button onClick={() => handleCopyShare(shareUrl)} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-lg text-xs transition-colors shadow-lg uppercase">
                        {shareCopied ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Scroll Navigation Controls (Desktop) */}
      <div className="fixed right-6 lg:right-12 bottom-12 flex flex-col gap-4 z-[50] hidden lg:flex">
        <button
          onClick={() => handleScrollTo(activeIndex - 1)}
          className="p-4 bg-zinc-800/90 rounded-full hover:bg-zinc-700 transition-all shadow-xl hover:scale-110 active:scale-95 group disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={activeIndex === 0}
          aria-label="Previous style"
        >
          <svg className="w-6 h-6 group-hover:-translate-y-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" />
          </svg>
        </button>
        <button
          onClick={() => handleScrollTo(activeIndex + 1)}
          className="p-4 bg-zinc-800/90 rounded-full hover:bg-zinc-700 transition-all shadow-xl hover:scale-110 active:scale-95 group disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={activeIndex === clips.length - 1}
          aria-label="Next style"
        >
          <svg className="w-6 h-6 group-hover:translate-y-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
