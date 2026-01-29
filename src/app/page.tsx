'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getVideos, Video } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { getActiveProfile } from '@/app/actions/profile';

const SKELETON_BATCH = Array.from({ length: 8 });

function formatDurationFromSeconds(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const total = Math.floor(seconds);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const mmss = `${mins}:${secs.toString().padStart(2, '0')}`;
  return hrs > 0 ? `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}` : mmss;
}

function parseDurationToSeconds(value: string | null | undefined) {
  if (!value) return 0;
  const parts = value.split(':').map((p) => Number(p));
  if (parts.some((n) => Number.isNaN(n))) return 0;
  if (parts.length === 3) {
    const [h, m, s] = parts;
    return h * 3600 + m * 60 + s;
  }
  if (parts.length === 2) {
    const [m, s] = parts;
    return m * 60 + s;
  }
  return parts[0] || 0;
}

function VideoCard({
  video,
  isHovered,
  isPreviewing,
  isMuted,
  onHoverStart,
  onHoverEnd,
  onToggleMuted,
  videoRef,
  profileId
}: {
  video: Video;
  isHovered: boolean;
  isPreviewing: boolean;
  isMuted: boolean;
  onHoverStart: (id: string) => void;
  onHoverEnd: (id: string) => void;
  onToggleMuted: (id: string) => void;
  videoRef: (el: HTMLVideoElement | null) => void;
  profileId?: string | null;
}) {
  const [computedDuration, setComputedDuration] = useState<string | null>(video.duration || null);
  const [durationSeconds, setDurationSeconds] = useState<number>(parseDurationToSeconds(video.duration));
  const [progressSeconds, setProgressSeconds] = useState<number>(0);
  const [hoverPct, setHoverPct] = useState<number | null>(null);
  const progressKey = `watch_progress:${profileId || 'anon'}:${video.id}`;

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const rawDur = e.currentTarget.duration;
    const dur = formatDurationFromSeconds(rawDur);
    if (Number.isFinite(rawDur) && rawDur > 0) {
      setDurationSeconds(rawDur);
    }
    setComputedDuration(dur);
  };

  // Load saved progress
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(progressKey);
      if (raw) {
        const saved = JSON.parse(raw);
        if (typeof saved.duration === 'number' && saved.duration > 0) {
          setDurationSeconds((prev) => (prev > 0 ? prev : saved.duration));
        }
        if (typeof saved.current === 'number' && saved.current >= 0) {
          setProgressSeconds(saved.current);
        }
      }
    } catch {
      // ignore
    }
  }, [progressKey]);

  const persistProgress = (current: number, total: number) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(
        progressKey,
        JSON.stringify({
          current,
          duration: total,
          updatedAt: Date.now(),
        })
      );
    } catch {
      // ignore
    }
  };

  return (
    <div
      className="group relative flex flex-col w-full bg-[#0f0f0f]"
      onMouseEnter={() => onHoverStart(video.id)}
      onMouseLeave={() => {
        setHoverPct(null);
        onHoverEnd(video.id);
      }}
      onMouseMove={(e) => {
        if (!isPreviewing || !durationSeconds) return;
        const rect = (e.currentTarget.querySelector('video') as HTMLVideoElement | null)?.getBoundingClientRect();
        if (!rect) return;
        const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
        setHoverPct(pct * 100);
        const vidEl = (e.currentTarget.querySelector('video') as HTMLVideoElement | null);
        if (vidEl) {
          const target = pct * durationSeconds;
          vidEl.currentTime = target;
          setProgressSeconds(target);
        }
      }}
      onMouseDown={(e) => {
        if (!isPreviewing || !durationSeconds) return;
        const rect = (e.currentTarget.querySelector('video') as HTMLVideoElement | null)?.getBoundingClientRect();
        if (!rect) return;
        const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
        const target = pct * durationSeconds;
        const vidEl = (e.currentTarget.querySelector('video') as HTMLVideoElement | null);
        if (vidEl) {
          vidEl.currentTime = target;
          setProgressSeconds(target);
          persistProgress(target, durationSeconds);
        }
      }}
    >
      <Link href={`/watch/${video.id}`} className="relative block w-full">
        <div className="relative w-full overflow-hidden sm:rounded-xl bg-zinc-950 aspect-video shadow-sm">
          <img
            src={video.thumbnail_url}
            alt={video.title}
            className={`w-full h-full object-cover transition-opacity duration-300 ${isPreviewing ? 'opacity-0' : 'opacity-100'}`}
          />
          <video
            ref={videoRef}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${isPreviewing ? 'opacity-100' : 'opacity-0'}`}
            src={video.video_url}
            muted={isMuted}
            playsInline
            onTimeUpdate={(e) => {
              const t = e.currentTarget.currentTime;
              setProgressSeconds(t);
              const dur = durationSeconds || e.currentTarget.duration;
              const effectiveDur = dur && Number.isFinite(dur) ? dur : 0;
              if (effectiveDur > 0) {
                persistProgress(t, effectiveDur);
                if (t >= effectiveDur - 0.05) {
                  e.currentTarget.pause();
                }
              }
            }}
            onLoadedMetadata={handleLoadedMetadata}
          />
          <div className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-[10px] font-black px-1.5 py-0.5 rounded z-20">
            {computedDuration || video.duration || '0:00'}
          </div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-white/10">
            <div
              className="h-full bg-blue-500 transition-all"
              style={{
                width:
                  durationSeconds > 0
                    ? `${Math.min(100, Math.max(0, (progressSeconds / durationSeconds) * 100))}%`
                    : '0%',
              }}
            />
            {hoverPct !== null ? (
              <div
                className="absolute top-0 h-full w-0.5 bg-white/60"
                style={{ left: `${hoverPct}%` }}
              />
            ) : null}
          </div>
        </div>
      </Link>

      <div className="flex gap-3 p-3 md:px-0">
        <Link href={`/channel/${video.channel_id}`} className="flex-shrink-0 mt-0.5">
          <div className="w-9 h-9 rounded-full bg-zinc-800 border border-white/5 shadow-md overflow-hidden">
            <img
              src={video.channel_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop'}
              alt={video.channel_name}
              className="w-full h-full object-cover"
            />
          </div>
        </Link>

        <div className="flex flex-1 flex-col min-w-0">
          <div className="flex justify-between items-start gap-2">
            <Link href={`/watch/${video.id}`} className="flex-1 min-w-0">
              <h3 className="font-bold text-white text-[15px] leading-tight line-clamp-2 mb-1 group-hover:text-blue-400 transition-colors tracking-tight">
                {video.title}
              </h3>
            </Link>
            <button className="p-1.5 -mr-1.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-all active:scale-90">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
              </svg>
            </button>
          </div>
          <div className="flex items-center text-[12px] text-[#aaaaaa] font-medium truncate">
            <span>@{video.channel_name.replace(/^@/, '').toLowerCase()}</span>
            <span className="mx-1">•</span>
            <span>{video.views.toLocaleString()} views</span>
            <span className="mx-1">•</span>
            <span>{formatDistanceToNow(new Date(video.created_at), { addSuffix: true })}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StylesShelf({
  styles,
  onHoverStart,
  onHoverEnd,
  videoRefs,
  isMuted
}: {
  styles: Video[];
  onHoverStart: (id: string) => void;
  onHoverEnd: (id: string) => void;
  videoRefs: React.MutableRefObject<Record<string, HTMLVideoElement | null>>;
  isMuted: boolean;
}) {
  return (
    <div className="my-8 border-y border-white/5 py-6">
      <div className="flex items-center gap-3 mb-6 px-4 sm:px-6">
        <img src="/styles-icon.svg?v=blue" alt="" className="w-6 h-6" />
        <h2 className="text-xl font-bold text-white uppercase tracking-tight">Styles</h2>
      </div>

      <div className="flex gap-4 overflow-x-auto px-4 sm:px-6 scrollbar-hide pb-4">
        {styles.map((style) => (
          <Link
            key={style.id}
            href={`/styles/${style.id}`}
            className="flex-shrink-0 w-44 sm:w-52 group relative"
            onMouseEnter={() => onHoverStart(style.id)}
            onMouseLeave={() => onHoverEnd(style.id)}
          >
            <div className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-zinc-800 shadow-xl border border-white/5 group-hover:scale-[1.02] transition-transform">
              <img src={style.thumbnail_url} className="w-full h-full object-cover" alt="" />
              <video
                ref={(el) => { videoRefs.current[style.id] = el; }}
                src={style.video_url}
                muted={isMuted}
                playsInline
                loop
                className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 group-hover:bottom-5 transition-all">
                <h3 className="text-sm font-bold text-white line-clamp-2 leading-tight uppercase tracking-tighter drop-shadow-md">{style.title}</h3>
                <p className="text-[11px] text-zinc-300 mt-2 font-bold shadow-black drop-shadow-sm">{style.views.toLocaleString()} views</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeProfile, setActiveProfile] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(true);

  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const hoverTimersRef = useRef<Record<string, ReturnType<typeof setTimeout> | null>>({});

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const profile = await getActiveProfile();
        setActiveProfile(profile);

        // Fetch all videos (no account-type/category filter to avoid hiding uploads)
        const data = await getVideos(50, 0);

        // Ensure the uploader sees their latest avatar on their own videos
        let hydrated = (data || []).map((v) => {
          if (profile?.id && v.channel_id === profile.id && profile.avatar) {
            return { ...v, channel_avatar: profile.avatar };
          }
          return v;
        });

        // Fetch fresh avatars for all channel ids (ensures changes propagate like the profile view)
        try {
          const channelIds = Array.from(new Set(hydrated.map((v) => v.channel_id).filter(Boolean)));
          const avatarEntries = await Promise.all(
            channelIds.map(async (cid) => {
              try {
                const res = await fetch(`/api/channel-avatar/${cid}`);
                if (!res.ok) return null;
                const json = await res.json();
                if (json?.avatar) return [cid, json.avatar] as [string, string];
              } catch {
                // ignore per-channel errors
              }
              return null;
            })
          );
          const avatarMap = new Map<string, string>();
          avatarEntries.forEach((entry) => {
            if (entry) avatarMap.set(entry[0], entry[1]);
          });
          if (avatarMap.size > 0) {
            hydrated = hydrated.map((v) => {
              const latest = avatarMap.get(v.channel_id);
              return latest ? { ...v, channel_avatar: latest } : v;
            });
          }
        } catch {
          // ignore avatar refresh errors
        }

        setVideos(hydrated);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchVideos();

    // Check for video updates made while page wasn't loaded
    const lastUpdate = localStorage.getItem('video-updated');
    console.log('Checking for video updates, lastUpdate:', lastUpdate);
    if (lastUpdate) {
      const updateAge = Date.now() - parseInt(lastUpdate);
      console.log('Update age:', updateAge, 'ms');
      // If update was within last 30 seconds, refetch
      if (updateAge < 30000) {
        console.log('Detected recent video update, refetching...');
        fetchVideos();
        localStorage.removeItem('video-updated');
      }
    }

    // Listen for video update events from studio
    const handleVideoUpdate = (e: any) => {
      console.log('Video update event received:', e.detail);
      fetchVideos();
    };

    // Listen for localStorage changes (cross-tab support)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'video-updated') {
        console.log('Video update detected via localStorage');
        fetchVideos();
      }
    };

    window.addEventListener('video-updated', handleVideoUpdate);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('video-updated', handleVideoUpdate);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [refreshKey]);

  const handleHoverStart = (id: string) => {
    setHoveredId(id);
    hoverTimersRef.current[id] = setTimeout(() => {
      setPreviewingId(id);
      const videoEl = videoRefs.current[id];
      if (videoEl) {
        videoEl.currentTime = 0;
        videoEl.play().catch(() => { });
      }
    }, 800);
  };

  const handleHoverEnd = (id: string) => {
    if (hoverTimersRef.current[id]) {
      clearTimeout(hoverTimersRef.current[id]!);
    }
    setHoveredId(null);
    setPreviewingId(null);
    const videoEl = videoRefs.current[id];
    if (videoEl) {
      videoEl.pause();
      videoEl.currentTime = 0;
    }
  };

  const renderSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-4 gap-y-8 p-4">
      {SKELETON_BATCH.map((_, i) => (
        <div key={i} className="animate-pulse space-y-3">
          <div className="aspect-video bg-zinc-800 rounded-xl" />
          <div className="flex gap-3">
            <div className="w-10 h-10 bg-zinc-800 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-zinc-800 rounded w-3/4" />
              <div className="h-3 bg-zinc-800 rounded w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <>
      {/* Category Bar */}
      <div className="flex items-center gap-3 overflow-x-auto px-4 py-2 sticky top-14 z-40 scrollbar-hide border-b border-white/5 mb-4 w-full" style={{ backgroundColor: '#0f0f0f' }}>
        {['All', 'Live', 'Music', 'Gaming', 'News', 'Recently uploaded', 'New to you'].map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-[13px] font-bold whitespace-nowrap transition-colors ${selectedCategory === cat ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {isLoading ? (
        renderSkeleton()
      ) : (
        (() => {
          let displayVideos: Video[] = [];
          if (selectedCategory === 'All' || selectedCategory === 'New to you') {
            displayVideos = videos.filter(v => !v.is_short);
          } else if (selectedCategory === 'Recently uploaded') {
            const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
            displayVideos = videos.filter(v => !v.is_short && new Date(v.created_at).getTime() > oneDayAgo);
          }

          const styles = videos.filter(v => v.is_short);

          if (displayVideos.length > 0 || styles.length > 0) {
            return (
              <div className="pb-20">
                {/* Initial Grid of Regular Videos */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-y-1 md:gap-x-4 md:gap-y-10 p-0 sm:p-6 pt-4">
                  {displayVideos.slice(0, 8).map((video) => (
                    <VideoCard
                      key={video.id}
                      video={video}
                      isHovered={hoveredId === video.id}
                      isPreviewing={previewingId === video.id}
                      isMuted={isMuted}
                      onHoverStart={handleHoverStart}
                      onHoverEnd={handleHoverEnd}
                      onToggleMuted={() => setIsMuted(!isMuted)}
                      videoRef={(el) => { videoRefs.current[video.id] = el; }}
                    />
                  ))}
                </div>

                {/* Styles Shelf - Only show on All or if something matches */}
                {styles.length > 0 && (selectedCategory === 'All' || selectedCategory === 'New to you') && (
                  <StylesShelf
                    styles={styles}
                    onHoverStart={handleHoverStart}
                    onHoverEnd={handleHoverEnd}
                    videoRefs={videoRefs}
                    isMuted={isMuted}
                  />
                )}

                {/* Remaining Grid of Regular Videos */}
                {displayVideos.length > 8 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-y-1 md:gap-x-4 md:gap-y-10 p-0 sm:p-6 pt-0">
                    {displayVideos.slice(8).map((video) => (
                      <VideoCard
                        key={video.id}
                        video={video}
                        isHovered={hoveredId === video.id}
                        isPreviewing={previewingId === video.id}
                        isMuted={isMuted}
                        onHoverStart={handleHoverStart}
                        onHoverEnd={handleHoverEnd}
                        onToggleMuted={() => setIsMuted(!isMuted)}
                        videoRef={(el) => { videoRefs.current[video.id] = el; }}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <div className="flex flex-col items-center justify-center py-40 text-center">
              <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white">
                {selectedCategory === 'All' ? 'No videos found' : `No results found in ${selectedCategory}`}
              </h2>
              <p className="text-zinc-500 mt-2">
                {selectedCategory === 'All'
                  ? 'Try uploading your first video in the Studio!'
                  : selectedCategory === 'Recently uploaded'
                    ? 'No videos have been uploaded in the last 24 hours.'
                    : 'Check back later for content in this category.'}
              </p>
              {selectedCategory === 'All' && (
                <Link href="/studio/content" className="mt-6 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold transition-colors">
                  Go to Studio
                </Link>
              )}
            </div>
          );
        })()
      )}
    </>
  );
}
