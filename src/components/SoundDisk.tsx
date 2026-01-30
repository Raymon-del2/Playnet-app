import React from 'react';

const SoundDisk = ({ avatar, className = "" }: { avatar?: string, className?: string }) => {
    return (
        <div className={`relative w-11 h-11 flex items-center justify-center ${className}`}>
            {/* Spinning Disk Background */}
            <div className="absolute inset-0 bg-neutral-800 rounded-full border-[6px] border-neutral-900 shadow-2xl animate-[spin_4s_linear_infinite]" />

            {/* Inner Grooves */}
            <div className="absolute inset-2 border border-neutral-700/50 rounded-full" />

            {/* Avatar / Center */}
            <div className="relative w-5 h-5 rounded-full overflow-hidden border border-neutral-600 animate-[spin_4s_linear_infinite]">
                <img
                    src={avatar || '/default-avatar.png'}
                    alt="Current Sound"
                    className="w-full h-full object-cover"
                />
            </div>

            {/* Vinyl Shine Effect */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none" />

            {/* Spawning Notes Animation (Optional CSS only) */}
            <div className="absolute -top-4 -left-4 pointer-events-none animate-bounce opacity-40">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" /></svg>
            </div>
        </div>
    );
};

export default SoundDisk;
