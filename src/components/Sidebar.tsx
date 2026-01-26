'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type SidebarProps = {
  isCollapsed: boolean;
  isSignedIn?: boolean;
  activeProfile?: any;
};

export default function Sidebar({ isCollapsed, isSignedIn = false, activeProfile }: SidebarProps) {
  const pathname = usePathname();

  // Combine auth states
  const isUserAuthenticated = isSignedIn || !!activeProfile;

  const mainItems = [
    { icon: 'home', label: 'Home', path: '/' },
    { icon: 'styles', label: 'Style', path: '/styles' },
    { icon: 'subscriptions', label: 'Subscriptions', path: '/subscriptions', protected: true },
  ];

  const youItems = [
    ...(activeProfile ? [{ icon: 'yourChannel', label: 'Your channel', path: '/channel' }] : []),
    { icon: 'history', label: 'History', path: '/history' },
    { icon: 'playlists', label: 'Playlists', path: '/playlists' },
    { icon: 'watchLater', label: 'Watch later', path: '/watch-later' },
    { icon: 'liked', label: 'Liked videos', path: '/liked' },
  ];


  const exploreItems = [
    { icon: 'trending', label: 'Trending', path: '/trending' },
    { icon: 'music', label: 'Music', path: '/music' },
    { icon: 'gaming', label: 'Gaming', path: '/gaming' },
    { icon: 'sports', label: 'Sports', path: '/sports' },
  ];

  const bottomItems = [
    { icon: 'settings', label: 'Settings', path: '/settings' },
    { icon: 'report', label: 'Report history', path: '/report' },
    { icon: 'help', label: 'Help', path: '/help' },
    { icon: 'feedback', label: 'Feedback', path: '/feedback' },
  ];

  const getIcon = (icon: string) => {
    const icons: { [key: string]: JSX.Element } = {
      home: <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3L4 9v12h5v-7h6v7h5V9z" /></svg>,
      styles: <img src="/styles-icon.svg?v=blue" alt="" className="w-6 h-6 object-contain" />,
      subscriptions: <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>,
      yourChannel: <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
      history: <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
      playlists: <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h12" /></svg>,
      watchLater: <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
      liked: <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>,
      trending: <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>,
      music: <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>,
      gaming: <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11 15.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm4 0a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM12 4c-5.522 0-10 4.478-10 10s4.478 10 10 10 10-4.478 10-10-4.478-10-10-10zM12 18l-1-2h2l-1 2z" /></svg>,
      sports: <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
      settings: <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
      report: <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-7h1" /></svg>,
      help: <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
      feedback: <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>,
    };
    return icons[icon] || icons.home;
  };

  const renderItem = (item: any) => (
    <li key={item.path}>
      <Link
        href={item.protected && !isUserAuthenticated ? '/signin' : item.path}
        className={`rounded-xl transition-all duration-200 ${isCollapsed
          ? 'flex flex-col items-center gap-1.5 py-4'
          : 'flex items-center space-x-5 px-3 py-2.5'
          } ${pathname === item.path
            ? 'bg-white/10 text-white font-bold'
            : 'text-gray-300 hover:bg-white/5 hover:text-white'
          }`}
      >
        <span className={`${pathname === item.path ? 'text-white' : 'text-gray-400'} transition-colors`}>
          {getIcon(item.icon)}
        </span>
        <span className={`${isCollapsed ? 'text-[10px]' : 'text-[14px]'} truncate`}>{item.label}</span>
      </Link>
    </li>
  );

  return (
    <aside
      className={`fixed left-0 top-16 h-[calc(100vh-64px)] bg-gray-900 overflow-y-auto hidden lg:block transition-all duration-300 border-r border-white/5 scrollbar-hide ${isCollapsed ? 'w-20' : 'w-64'
        }`}
    >
      <div className={`py-3 ${isCollapsed ? 'px-1' : 'px-3'}`}>
        <ul className="space-y-0.5 mb-3">
          {mainItems.map(renderItem)}
        </ul>

        {!isCollapsed && (
          <>
            {isUserAuthenticated && (
              <>
                <div className="h-px bg-white/10 my-3 mx-3" />

                <div className="flex items-center space-x-2 px-3 py-2 mb-1 group cursor-pointer hover:bg-white/5 rounded-xl transition-colors">
                  <span className="text-[16px] font-bold text-white">You</span>
                  <svg className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </div>

                <ul className="space-y-0.5">
                  {youItems.map(renderItem)}
                </ul>
              </>
            )}

            {!isUserAuthenticated && (
              <>
                <div className="h-px bg-white/10 my-3 mx-3" />
                <div className="px-6 py-4 bg-white/5 rounded-2xl mx-3 mb-4 border border-white/5">
                  <p className="text-[13px] text-gray-300 mb-4 leading-relaxed font-medium">
                    Sign in to like videos, comment, and subscribe.
                  </p>
                  <Link
                    href="/signin"
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-full border border-blue-500/50 text-blue-400 hover:bg-blue-400/10 transition-all font-bold text-sm"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Sign in
                  </Link>
                </div>
              </>
            )}

            <div className="h-px bg-white/10 my-3 mx-3" />

            <div className="px-3 py-2">
              <h3 className="text-[16px] font-bold text-white mb-1">Explore</h3>
            </div>
            <ul className="space-y-0.5">
              {exploreItems.map(renderItem)}
            </ul>

            <div className="h-px bg-white/10 my-3 mx-3" />

            <ul className="space-y-0.5 mb-6">
              {bottomItems.map(renderItem)}
            </ul>

            <div className="px-6 py-4 text-[12px] font-semibold text-gray-500 space-y-3">
              <div className="flex flex-wrap gap-x-2 gap-y-1">
                <a href="#" className="hover:underline">About</a>
                <a href="#" className="hover:underline">Press</a>
                <a href="#" className="hover:underline">Copyright</a>
                <a href="#" className="hover:underline">Contact us</a>
                <a href="#" className="hover:underline">Creators</a>
                <a href="#" className="hover:underline">Advertise</a>
                <a href="#" className="hover:underline">Developers</a>
              </div>
              <div className="flex flex-wrap gap-x-2 gap-y-1">
                <a href="#" className="hover:underline">Terms</a>
                <a href="#" className="hover:underline">Privacy</a>
                <a href="#" className="hover:underline">Policy & Safety</a>
                <a href="#" className="hover:underline">How Playra works</a>
                <a href="#" className="hover:underline">Test new features</a>
              </div>
              <div className="pt-2 font-normal text-gray-600">
                © 2026 Google LLC
              </div>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}

