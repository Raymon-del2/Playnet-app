'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { getVideos, getStyles, Video, getVideoById } from '@/lib/supabase';
import { getActiveProfile } from '@/app/actions/profile';

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

  useEffect(() => {
    videoRefs.current.forEach((video, i) => {
      if (!video) return;
      if (i === activeIndex) {
        video.play().catch(() => { });
      } else {
        video.pause();
        video.currentTime = 0;
      }
    });
  }, [activeIndex]);

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

  if (isLoading && clips.length === 0) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-zinc-500 font-bold text-xs uppercase tracking-widest">Loading Styles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] bg-black overflow-hidden relative">
      <div
        className="h-full overflow-y-scroll snap-y snap-mandatory scroll-smooth styles-scrollbar-hide"
        onScroll={handleScroll}
      >
        {clips.map((clip, index) => (
          <div
            key={clip.id}
            ref={el => { slideRefs.current[index] = el; }}
            className="h-[100dvh] w-full snap-start relative flex items-center justify-center bg-black"
          >
            <div className="relative h-full w-full bg-black overflow-hidden group">
              <video
                ref={el => { videoRefs.current[index] = el; }}
                src={clip.video_url}
                className="h-full w-full object-cover"
                loop
                playsInline
                muted={isMuted}
                onClick={() => setIsMuted(!isMuted)}
              />

              {/* Bottom Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/20 pointer-events-none" />

              {isMuted && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-black/40 backdrop-blur-md p-4 rounded-full">
                    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM4 9v6h4l5 5V4L8 9H4z" /></svg>
                  </div>
                </div>
              )}

              {/* Top Header Information */}
              <div className="absolute top-safe left-6 flex items-center gap-3 mt-4">
                <Link href="/" className="p-2 bg-black/40 backdrop-blur-md rounded-xl hover:bg-white/10 transition-all border border-white/5">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                </Link>
                <span className="text-white font-black text-sm tracking-tighter uppercase drop-shadow-md">Playra Styles</span>
              </div>

              {/* Bottom Overlay Info & Action Rail */}
              <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 pb-20 sm:pb-24 flex flex-row items-end justify-between gap-4">
                {/* Left Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3">
                    <Link href={`/channel/${clip.channel_id}`} className="group/avatar relative">
                      <div className="w-11 h-11 rounded-full border-2 border-white/20 overflow-hidden shadow-lg group-hover/avatar:border-blue-500 transition-all">
                        <img src={clip.channel_avatar || '/default-avatar.png'} alt="" className="w-full h-full object-cover" />
                      </div>
                    </Link>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-3">
                        <Link href={`/channel/${clip.channel_id}`} className="text-white font-black text-sm drop-shadow-md uppercase tracking-tight hover:text-blue-400 transition-colors">
                          @{clip.channel_name.replace(/^@/, '').toLowerCase()}
                        </Link>
                        <button className="bg-white text-black px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-colors active:scale-95">
                          Subscribe
                        </button>
                      </div>
                    </div>
                  </div>
                  <h3 className="text-white text-[15px] font-bold leading-snug line-clamp-2 drop-shadow-lg uppercase tracking-tight mb-2">
                    {clip.title}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-zinc-300 font-bold bg-white/5 backdrop-blur-md border border-white/10 rounded-lg px-2.5 py-1.5 w-fit">
                    <svg className="w-3 h-3 text-blue-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3V21M3 12H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                    <span className="truncate max-w-[150px]">Original Sound • {clip.channel_name}</span>
                  </div>
                </div>

                {/* Right Action Rail */}
                <div className="flex flex-col gap-5 items-center pb-2">
                  <div className="flex flex-col items-center gap-1">
                    <button
                      onClick={() => handleLike(clip.id)}
                      className={`p-3.5 rounded-2xl backdrop-blur-xl transition-all hover:scale-110 active:scale-90 ${reactions[clip.id]?.isLiked ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]' : 'bg-white/10 text-white border border-white/10 hover:bg-white/20'}`}
                    >
                      <svg className="w-6 h-6" fill={reactions[clip.id]?.isLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.708c.954 0 1.545 1.04 1.037 1.849l-7.392 11.233a.75.75 0 01-1.282-.69L12.553 14H7.292c-.954 0-1.545-1.04-1.037-1.849l7.392-11.233a.75.75 0 011.282.69L13.447 10z" /></svg>
                    </button>
                    <span className="text-[10px] font-black text-white drop-shadow-md uppercase tracking-tighter">{reactions[clip.id]?.likes || 0}</span>
                  </div>

                  <div className="flex flex-col items-center gap-1">
                    <button
                      onClick={() => handleDislike(clip.id)}
                      className={`p-3.5 rounded-2xl backdrop-blur-xl transition-all hover:scale-110 active:scale-90 ${reactions[clip.id]?.isDisliked ? 'bg-zinc-800 text-white' : 'bg-white/10 text-white border border-white/10 hover:bg-white/20'}`}
                    >
                      <svg className="w-6 h-6" fill={reactions[clip.id]?.isDisliked ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m9-9L12 12m0 0l4.5 4.5M12 12v13.5" /></svg>
                    </button>
                    <span className="text-[10px] font-black text-white drop-shadow-md uppercase tracking-tighter">Dislike</span>
                  </div>

                  <div className="flex flex-col items-center gap-1">
                    <button
                      onClick={() => setCommentsForId(clip.id)}
                      className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 text-white hover:bg-white/20 transition-all hover:scale-110"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3h9m-9 3h3m-6.75 4.125l-.01 2.25a.75.75 0 001.185.618l2.946-2.093A.75.75 0 018.25 18h10.5a2.25 2.25 0 002.25-2.25V5.25A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25v10.5A2.25 2.25 0 005.25 18h2.25z" /></svg>
                    </button>
                    <span className="text-[10px] font-black text-white drop-shadow-md uppercase tracking-tighter">Comment</span>
                  </div>

                  <div className="flex flex-col items-center gap-1">
                    <button
                      onClick={() => setShareForId(clip.id)}
                      className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 text-white hover:bg-white/20 transition-all hover:scale-110"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" /></svg>
                    </button>
                    <span className="text-[10px] font-black text-white drop-shadow-md uppercase tracking-tighter">Share</span>
                  </div>

                  <div className="flex flex-col items-center gap-1">
                    <button
                      className="p-3.5 rounded-2xl bg-gradient-to-tr from-blue-600 to-purple-600 backdrop-blur-xl border border-white/20 text-white hover:scale-110 transition-all shadow-[0_0_15px_rgba(147,51,234,0.3)] animate-pulse"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" /></svg>
                    </button>
                    <span className="text-[10px] font-black text-white drop-shadow-md uppercase tracking-tighter">Styles</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
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
