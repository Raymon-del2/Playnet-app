'use client';

import { useEffect, useState } from 'react';

export default function SplashScreen({ onFinish }: { onFinish: () => void }) {
    const [isFading, setIsFading] = useState(false);

    useEffect(() => {
        // Phase 1: Draw Logo (2.5s)
        // Phase 2: Fade Out (0.5s)
        const timer = setTimeout(() => {
            setIsFading(true);
            setTimeout(onFinish, 500); // Trigger the unmount callback
        }, 2500);

        return () => clearTimeout(timer);
    }, [onFinish]);

    return (
        <div className={`fixed inset-0 z-[9999] flex items-center justify-center bg-[#0f0f0f] transition-opacity duration-500 ${isFading ? 'opacity-0' : 'opacity-100'}`}>
            <div className="relative w-32 h-32 flex items-center justify-center">
                {/* The Glowing Gradient Background for the Stroke */}
                <svg className="absolute inset-0 w-full h-full drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]" viewBox="0 0 100 100">
                    <defs>
                        <linearGradient id="styles-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#2563eb" /> {/* Blue */}
                            <stop offset="100%" stopColor="#9333ea" /> {/* Purple */}
                        </linearGradient>
                    </defs>

                    {/* The "Play" Triangle Path - Drawing Animation */}
                    <path
                        d="M35 25 L75 50 L35 75 Z"
                        fill="none"
                        stroke="url(#styles-gradient)"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="animate-draw-logo"
                    />
                </svg>
            </div>
        </div>
    );
}
