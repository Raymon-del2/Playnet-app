'use client';

import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
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
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(true);
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const profileContainerRef = useRef<HTMLDivElement>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const suggestions = [
    'Next.js tutorial',
    'React hooks',
    'TypeScript tips',
    'CSS grid layout',
    'Node.js API',
    'Machine learning basics',
    'Web performance',
  ];

  const filteredSuggestions = useMemo(
    () =>
      suggestions.filter((suggestion) =>
        suggestion.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [searchQuery],
  );

  const handleSearch = (query = searchQuery) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push(`/results?search_query=${encodeURIComponent(trimmed)}`);
    setIsDropdownOpen(false);
  };

  return (
    <nav className="bg-gray-900/95 backdrop-blur-xl fixed top-0 left-0 right-0 z-50 border-b border-white/5 h-14 sm:h-16">
      <div className="container-fluid mx-auto px-4">
        <div className="flex items-center justify-between h-14 sm:h-16">
          <div className="flex items-center gap-4">
            <button
              onClick={onToggleSidebar}
              className="hidden lg:flex p-2 rounded-full hover:bg-white/10 text-white transition-all active:scale-90"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>

            <Link href="/" className="flex items-center gap-1">
              <div className="relative flex items-center">
                <img src="/Playra.png" alt="Playra" className="h-[20px] sm:h-[22px] w-auto brightness-200" />
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter ml-1.5 hidden xs:block">{countryCode}</span>
              </div>
            </Link>
          </div>

          <div className="hidden md:flex flex-1 max-w-2xl mx-8">
            <div className="flex w-full items-center">
              <div className="relative flex-1 group">
                <input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  className="w-full bg-zinc-900 text-white pl-5 pr-5 py-2 rounded-l-full border border-zinc-800 focus:outline-none focus:border-blue-500/50 transition-all font-medium"
                />
              </div>
              <button className="bg-zinc-800 hover:bg-zinc-700 px-6 py-[9.5px] rounded-r-full border-y border-r border-zinc-800 transition-colors">
                <svg className="w-5 h-5 text-gray-200" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </button>
              <button className="ml-4 p-2.5 rounded-full bg-zinc-800 text-white hover:bg-zinc-700 active:scale-95 transition-all">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" /><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" /></svg>
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-4">
            <button className="hidden xs:flex p-2 rounded-full hover:bg-white/10 text-white active:scale-90 transition-all">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.5v3.375C3 17.439 3.561 18 4.125 18h3.375m-4.5-9a4.5 4.5 0 014.5-4.5h11.25a4.5 4.5 0 014.5 4.5v11.25a4.5 4.5 0 01-4.5 4.5H10.5" /><path d="M3 13.5c3.314 0 6 2.686 6 6M3 9c5.523 0 10 4.477 10 10" /></svg>
            </button>

            {activeProfile && (
              <div className="relative">
                <button
                  onClick={() => setIsCreateMenuOpen(!isCreateMenuOpen)}
                  className="hidden sm:flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm transition-all active:scale-95 border border-white/5"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  <span>Create</span>
                </button>

                <CreateMenu
                  isOpen={isCreateMenuOpen}
                  onClose={() => setIsCreateMenuOpen(false)}
                />
              </div>
            )}

            <div className="relative">
              <button
                onClick={() => {
                  setIsNotificationsOpen(!isNotificationsOpen);
                  if (!isNotificationsOpen) {
                    setHasUnreadNotifications(false);
                  }
                }}
                className="flex p-2 rounded-full hover:bg-white/10 text-white active:scale-90 transition-all relative"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>
                {hasUnreadNotifications && (
                  <span className="absolute top-0.5 right-0.5 bg-red-600 text-[9px] font-bold text-white px-1 rounded-full min-w-[14px] text-center border border-gray-900 leading-tight">9+</span>
                )}
              </button>

              <NotificationsPopup
                isOpen={isNotificationsOpen}
                onClose={() => setIsNotificationsOpen(false)}
              />
            </div>


            {activeProfile ? (
              <div
                className="relative ml-1"
                ref={profileContainerRef}
              >
                <div
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
  );
}

