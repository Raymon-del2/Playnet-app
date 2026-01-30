'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { getVideos, getStyles, Video, getVideoById } from '@/lib/supabase';
import { getActiveProfile } from '@/app/actions/profile';
import ShareButton from '@/components/ShareButton';
import CommentButton from '@/components/CommentButton';
import CommentsSheet from '@/components/CommentsSheet';
import SoundDisk from '@/components/SoundDisk';

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

const VIDEO_FILTERS = [
  { id: 'none', name: 'Original', class: 'style-none' },
  { id: 'cinema', name: 'Cinema', class: 'style-cinema' },
  { id: 'retro', name: 'Retro', class: 'style-retro' },
  { id: 'neon', name: 'Neon', class: 'style-neon' },
  { id: 'noir', name: 'Noir', class: 'style-noir' },
  { id: 'dreamy', name: 'Dreamy', class: 'style-dreamy' },
  { id: 'warm', name: 'Warm', class: 'style-warm' },
  { id: 'vibrant', name: 'Vibrant', class: 'style-vibrant' },
];

export default function StylesDetailPage() {
  const params = useParams();
  const styleId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  return <StylesFeed styleId={styleId} />;
}

function StylesFeed({ styleId }: { styleId?: string }) {
  const router = useRouter();
  const [activeProfile, setActiveProfile] = useState<any>(null);
  const [clips, setClips] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [reactions, setReactions] = useState<Record<string, ReactionState>>({});
  const [commentsForId, setCommentsForId] = useState<string | null>(null);
  const [shareForId, setShareForId] = useState<string | null>(null);

  const [shareCopied, setShareCopied] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [activeFilterIndex, setActiveFilterIndex] = useState(0);
  const [showFilterToast, setShowFilterToast] = useState(false);
  const [progress, setProgress] = useState<Record<string, number>>({});

  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const offsetRef = useRef(0);

  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  const initializedRef = useRef(false);
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const init = async () => {
      try {
        setIsLoading(true);
        const profile = await getActiveProfile();
        setActiveProfile(profile);
        const filterType = profile?.account_type || 'general';

        const limit = 15;
        const data = await getStyles(limit, 0, filterType);

        if (data && data.length > 0) {
          let startIndex = 0;
          const foundIndex = data.findIndex(v => v.id === styleId);
          if (foundIndex !== -1) startIndex = foundIndex;

          setClips(data);
          setActiveIndex(startIndex);
          offsetRef.current = limit;
          if (data.length < limit) setHasMore(false);

          const initialReactions: Record<string, ReactionState> = {};
          data.forEach(clip => {
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
  }, [styleId]);

  useEffect(() => {
    if (activeIndex >= clips.length - 3 && hasMore && !isFetchingMore && clips.length > 0) {
      const loadMore = async () => {
        setIsFetchingMore(true);
        const limit = 10;
        const filterType = activeProfile?.account_type || 'general';
        const newData = await getStyles(limit, offsetRef.current, filterType);

        if (newData && newData.length > 0) {
          setClips(prev => {
            const existingIds = new Set(prev.map(p => p.id));
            const uniqueNew = newData.filter(n => !existingIds.has(n.id));
            return [...prev, ...uniqueNew];
          });
          offsetRef.current += limit;

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
  }, [activeIndex, clips.length, hasMore, isFetchingMore, activeProfile]);

  useEffect(() => {
    document.documentElement.classList.add('styles-scrollbar-hidden');
    document.body.classList.add('styles-scrollbar-hidden');
    return () => {
      document.documentElement.classList.remove('styles-scrollbar-hidden');
      document.body.classList.remove('styles-scrollbar-hidden');
    };
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollPos = container.scrollTop;
    const height = container.clientHeight;
    const index = Math.round(scrollPos / height);

    if (index !== activeIndex && index >= 0 && index < clips.length) {
      setActiveIndex(index);
      const newClip = clips[index];
      window.history.replaceState(null, '', `/styles/${newClip.id}`);
    }
  }, [activeIndex, clips]);

  // Targeted playback control
  const prevActiveRef = useRef<number>(-1);
  useEffect(() => {
    // Pause previous
    if (prevActiveRef.current !== -1 && prevActiveRef.current !== activeIndex) {
      const prevVideo = videoRefs.current[prevActiveRef.current];
      if (prevVideo) {
        prevVideo.pause();
        prevVideo.currentTime = 0;
      }
    }

    // Play current
    const currentVideo = videoRefs.current[activeIndex];
    if (currentVideo) {
      if (isPlaying) {
        currentVideo.play().catch(() => { });
      } else {
        currentVideo.pause();
      }
    }

    prevActiveRef.current = activeIndex;
  }, [activeIndex, isPlaying]);

  // Sync mute state via DOM property to ensure browser obedience
  useEffect(() => {
    videoRefs.current.forEach(v => {
      if (v) v.muted = isMuted;
    });
  }, [isMuted, clips.length]);

  const togglePlay = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsPlaying(!isPlaying);
  };

  const handleLike = (id: string) => {
    setReactions(prev => {
      const current = prev[id];
      if (!current) return prev;
      if (current.isLiked) {
        return { ...prev, [id]: { ...current, likes: current.likes - 1, isLiked: false } };
      } else {
        return {
          ...prev,
          [id]: {
            ...current,
            likes: current.likes + 1,
            isLiked: true,
            isDisliked: false,
            dislikes: current.isDisliked ? current.dislikes - 1 : current.dislikes
          }
        };
      }
    });
  };

  const handleDislike = (id: string) => {
    setReactions(prev => {
      const current = prev[id];
      if (!current) return prev;
      if (current.isDisliked) {
        return { ...prev, [id]: { ...current, dislikes: current.dislikes - 1, isDisliked: false } };
      } else {
        return {
          ...prev,
          [id]: {
            ...current,
            dislikes: current.dislikes + 1,
            isDisliked: true,
            isLiked: false,
            likes: current.isLiked ? current.likes - 1 : current.likes
          }
        };
      }
    });
  };

  const copyToClipboard = (id: string) => {
    const url = `${window.location.origin}/styles/${id}`;
    navigator.clipboard.writeText(url);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  const cycleFilter = () => {
    setActiveFilterIndex((prev) => (prev + 1) % VIDEO_FILTERS.length);
    setShowFilterToast(true);
  };

  useEffect(() => {
    if (showFilterToast) {
      const timer = setTimeout(() => setShowFilterToast(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [showFilterToast]);

  if (isLoading && clips.length === 0) {
    return (
      <div suppressHydrationWarning className="h-screen bg-black flex items-center justify-center">
        <div suppressHydrationWarning className="flex flex-col items-center gap-4">
          <div suppressHydrationWarning className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          <p suppressHydrationWarning className="text-zinc-500 font-bold text-xs uppercase tracking-widest">Loading Styles...</p>
        </div>
      </div>
    );
  }

  return (
    <div suppressHydrationWarning className="h-[100dvh] bg-black overflow-hidden relative">
      {/* Filter Toast Indicator */}
      <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-[200] transition-all duration-500 pointer-events-none ${showFilterToast ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-4 scale-95'}`}>
        <div className="bg-gradient-to-r from-blue-600/80 to-purple-600/80 backdrop-blur-md px-6 py-2.5 rounded-full border border-white/20 shadow-[0_0_30px_rgba(37,99,235,0.3)]">
          <span className="text-white font-black text-xs uppercase tracking-[0.2em] drop-shadow-md">
            Style: {VIDEO_FILTERS[activeFilterIndex].name}
          </span>
        </div>
      </div>

      <div
        suppressHydrationWarning
        className="h-full overflow-y-scroll snap-y snap-mandatory scroll-smooth styles-scrollbar-hide"
        onScroll={handleScroll}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            const next = Math.min(activeIndex + 1, clips.length - 1);
            slideRefs.current[next]?.scrollIntoView({ behavior: 'smooth' });
          } else if (e.key === 'ArrowUp') {
            const prev = Math.max(activeIndex - 1, 0);
            slideRefs.current[prev]?.scrollIntoView({ behavior: 'smooth' });
          } else if (e.key === ' ') {
            e.preventDefault();
            togglePlay();
          } else if (e.key === 'm' || e.key === 'M') {
            setIsMuted(!isMuted);
          }
        }}
      >
        {clips.map((clip, index) => (
          <div
            key={clip.id}
            ref={el => { slideRefs.current[index] = el; }}
            className="h-[100dvh] w-full snap-start relative flex items-center justify-center bg-black p-4"
          >
            <div className="flex items-end gap-5 max-w-full">
              {/* Central Video Player Section */}
              <div className="relative h-[88vh] aspect-[9/16] bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl group border border-white/5">
                <video
                  ref={el => { videoRefs.current[index] = el; }}
                  src={clip.video_url}
                  className={`h-full w-full object-cover transition-all duration-500 ${VIDEO_FILTERS[activeFilterIndex].class}`}
                  loop
                  playsInline
                  muted={isMuted}
                  onTimeUpdate={(e) => {
                    const v = e.currentTarget;
                    const p = (v.currentTime / v.duration) * 100;
                    setProgress(prev => ({ ...prev, [clip.id]: p }));
                  }}
                  onClick={togglePlay}
                />

                {/* Top Controls inside Video */}
                <div className="absolute top-4 left-4 z-50 flex items-center gap-3">
                  <button
                    onClick={togglePlay}
                    className="p-2 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full text-white transition-all active:scale-90 border border-white/10"
                  >
                    {isPlaying ? (
                      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M6 14h4V10H6v4zm8-4v4h4v-4h-4zm-8 5h4v-1H6v1zm8-1v1h4v-1h-4zM6 9h4V8H6v1zm8-1v1h4V8h-4zM4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /></svg>
                    ) : (
                      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    )}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                    className="p-2 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full text-white transition-all active:scale-90 border border-white/10"
                  >
                    {isMuted ? (
                      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM4 9v6h4l5 5V4L8 9H4z" /></svg>
                    ) : (
                      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM19 12c0 2.82-1.49 5.27-3.7 6.6l1.27 1.27C19.31 18.15 21 15.27 21 12s-1.69-6.15-4.43-7.87l-1.27 1.27c2.21 1.33 3.7 3.78 3.7 6.6z" /></svg>
                    )}
                  </button>
                </div>

                {/* Info Overlay (Channel, Title, Sound) */}
                <div className="absolute bottom-0 left-0 right-0 p-5 pt-20 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none">
                  <div className="pointer-events-auto max-w-[90%]">
                    <div className="flex items-center gap-3 mb-4">
                      <Link href={`/channel/${clip.channel_id}`} className="w-10 h-10 rounded-full border-2 border-white/20 overflow-hidden shadow-lg hover:border-white transition-all flex-shrink-0">
                        <img src={clip.channel_avatar || '/default-avatar.png'} alt="" className="w-full h-full object-cover" />
                      </Link>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-3">
                          <Link href={`/channel/${clip.channel_id}`} className="text-white font-black text-[15px] truncate hover:underline tracking-tight drop-shadow-md">
                            @{clip.channel_name.replace(/^@/, '').toLowerCase()}
                          </Link>
                          <button className="bg-white text-black px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider hover:bg-zinc-200 transition-all active:scale-95 flex-shrink-0">
                            Subscribe
                          </button>
                        </div>
                      </div>
                    </div>
                    <h3 className="text-white text-sm font-bold leading-snug mb-4 line-clamp-2 drop-shadow-lg uppercase tracking-tight">
                      {clip.title}
                    </h3>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-300 font-black bg-white/10 backdrop-blur-md border border-white/5 rounded-md px-2.5 py-1.5 w-fit uppercase tracking-tighter">
                      <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" /></svg>
                      <span className="truncate max-w-[150px]">Original Sound • {clip.channel_name}</span>
                    </div>
                  </div>
                </div>

                {/* Progress Bar (Thin Red Line) */}
                <div className="absolute bottom-0 left-0 w-full h-[3px] bg-white/20">
                  <div
                    className="h-full bg-red-600 transition-all duration-100 ease-linear"
                    style={{ width: `${progress[clip.id] || 0}%` }}
                  />
                </div>
              </div>

              {/* Action Sidebar (Outside Video Container) */}
              <div className="flex flex-col items-center gap-5 pb-4">
                <div className="flex flex-col items-center gap-1 group">
                  <button
                    onClick={() => handleLike(clip.id)}
                    className={`p-4 rounded-full backdrop-blur-3xl transition-all hover:bg-white/15 active:scale-90 ${reactions[clip.id]?.isLiked ? 'bg-blue-600 text-white shadow-[0_0_25px_rgba(37,99,235,0.5)]' : 'bg-white/10 text-white border border-white/5'}`}
                  >
                    <svg className="w-6 h-6" fill={reactions[clip.id]?.isLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.708c.954 0 1.545 1.04 1.037 1.849l-7.392 11.233a.75.75 0 01-1.282-.69L12.553 14H7.292c-.954 0-1.545-1.04-1.037-1.849l7.392-11.233a.75.75 0 011.282.69L13.447 10z" /></svg>
                  </button>
                  <span className="text-[11px] font-black text-white uppercase tracking-tighter drop-shadow-md">{reactions[clip.id]?.likes || 0}</span>
                </div>

                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={() => handleDislike(clip.id)}
                    className={`p-4 rounded-full backdrop-blur-3xl transition-all hover:bg-white/15 active:scale-90 ${reactions[clip.id]?.isDisliked ? 'bg-zinc-800 text-white shadow-[0_0_20px_rgba(0,0,0,0.5)]' : 'bg-white/10 text-white border border-white/5'}`}
                  >
                    <svg className="w-6 h-6" fill={reactions[clip.id]?.isDisliked ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 14H5.292c-.954 0-1.545-1.04-1.037-1.849l7.392-11.233a.75.75 0 011.282.69L11.447 10H16.708c.954 0 1.545 1.04 1.037 1.849l-7.392 11.233a.75.75 0 01-1.282-.69L10.553 14z" transform="rotate(180 11 12)" /></svg>
                  </button>
                  <span className="text-[11px] font-black text-white uppercase tracking-tighter drop-shadow-md">Dislike</span>
                </div>

                <div className="flex flex-col items-center gap-1">
                  <CommentButton onClick={() => setCommentsForId(clip.id)} />
                  <span className="text-[11px] font-black text-white uppercase tracking-tighter drop-shadow-md">{Math.floor(clip.views / 200)}</span>
                </div>

                <div className="flex flex-col items-center gap-1">
                  <ShareButton onClick={() => setShareForId(clip.id)} />
                  <span className="text-[11px] font-black text-white uppercase tracking-tighter drop-shadow-md">Share</span>
                </div>

                <div className="flex flex-col items-center gap-1">
                  <button className="p-4 rounded-full bg-white/10 text-white border border-white/5 hover:bg-white/15 transition-all active:scale-90 backdrop-blur-xl">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" /></svg>
                  </button>
                  <span className="text-[11px] font-black text-white uppercase tracking-tighter drop-shadow-md">Remix</span>
                </div>

                <div className="mt-2 group">
                  <SoundDisk avatar={clip.channel_avatar} className="!w-10 !h-10 shadow-2xl border-2 border-white/30 group-hover:scale-110 transition-transform" />
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Global Navigation Arrows (YouTube Desktop Style) */}
        <div className="fixed right-10 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-[100] hidden lg:flex">
          <button
            onClick={() => {
              if (activeIndex > 0) {
                slideRefs.current[activeIndex - 1]?.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className="p-3.5 bg-zinc-800/90 hover:bg-zinc-700 backdrop-blur-2xl rounded-full text-white shadow-2xl transition-all active:scale-90 border border-white/10 disabled:opacity-20 disabled:pointer-events-none"
            disabled={activeIndex === 0}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" /></svg>
          </button>
          <button
            onClick={() => {
              if (activeIndex < clips.length - 1) {
                slideRefs.current[activeIndex + 1]?.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className="p-3.5 bg-zinc-800/90 hover:bg-zinc-700 backdrop-blur-2xl rounded-full text-white shadow-2xl transition-all active:scale-90 border border-white/10 disabled:opacity-20 disabled:pointer-events-none"
            disabled={activeIndex === clips.length - 1}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
          </button>
        </div>
        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${((activeIndex + 1) / clips.length) * 100}%` }}
          />
        </div>
        {hasMore && (
          <div className="h-20 flex items-center justify-center bg-black pb-20">
            <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        )}
      </div>

      <CommentsSheet
        isOpen={!!commentsForId}
        onClose={() => setCommentsForId(null)}
        videoId={commentsForId || ''}
      />

      {shareForId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[150] flex items-center justify-center p-6" onClick={() => setShareForId(null)}>
          <div className="bg-zinc-900 border border-white/10 rounded-[32px] w-full max-w-sm overflow-hidden animate-slide-in-up" onClick={e => e.stopPropagation()}>
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black text-white uppercase tracking-tighter">Share Style</h3>
                <button onClick={() => setShareForId(null)} className="text-zinc-500 hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-6 mb-8">
                {shareApps.map(app => (
                  <button key={app.label} className="flex flex-col items-center gap-2 group">
                    <div className={`${app.color} w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-lg group-hover:scale-110 transition-transform shadow-lg ${app.textColor || ''}`}>
                      {app.text}
                    </div>
                    <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">{app.label}</span>
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <div className="flex-1 bg-white/5 border border-white/5 rounded-2xl px-4 py-3 text-xs text-zinc-400 font-bold truncate">
                  {`${window.location.origin}/styles/${shareForId}`}
                </div>
                <button
                  onClick={() => copyToClipboard(shareForId)}
                  className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${shareCopied ? 'bg-green-600 text-white' : 'bg-white text-black hover:bg-zinc-200'}`}
                >
                  {shareCopied ? 'Done' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
