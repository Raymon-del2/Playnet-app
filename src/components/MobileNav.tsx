'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function MobileNav({
    isSignedIn = false,
    userAvatar = ""
}: {
    isSignedIn?: boolean,
    userAvatar?: string
}) {
    const pathname = usePathname();

    const navItems = [
        { icon: 'home', label: 'Home', path: '/' },
        { icon: 'shorts', label: 'Style', path: '/styles' },
        { icon: 'create', label: '', path: '/create', isAction: true },
        { icon: 'subscriptions', label: 'Subscriptions', path: '/subscriptions' },
        { icon: 'you', label: 'You', path: '/library' },
    ];

    const getIcon = (item: any) => {
        const isActive = pathname === item.path;
        const icons: { [key: string]: JSX.Element } = {
            home: <svg className="w-6 h-6" fill={isActive ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M12 3L4 9v12h5v-7h6v7h5V9z" /></svg>,
            shorts: (
                <div className="relative">
                    <img src="/styles-icon.svg?v=blue" alt="" className={`w-6 h-6 object-contain ${isActive ? '' : 'grayscale opacity-80'}`} />
                </div>
            ),
            create: (
                <div className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors active:scale-90 border border-white/5 shadow-xl">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                </div>
            ),
            subscriptions: <svg className="w-6 h-6" fill={isActive ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>,
            you: (
                <div className={`w-7 h-7 rounded-full overflow-hidden border-2 shadow-md transition-all ${isActive ? 'border-white scale-110' : 'border-white/10 grayscale-[0.3]'}`}>
                    {isSignedIn && userAvatar ? (
                        <img src={userAvatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                        </div>
                    )}
                </div>
            ),
        };

        return icons[item.icon];
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[100] lg:hidden animate-slide-in-up">
            <nav className="w-full bg-[#0f0f0f]/95 backdrop-blur-xl border-t border-white/5 h-[64px] flex items-center justify-around px-0 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
                {navItems.map((item) => {
                    const isActive = pathname === item.path;
                    return (
                        <Link
                            key={item.path}
                            href={item.path}
                            onClick={(e) => {
                                if (isActive && item.path === '/') {
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }
                            }}
                            className="flex flex-col items-center justify-center flex-1 h-full active:scale-95 transition-transform"
                        >
                            <span className={`${isActive ? 'text-white' : 'text-zinc-400'} transition-colors mb-1`}>
                                {getIcon(item)}
                            </span>
                            {item.label && (
                                <span className={`text-[10px] font-medium tracking-tight truncate w-full text-center transition-colors ${isActive ? 'text-white' : 'text-zinc-500'}`}>
                                    {item.label}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}

// Add CSS for slide-in animation if not already present

