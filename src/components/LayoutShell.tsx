'use client';

import { useEffect, useState, Suspense } from 'react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import MobileDrawer from '@/components/MobileDrawer';
import TopLoader from '@/components/TopLoader';
import AppInstallBanner from '@/components/AppInstallBanner';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';
import SplashScreen from '@/components/SplashScreen';
import WhoIsWatchingOverlay from '@/components/WhoIsWatchingOverlay';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const STORAGE_KEY = 'playra_sidebar_collapsed';


interface LayoutShellProps {
  children: React.ReactNode;
  activeProfile: any; // Using any to avoid complex type imports for now, or define a basic shape
}

export default function LayoutShell({ children, activeProfile }: LayoutShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const [showWhoIsWatching, setShowWhoIsWatching] = useState(false);
  const [userProfiles, setUserProfiles] = useState<any[]>([]);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  const isStylesPage = pathname?.startsWith('/styles');
  const isStudio = pathname?.startsWith('/studio');
  const isCreatePage = pathname?.startsWith('/create');

  // Load profiles helper
  const loadProfiles = async (userId: string) => {
    try {
      const { getUserProfiles } = await import('@/app/actions/profile');
      const pros = await getUserProfiles(userId);
      setUserProfiles(pros);
    } catch (e) {
      console.error("LayoutShell: Failed to load profiles", e);
    }
  };

  useEffect(() => {
    setMounted(true);

    // Initial load check
    const hasSeenSplash = sessionStorage.getItem('playra_splash_seen');
    if (!hasSeenSplash) {
      setShowSplash(true);
      sessionStorage.setItem('playra_splash_seen', 'true');
    } else {
      setIsFirstLoad(false);
    }

    // Auth Listener
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsSignedIn(true);
        setUser(user);
        loadProfiles(user.uid);
      } else {
        setIsSignedIn(false);
        setUser(null);
        setUserProfiles([]);
      }
    });

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      setIsSidebarCollapsed(stored === 'true');
    } else {
      setIsSidebarCollapsed(true);
    }

    return () => unsubscribeAuth();
  }, []);

  // Handle flow after splash
  const handleSplashFinish = () => {
    setShowSplash(false);
    setIsFirstLoad(false);

    // If signed in but no active profile, show account switcher
    if (isSignedIn && !activeProfile) {
      setShowWhoIsWatching(true);
    }
  };

  // If signed in but activeProfile disappears (e.g. cookie cleared) and we aren't showing splash
  useEffect(() => {
    if (!showSplash && isSignedIn && !activeProfile && userProfiles.length > 0 && !showWhoIsWatching && !isFirstLoad) {
      // Check if we are on an auth page, if so don't show overlay
      const isAuth = pathname === '/signin' || pathname === '/set-account' || pathname === '/select-profile';
      if (!isAuth) {
        setShowWhoIsWatching(true);
      }
    }
  }, [isSignedIn, activeProfile, showSplash, userProfiles, pathname, isFirstLoad, showWhoIsWatching]);


  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  const toggleSidebar = () => {
    const newState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newState);
    localStorage.setItem(STORAGE_KEY, String(newState));
  };

  const handleToggleSignIn = () => {
    if (isSignedIn) {
      router.push('/set-account');
    } else {
      router.push('/signin');
    }
  };

  const sidebarWidth = isSidebarCollapsed ? (typeof window !== 'undefined' && window.innerWidth < 768 ? '0px' : '80px') : '256px';
  const mobileSidebarWidth = '0px';

  const isAuthPage = pathname === '/signin' || pathname === '/set-account' || pathname === '/select-profile' || pathname === '/privacy' || pathname === '/terms' || pathname === '/help';

  if (!isOnline) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <div suppressHydrationWarning className="fixed top-0 left-0 right-0 h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4 z-50">
          <button className="p-2 rounded-full hover:bg-gray-800 text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <img src="/Playra.png" alt="Playra" className="h-6 w-auto brightness-200" />
          <div suppressHydrationWarning className="w-10" />
        </div>
        <div suppressHydrationWarning className="pt-32 flex flex-col items-center justify-center p-6 text-center">
          <div suppressHydrationWarning className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mb-8">
            <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-6.364-2.637m4.95-4.95a3 3 0 010-4.243m0 0L2.122 2.122m5.657 5.657L5.657 5.657" /></svg>
          </div>
          <h2 className="text-2xl font-black mb-4">No connection</h2>
          <p className="text-gray-400 mb-8 max-w-sm">Connect to the internet to continue exploring Playra's next-gen discovery.</p>
          <button onClick={() => window.location.reload()} className="bg-white text-black px-8 py-3 rounded-full font-black text-sm active:scale-95 transition-all">Retry</button>
        </div>
      </div>
    );
  }

  if (isAuthPage) {
    return <main className="min-h-screen bg-black">{children}</main>;
  }

  // Studio and Create pages have their own shell; avoid double nav/sidebars
  if (isStudio || isCreatePage) {
    return <>{children}</>;
  }

  return (
    <>
      <Suspense fallback={null}>
        <TopLoader />
      </Suspense>
      <Navbar
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={toggleSidebar}
        isSignedIn={isSignedIn}
        onToggleSignIn={handleToggleSignIn}
        onToggleMobileDrawer={() => setIsMobileDrawerOpen(true)}
        activeProfile={activeProfile}
      />

      <div
        suppressHydrationWarning
        className="flex bg-[#0f0f0f] min-h-screen"
      >
        <style jsx global>{`
          :root {
            --sidebar-width-mobile: 0px;
            --sidebar-width-desktop-collapsed: 80px;
            --sidebar-width-desktop-expanded: 256px;
          }
          @media (max-width: 1023px) {
            .main-shell-container { --sidebar-width: 0px; }
          }
        `}</style>
        <Sidebar isCollapsed={isSidebarCollapsed} isSignedIn={isSignedIn} activeProfile={activeProfile} />

        <main
          className={`flex-1 min-w-0 main-content-area transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'
            }`}
        >
          {children}
        </main>
      </div>

      <MobileNav
        isSignedIn={isSignedIn}
        userAvatar={user?.photoURL || ""}
      />

      <MobileDrawer
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
        isSignedIn={isSignedIn}
      />

      <AppInstallBanner />
      <ServiceWorkerRegister />

      {showSplash && (
        <SplashScreen onFinish={handleSplashFinish} />
      )}

      {showWhoIsWatching && !showSplash && (
        <WhoIsWatchingOverlay
          profiles={userProfiles}
          userId={user?.uid}
          onSelect={() => {
            setShowWhoIsWatching(false);
            window.location.reload(); // Refresh to pick up active profile cookie
          }}
        />
      )}
    </>
  );
}

