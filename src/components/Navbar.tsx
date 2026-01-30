'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocation } from '@/hooks/useLocation';
import ProfileMenu from './ProfileMenu';
import NotificationsPopup from './NotificationsPopup';
import CreateMenu from './CreateMenu';

type NavbarProps = {
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  isSignedIn?: boolean;
  onToggleSignIn?: () => void;
  onToggleMobileDrawer?: () => void;
  activeProfile?: any;
};

export default function Navbar({
  isSidebarCollapsed,
  onToggleSidebar,
  isSignedIn = false,
  onToggleSignIn,
  onToggleMobileDrawer,
  activeProfile
}: NavbarProps) {
  const router = useRouter();
  const countryCode = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<{ videos: any[]; profiles: any[] }>({ videos: [], profiles: [] });
  const [isLoadingSuggest, setIsLoadingSuggest] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchCacheRef = useRef<Map<string, { videos: any[]; profiles: any[]; timestamp: number }>>(new Map());
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);
  const profileContainerRef = useRef<HTMLDivElement>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recognitionRef = useRef<any>(null);

  const getSpeechRecognition = () => {
    if (typeof window === 'undefined') return null;
    return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
  };

  useEffect(() => {
    const SpeechRecognition = getSpeechRecognition();
    setIsSpeechSupported(Boolean(SpeechRecognition));

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const handleSearch = (query = searchQuery) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setIsSearching(true);
    router.push(`/results?search_query=${encodeURIComponent(trimmed)}`);
    setIsDropdownOpen(false);
    setTimeout(() => setIsSearching(false), 500);
  };

  const fetchSuggestions = async (query: string) => {
    if (query.length < 2) {
      setSuggestions({ videos: [], profiles: [] });
      return;
    }

    // Check cache (30 second expiry)
    const cached = searchCacheRef.current.get(query);
    if (cached && Date.now() - cached.timestamp < 30000) {
      setSuggestions(cached);
      return;
    }

    setIsLoadingSuggest(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&dropdown=true&limit=6`);
      const json = await res.json();
      setSuggestions({ videos: json.videos || [], profiles: json.profiles || [] });
      // Cache results
      searchCacheRef.current.set(query, { videos: json.videos || [], profiles: json.profiles || [], timestamp: Date.now() });
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
      setSuggestions({ videos: [], profiles: [] });
    } finally {
      setIsLoadingSuggest(false);
    }
  };

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (searchQuery.length >= 2 && isDropdownOpen) {
      searchTimeoutRef.current = setTimeout(() => {
        fetchSuggestions(searchQuery);
      }, 300);
    } else if (searchQuery.length < 2) {
      setSuggestions({ videos: [], profiles: [] });
    }

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery, isDropdownOpen]);

  const startListening = () => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      setIsSpeechSupported(false);
      return;
    }

    if (!recognitionRef.current) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = navigator?.language || 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event);
        setIsListening(false);
      };
      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript.trim()) {
          setSearchQuery(transcript.trim());
        }
      };

      recognitionRef.current = recognition;
    }

    try {
      recognitionRef.current.start();
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
      return;
    }
    startListening();
  };

  return (
    <>
      <nav suppressHydrationWarning className="fixed top-0 left-0 right-0 h-14 bg-[#0f0f0f] border-b border-white/5 md:border-b z-50 flex items-center">
        {/* Progress line */}
        {isSearching && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500 animate-pulse" />
        )}
        <div suppressHydrationWarning className="w-full px-4">
          <div suppressHydrationWarning className="flex items-center justify-between h-14 gap-2">
            <div suppressHydrationWarning className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={onToggleSidebar}
                className="hidden lg:flex p-2 rounded-full hover:bg-white/10 text-white transition-all active:scale-90"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>

              <Link href="/" className="flex items-center gap-2 flex-shrink-0 group">
                <div suppressHydrationWarning className="flex items-center gap-2">
                  <img src="/Playra.png" alt="Playra" className="h-[22px] w-auto brightness-110" />
                  <span className="text-white font-black text-lg tracking-tighter uppercase leading-none">Playra</span>
                </div>
                <span className="hidden xs:inline text-[9px] font-black text-zinc-500 uppercase tracking-widest bg-zinc-800/50 px-1.5 py-0.5 rounded ml-1 border border-white/5">
                  {countryCode || 'KE'}
                </span>
              </Link>
            </div>

            <div suppressHydrationWarning className="hidden md:flex flex-1 max-w-2xl mx-4">
              <div suppressHydrationWarning className="flex w-full items-center">
                <div suppressHydrationWarning className="relative flex-1 group">
                  <input
                    type="text"
                    placeholder="Search videos or profiles"
                    value={searchQuery}
                    onFocus={() => setIsDropdownOpen(true)}
                    onChange={(event) => {
                      setSearchQuery(event.target.value);
                      setIsDropdownOpen(true);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        handleSearch();
                      }
                    }}
                    className="w-full bg-zinc-900 text-white pl-5 pr-5 py-2 rounded-l-full border border-zinc-800 focus:outline-none focus:border-blue-500/50 transition-all font-medium"
                  />
                  {isDropdownOpen && searchQuery.trim() && (
                    <div suppressHydrationWarning className="absolute left-0 right-0 top-full mt-2 bg-zinc-950 border border-white/10 rounded-xl shadow-2xl z-40 overflow-hidden">
                      {isLoadingSuggest && (
                        <div className="px-4 py-3 text-sm text-zinc-400">Searching...</div>
                      )}
                      {!isLoadingSuggest && suggestions.videos.length === 0 && suggestions.profiles.length === 0 && (
                        <button
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setIsDropdownOpen(false);
                            handleSearch(searchQuery);
                          }}
                          className="w-full px-4 py-3 text-sm text-zinc-200 flex items-center gap-2 hover:bg-white/5 text-left"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                          <span>Search for "{searchQuery}"</span>
                        </button>
                      )}
                      {!isLoadingSuggest && (suggestions.videos.length > 0 || suggestions.profiles.length > 0) && (
                        <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
                          {suggestions.profiles.length > 0 && (
                            <div className="py-2">
                              <div className="px-4 pb-1 text-[11px] uppercase tracking-[0.18em] text-zinc-500 font-bold">Profiles</div>
                              {suggestions.profiles.map((p: any) => (
                                <button
                                  key={p.id}
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => {
                                    setIsDropdownOpen(false);
                                    router.push(`/channel/${p.id}`);
                                  }}
                                  className="w-full px-4 py-2 flex items-center gap-3 hover:bg-white/5 text-left"
                                >
                                  <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-800 flex-shrink-0">
                                    {p.avatar ? (
                                      <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-xs font-bold text-zinc-400">
                                        {p.name?.[0]?.toUpperCase() || '?'}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-sm text-white font-semibold truncate">{p.name}</span>
                                    <span className="text-xs text-zinc-500 truncate">@{p.name?.replace(/^@+/, '').replace(/\s+/g, '').toLowerCase()}</span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                          {suggestions.videos.length > 0 && (
                            <div className="py-2">
                              <div className="px-4 pb-1 text-[11px] uppercase tracking-[0.18em] text-zinc-500 font-bold">Videos</div>
                              {suggestions.videos.map((v: any) => (
                                <button
                                  key={v.id}
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => {
                                    setIsDropdownOpen(false);
                                    router.push(`/watch/${v.id}`);
                                  }}
                                  className="w-full px-4 py-2 flex items-center gap-3 hover:bg-white/5 text-left"
                                >
                                  <div className="w-12 h-7 rounded-md overflow-hidden bg-zinc-800 flex-shrink-0">
                                    <img src={v.thumbnail_url} alt={v.title} className="w-full h-full object-cover" />
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-sm text-white font-semibold truncate">{v.title}</span>
                                    <span className="text-xs text-zinc-500 truncate">{v.channel_name}</span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleSearch()}
                  className="bg-zinc-800 hover:bg-zinc-700 px-6 py-[9.5px] rounded-r-full border-y border-r border-zinc-800 transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-200" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </button>
                <button
                  onClick={handleMicClick}
                  disabled={!isSpeechSupported}
                  aria-pressed={isListening}
                  aria-label={isSpeechSupported ? 'Voice search' : 'Voice search not supported'}
                  className={`ml-4 p-2.5 rounded-full text-white active:scale-95 transition-all ${isListening ? 'bg-red-600 hover:bg-red-500' : 'bg-zinc-800 hover:bg-zinc-700'} ${!isSpeechSupported ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" /><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" /></svg>
                </button>
              </div>
            </div>

            <div suppressHydrationWarning className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">

              <button className="hidden xs:flex p-2 rounded-full hover:bg-white/10 text-white active:scale-90 transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.5v3.375C3 17.439 3.561 18 4.125 18h3.375m-4.5-9a4.5 4.5 0 014.5-4.5h11.25a4.5 4.5 0 014.5 4.5v11.25a4.5 4.5 0 01-4.5 4.5H10.5" /><path d="M3 13.5c3.314 0 6 2.686 6 6M3 9c5.523 0 10 4.477 10 10" /></svg>
              </button>

              {activeProfile && (
                <div suppressHydrationWarning className="relative">
                  <button
                    suppressHydrationWarning
                    onClick={() => setIsCreateMenuOpen(!isCreateMenuOpen)}
                    className="hidden sm:flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm transition-all active:scale-95 border border-white/5"
                  >
                    <svg suppressHydrationWarning className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    <span suppressHydrationWarning>Create</span>
                  </button>

                  <CreateMenu
                    isOpen={isCreateMenuOpen}
                    onClose={() => setIsCreateMenuOpen(false)}
                  />
                </div>
              )}

              <div suppressHydrationWarning className="relative">
                <button
                  suppressHydrationWarning
                  onClick={() => {
                    setIsNotificationsOpen(!isNotificationsOpen);
                    if (!isNotificationsOpen) setHasUnreadNotifications(false);
                  }}
                  className="flex p-2 rounded-full hover:bg-white/10 text-white active:scale-90 transition-all relative"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>
                  {hasUnreadNotifications && notificationCount > 0 && (
                    <span className="absolute top-0.5 right-0.5 bg-red-600 text-[9px] font-bold text-white px-1 rounded-full min-w-[14px] text-center border border-gray-900 leading-tight">
                      {notificationCount}
                    </span>
                  )}
                </button>

                <NotificationsPopup
                  isOpen={isNotificationsOpen}
                  onClose={() => setIsNotificationsOpen(false)}
                  onCountChange={(count) => {
                    setNotificationCount(count);
                    if (count > 0) setHasUnreadNotifications(true);
                    else setHasUnreadNotifications(false);
                  }}
                />
              </div>


              {activeProfile ? (
                <div
                  suppressHydrationWarning
                  className="relative ml-1"
                  ref={profileContainerRef}
                >
                  <div
                    suppressHydrationWarning
                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden border border-white/10 cursor-pointer active:scale-95 transition-transform"
                    title={activeProfile.name}
                  >
                    {activeProfile.avatar ? (
                      <img src={activeProfile.avatar} alt={activeProfile.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400">
                        {activeProfile.name[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>

                  <ProfileMenu
                    isOpen={isProfileMenuOpen}
                    onClose={() => setIsProfileMenuOpen(false)}
                    activeProfile={activeProfile}
                  />
                </div>
              ) : isSignedIn ? (
                <div
                  suppressHydrationWarning
                  onClick={onToggleSignIn}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 border border-white/10 cursor-pointer active:scale-95 transition-transform ml-1"
                />
              ) : (
                <button
                  onClick={onToggleSignIn}
                  className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-1.5 rounded-full border border-blue-500/50 text-blue-400 hover:bg-blue-400/10 transition-all font-bold text-[14px]"
                >
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                  <span className="hidden xs:inline">Sign in</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Search Bar - separate row below navbar */}
      <div suppressHydrationWarning className="fixed top-14 left-0 right-0 h-12 bg-[#0f0f0f] border-b border-white/5 z-[60] flex items-center px-4 md:hidden">
        <div suppressHydrationWarning className="relative w-full z-[70]">
          <input
            type="text"
            placeholder="Search videos or profiles"
            value={searchQuery}
            onFocus={() => setIsDropdownOpen(true)}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsDropdownOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearch();
            }}
            className="w-full bg-zinc-800 text-white pl-10 pr-12 py-2 rounded-full text-sm border border-zinc-700 focus:outline-none focus:border-blue-500/50 placeholder:text-zinc-500"
          />
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <button
            onClick={handleMicClick}
            disabled={!isSpeechSupported}
            className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-colors ${isListening ? 'text-red-400' : 'text-zinc-500'} ${!isSpeechSupported ? 'opacity-40' : ''}`}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" /><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" /></svg>
          </button>

          {/* Mobile Search Dropdown */}
          {isDropdownOpen && searchQuery.trim() && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-zinc-950 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
              {isLoadingSuggest && (
                <div className="px-4 py-3 text-sm text-zinc-400">Searching...</div>
              )}
              {!isLoadingSuggest && suggestions.videos.length === 0 && suggestions.profiles.length === 0 && (
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setIsDropdownOpen(false);
                    handleSearch(searchQuery);
                  }}
                  className="w-full px-4 py-3 text-sm text-zinc-200 flex items-center gap-2 hover:bg-white/5 text-left"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  <span>Search for "{searchQuery}"</span>
                </button>
              )}
              {!isLoadingSuggest && (suggestions.videos.length > 0 || suggestions.profiles.length > 0) && (
                <div className="max-h-[60vh] overflow-y-auto divide-y divide-white/5">
                  {suggestions.profiles.length > 0 && (
                    <div className="py-2">
                      <div className="px-4 pb-1 text-[11px] uppercase tracking-[0.18em] text-zinc-500 font-bold">Profiles</div>
                      {suggestions.profiles.map((p: any) => (
                        <button
                          key={p.id}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setIsDropdownOpen(false);
                            router.push(`/channel/${p.id}`);
                          }}
                          className="w-full px-4 py-2 flex items-center gap-3 hover:bg-white/5 active:bg-white/10 text-left"
                        >
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-800 flex-shrink-0">
                            {p.avatar ? (
                              <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs font-bold text-zinc-400">
                                {p.name?.[0]?.toUpperCase() || '?'}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm text-white font-semibold truncate">{p.name}</span>
                            <span className="text-xs text-zinc-500 truncate">@{p.name?.replace(/^@+/, '').replace(/\s+/g, '').toLowerCase()}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {suggestions.videos.length > 0 && (
                    <div className="py-2">
                      <div className="px-4 pb-1 text-[11px] uppercase tracking-[0.18em] text-zinc-500 font-bold">Videos</div>
                      {suggestions.videos.map((v: any) => (
                        <button
                          key={v.id}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setIsDropdownOpen(false);
                            router.push(`/watch/${v.id}`);
                          }}
                          className="w-full px-4 py-2 flex items-center gap-3 hover:bg-white/5 active:bg-white/10 text-left"
                        >
                          <div className="w-12 h-7 rounded-md overflow-hidden bg-zinc-800 flex-shrink-0">
                            <img src={v.thumbnail_url} alt={v.title} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm text-white font-semibold truncate">{v.title}</span>
                            <span className="text-xs text-zinc-500 truncate">{v.channel_name}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

