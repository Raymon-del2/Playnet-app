'use client';

import { useState, useEffect, useRef, useMemo, use } from 'react';
import Link from 'next/link';
import { getVideoById, recordWatch, isHistoryPaused, incrementViews, Video, updateChannelAvatarInVideos } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { getActiveProfile } from '@/app/actions/profile';
import Comments from '@/components/Comments';
import RelatedVideos from '@/components/RelatedVideos';
import SubscribeButton from '@/components/SubscribeButton';

export default function WatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: watchId } = use(params);
  const [video, setVideo] = useState<Video | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [likes, setLikes] = useState(12500);
  const [dislikes, setDislikes] = useState(234);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [activeProfileName, setActiveProfileName] = useState<string>('');
  const [activeProfileAvatar, setActiveProfileAvatar] = useState<string>('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSaveOpen, setIsSaveOpen] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [watchLaterSaved, setWatchLaterSaved] = useState(false);
  const [playlists, setPlaylists] = useState<{ id: string; name: string; hasVideo: boolean }[]>([]);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isSavingAction, setIsSavingAction] = useState(false);
  const [toast, setToast] = useState<{ message: string; kind: 'success' | 'error' } | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const showToast = (message: string, kind: 'success' | 'error' = 'success') => {
    setToast({ message, kind });
    setTimeout(() => setToast(null), 2500);
  };

  const parseDurationToSeconds = (value: string | null | undefined) => {
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
  };

  const shouldIncrementView = (id: string) => {
    if (typeof window === 'undefined') return true;
    try {
      const key = `view_incremented:${id}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const saved = JSON.parse(raw) as { ts?: number };
        const ts = saved?.ts ?? 0;
        // Cooldown: 6 hours
        if (Date.now() - ts < 6 * 60 * 60 * 1000) return false;
      }
    } catch {
      // ignore
    }
    return true;
  };

  const markViewIncremented = (id: string) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(`view_incremented:${id}`, JSON.stringify({ ts: Date.now() }));
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const refreshAvatar = async (channelId: string) => {
      try {
        const res = await fetch(`/api/channel-avatar/${channelId}`);
        if (!res.ok) return;
        const json = await res.json();
        if (json?.avatar) {
          setVideo((prev) => (prev ? { ...prev, channel_avatar: json.avatar } : prev));
        }
      } catch {
        // ignore avatar refresh errors
      }
    };

    const fetchVideo = async () => {
      try {
        const profile = await getActiveProfile();
        setActiveProfileId(profile?.id ?? null);
        setActiveProfileName(profile?.name ?? '');
        setActiveProfileAvatar(profile?.avatar ?? '');

        const data = await getVideoById(watchId);
        if (data) {
          const merged =
            profile?.id && profile.avatar && data.channel_id === profile.id
              ? { ...data, channel_avatar: profile.avatar }
              : data;

          // Best-effort: push latest avatar to Supabase so others see it
          if (profile?.id && profile.avatar && data.channel_id === profile.id) {
            updateChannelAvatarInVideos(profile.id, profile.avatar).catch((err) =>
              console.warn('Avatar sync skipped', err)
            );
          }

          setVideo(merged);
          setVideoId(merged.id);
          // Pull latest avatar from channel (matches “View your channel”)
          if (merged.channel_id) {
            refreshAvatar(merged.channel_id);
          }
          // Use stored duration if present
          const parsed = parseDurationToSeconds(merged.duration);
          if (parsed > 0) setDuration(parsed);
          // Randomize likes for mock-up feel
          setLikes(Math.floor(Math.random() * 50000));
          // Increment views once when loaded
          if (shouldIncrementView(merged.id)) {
            try {
              const newViews = await incrementViews(merged.id);
              setVideo((prev) => (prev ? { ...prev, views: newViews } : prev));
              markViewIncremented(merged.id);
            } catch (viewErr) {
              console.warn('Failed to increment views', viewErr);
            }
          }

          // Load save status
          if (profile?.id) {
            refreshSaveStatus(merged.id, profile.id);
          }
        }

        // Record watch if not paused
        if (profile?.id && data) {
          const paused = await isHistoryPaused(profile.id);
          if (!paused) {
            await recordWatch(profile.id, data.id);
          }
        }
      } catch (error) {
        console.error('Error fetching video:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (watchId.length > 5) { // Simple check for UUID
      fetchVideo();
    } else {
      setIsLoading(false);
    }
  }, [watchId]);

  const refreshSaveStatus = async (vId: string, profileId: string) => {
    setSaveLoading(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/engagement/save?videoId=${encodeURIComponent(vId)}`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to load saves');
      }
      const json = await res.json();
      setWatchLaterSaved(!!json.watchLater);
      setPlaylists(json.playlists || []);
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to load saves');
      showToast(err?.message || 'Failed to load saves', 'error');
    } finally {
      setSaveLoading(false);
    }
  };

  const toggleWatchLater = async () => {
    if (!videoId) return;
    setIsSavingAction(true);
    try {
      const target = watchLaterSaved ? 'DELETE' : 'POST';
      const url = `/api/engagement/save?videoId=${encodeURIComponent(videoId)}&target=watch_later`;
      const res = await fetch(url, { method: target });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to update');
      }
      setWatchLaterSaved(!watchLaterSaved);
      showToast(!watchLaterSaved ? 'Saved to Watch later' : 'Removed from Watch later');
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to update');
      showToast(err?.message || 'Failed to update', 'error');
    } finally {
      setIsSavingAction(false);
    }
  };

  const togglePlaylist = async (pid: string, hasVideo: boolean) => {
    if (!videoId) return;
    setIsSavingAction(true);
    try {
      const method = hasVideo ? 'DELETE' : 'POST';
      const url =
        method === 'POST'
          ? `/api/engagement/save`
          : `/api/engagement/save?videoId=${encodeURIComponent(videoId)}&target=playlist&playlistId=${encodeURIComponent(pid)}`;
      const body =
        method === 'POST'
          ? { videoId, target: 'playlist', playlistId: pid }
          : undefined;
      const res = await fetch(url, {
        method,
        headers: method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
        body: method === 'POST' ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to update playlist');
      }
      setPlaylists((prev) =>
        prev.map((p) => (p.id === pid ? { ...p, hasVideo: !hasVideo } : p)),
      );
      showToast(!hasVideo ? 'Saved to playlist' : 'Removed from playlist');
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to update playlist');
      showToast(err?.message || 'Failed to update playlist', 'error');
    } finally {
      setIsSavingAction(false);
    }
  };

  const createPlaylist = async () => {
    if (!videoId || !newPlaylistName.trim()) return;
    setIsSavingAction(true);
    try {
      setSaveError(null);
      const res = await fetch('/api/engagement/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, target: 'playlist', name: newPlaylistName.trim() }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to create playlist');
      }
      setNewPlaylistName('');
      await refreshSaveStatus(videoId, activeProfileId || '');
      showToast('Saved to new playlist');
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to create playlist');
      showToast(err?.message || 'Failed to create playlist', 'error');
    } finally {
      setIsSavingAction(false);
    }
  };

  const isSavedAnywhere = useMemo(
    () => watchLaterSaved || playlists.some((p) => p.hasVideo),
    [watchLaterSaved, playlists],
  );

  const formatTime = (secs: number) => {
    if (secs === undefined || secs === null || Number.isNaN(secs)) return '--:--';
    if (secs <= 0) return '--:--';
    const total = Math.floor(secs);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
  };

  const resolvedDuration = duration > 0 ? duration : parseDurationToSeconds(video?.duration);
  const progressPct = resolvedDuration > 0 ? Math.min(100, Math.max(0, (currentTime / resolvedDuration) * 100)) : 0;

  const persistProgress = (videoId: string, current: number, total: number) => {
    if (typeof window === 'undefined') return;
    const key = `watch_progress:${activeProfileId || 'anon'}:${videoId}`;
    try {
      localStorage.setItem(
        key,
        JSON.stringify({
          current,
          duration: total,
          updatedAt: Date.now(),
        })
      );
    } catch {
      // ignore storage errors
    }
  };

  // Load stored progress when videoId changes
  useEffect(() => {
    if (typeof window === 'undefined' || !videoId) return;
    const key = `watch_progress:${activeProfileId || 'anon'}:${videoId}`;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const saved = JSON.parse(raw) as { current?: number; duration?: number };
        if (typeof saved.duration === 'number' && saved.duration > 0) {
          setDuration((prev) => (prev > 0 ? prev : saved.duration!));
        }
        if (typeof saved.current === 'number' && saved.current >= 0) {
          setCurrentTime(saved.current);
          if (videoRef.current) {
            videoRef.current.currentTime = saved.current;
          }
        }
      }
    } catch {
      // ignore
    }
  }, [videoId, activeProfileId]);

  const handleLike = () => {
    if (isLiked) {
      setLikes(likes - 1);
      setIsLiked(false);
    } else {
      if (isDisliked) {
        setDislikes(dislikes - 1);
        setIsDisliked(false);
      }
      setLikes(likes + 1);
      setIsLiked(true);
    }
  };

  const handleDislike = () => {
    if (isDisliked) {
      setDislikes(dislikes - 1);
      setIsDisliked(false);
    } else {
      if (isLiked) {
        setLikes(likes - 1);
        setIsLiked(false);
      }
      setDislikes(dislikes + 1);
      setIsDisliked(true);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="w-12 h-12 border-4 border-white/10 border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }

  const videoTitle = video ? video.title : 'Building a Full Stack App with Next.js and TypeScript';
  const videoSrc = video ? video.video_url : 'https://www.w3schools.com/html/mov_bbb.mp4';
  const channelName = video ? video.channel_name : 'Tech Master';
  const channelAvatar = video ? video.channel_avatar : 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop';
  const videoViews = video ? `${Math.max(1, video.views ?? 0).toLocaleString()} views` : '125K views';
  const videoDate = video ? formatDistanceToNow(new Date(video.created_at), { addSuffix: true }) : '2 days ago';
  const videoDescription = video ? video.description : "In this comprehensive tutorial, we'll build a full-stack application using Next.js 14, TypeScript, and modern web development best practices. Learn how to set up your project, implement authentication, create API routes, and deploy your app to production.";

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-0 sm:p-6 bg-gray-900 min-h-screen">
      <div className="flex-1">
        <div className="aspect-video bg-black sm:rounded-lg overflow-hidden mb-4 relative">
          <video
            ref={videoRef}
            className="w-full h-full"
            controls
            autoPlay
            poster={video?.thumbnail_url || "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=1280&h=720&fit=crop"}
            onLoadedMetadata={(e) => {
              const d = e.currentTarget.duration;
              if (d && !Number.isNaN(d)) setDuration(d);
              else if (resolvedDuration > 0) setDuration(resolvedDuration);
            }}
            onTimeUpdate={(e) => {
              const t = e.currentTarget.currentTime;
              setCurrentTime(t);
              const effectiveDuration = duration > 0 ? duration : resolvedDuration;
              if (videoId && effectiveDuration > 0) {
                persistProgress(videoId, t, effectiveDuration);
              }
            }}
          >
            <source src={videoSrc} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>

        <div className="flex flex-col gap-4 mb-6 px-4 sm:px-0">
          <div className="flex flex-col gap-2">
            <h1 className="text-[19px] font-black leading-tight tracking-tight uppercase">
              {videoTitle}
            </h1>
            <div className="flex items-center gap-2 text-[13px] text-gray-400 font-bold mb-1">
              <span>{videoViews}</span>
              <span className="opacity-30">•</span>
              <span>{videoDate}</span>
              <span className="text-gray-200 ml-1">...more</span>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Link href={`/channel/${video?.channel_id || 'techmaster'}`} className="flex-shrink-0">
                  <img
                    src={channelAvatar}
                    alt={channelName}
                    className="w-10 h-10 rounded-full border border-white/5 shadow-md object-cover"
                  />
                </Link>
                <div className="flex flex-col">
                  <h3 className="font-black text-[15px] leading-tight flex items-center gap-1 uppercase tracking-tighter">
                    {channelName}
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                  </h3>
                  <p className="text-[12.5px] text-gray-400 font-bold">0 subs</p>
                </div>
              </div>
              <SubscribeButton
                channelId={video?.channel_id || ''}
                channelName={channelName}
                profileId={activeProfileId}
                showCount={true}
              />
            </div>

            {/* Engagement - Like and Save only */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Like/Dislike Pill */}
              <div className="flex items-center bg-white/10 backdrop-blur-xl rounded-full border border-white/5 h-9">
                <button
                  onClick={handleLike}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-l-full hover:bg-white/10 transition-all active:scale-95 ${isLiked ? 'text-blue-400' : 'text-white'}`}
                >
                  <svg className="w-5 h-5" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" /></svg>
                  <span className="font-semibold text-sm">{likes.toLocaleString()}</span>
                </button>
                <div className="w-px h-5 bg-white/20" />
                <button
                  onClick={handleDislike}
                  className={`flex items-center px-3 py-1.5 rounded-r-full hover:bg-white/10 transition-all active:scale-95 ${isDisliked ? 'text-blue-400' : 'text-white'}`}
                >
                  <svg className="w-5 h-5 rotate-180" fill={isDisliked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" /></svg>
                </button>
              </div>

              {/* Save Button */}
              <button
                onClick={() => setIsSaveOpen(true)}
                className={`flex items-center gap-1.5 h-9 px-4 rounded-full transition-all active:scale-95 border border-white/5 font-semibold text-sm ${isSavedAnywhere
                  ? 'bg-white text-black'
                  : 'bg-white/10 hover:bg-white/15 text-white'
                  }`}
              >
                <svg className="w-5 h-5" fill={isSavedAnywhere ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" /></svg>
                <span>{isSavedAnywhere ? 'Saved' : 'Save'}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-4 mt-4">
          <div className="flex items-center gap-2 text-[13px] text-gray-300 font-bold mb-3">
            <span>{videoViews}</span>
            <span className="opacity-30">•</span>
            <span>{videoDate}</span>
          </div>
          <p className="text-[14px] text-gray-200 leading-relaxed whitespace-pre-wrap">
            {videoDescription}
          </p>
        </div>

        {/* Comments Section */}
        <div className="px-4 sm:px-0 mt-6">
          <Comments
            videoId={watchId}
            profileId={activeProfileId}
            profileName={activeProfileName}
            profileAvatar={activeProfileAvatar}
          />
        </div>
      </div>

      {/* Related Videos Sidebar */}
      <div className="lg:w-96 px-4 sm:px-0">
        <RelatedVideos
          videoId={watchId}
          category={video?.category}
          channelId={video?.channel_id}
        />
      </div>

      {isSaveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="bg-[#1f1f1f] w-full max-w-sm rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <h3 className="text-white font-semibold text-lg">Save to...</h3>
              <button
                onClick={() => setIsSaveOpen(false)}
                className="text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <div className="border-t border-white/10">
              <div className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition">
                <div className="w-12 h-7 rounded-md overflow-hidden bg-zinc-800 flex-shrink-0">
                  <img
                    src={video?.thumbnail_url || '/logo.png'}
                    alt="thumb"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <div className="text-white text-sm font-semibold">{watchLaterSaved ? 'Saved' : 'Watch later'}</div>
                  <div className="text-xs text-white/50">Private</div>
                </div>
                <button
                  onClick={toggleWatchLater}
                  disabled={isSavingAction}
                  className="p-2 rounded-full hover:bg-white/10 text-white"
                  title={watchLaterSaved ? 'Remove from Watch later' : 'Save to Watch later'}
                >
                  <svg className="w-5 h-5" fill={watchLaterSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2.4} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" /></svg>
                </button>
              </div>

              <div className="px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/50 font-bold">Playlists</div>
              <div className="max-h-[40vh] overflow-y-auto">
                {saveError && <div className="text-sm text-red-400 px-4 pb-2">{saveError}</div>}
                {saveLoading ? (
                  <div className="text-sm text-white/70 px-4 pb-2">Loading...</div>
                ) : (
                  <>
                    {playlists.length === 0 && (
                      <div className="text-sm text-white/60 px-4 pb-2">No playlists yet.</div>
                    )}
                    {playlists.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center gap-3 px-4 py-2 hover:bg-white/5 transition"
                      >
                        <div className="w-10 h-10 rounded-md bg-white/10 flex items-center justify-center text-white/60 text-xs font-bold">
                          PL
                        </div>
                        <div className="flex-1">
                          <div className="text-white text-sm font-semibold">{p.name}</div>
                          <div className="text-xs text-white/50">Private</div>
                        </div>
                        <button
                          onClick={() => togglePlaylist(p.id, p.hasVideo)}
                          disabled={isSavingAction}
                          className="p-2 rounded-full hover:bg-white/10 text-white"
                          title={p.hasVideo ? 'Remove from playlist' : 'Save to playlist'}
                        >
                          {p.hasVideo ? '✔' : '+'}
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </div>

              <div className="px-4 py-3 border-t border-white/10">
                <div className="flex items-center gap-2 bg-white/5 rounded-full px-3 py-2.5">
                  <input
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    placeholder="New playlist"
                    className="flex-1 bg-transparent text-white text-sm focus:outline-none"
                  />
                  <button
                    onClick={createPlaylist}
                    disabled={!newPlaylistName.trim() || isSavingAction}
                    className="text-white font-semibold disabled:opacity-50"
                  >
                    + New
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-6 z-50">
          <div
            className={`px-4 py-3 rounded-xl shadow-2xl border ${toast.kind === 'success' ? 'bg-white text-black border-white/40' : 'bg-red-600 text-white border-red-400'
              }`}
          >
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}
