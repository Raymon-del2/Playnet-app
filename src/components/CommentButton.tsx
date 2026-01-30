import React from 'react';

interface CommentButtonProps {
    onClick?: () => void;
    commentCount?: number;
}

const CommentButton = ({ onClick, commentCount = 0 }: CommentButtonProps) => {
    return (
        <div className="group relative flex flex-col items-center gap-1">
            <button
                onClick={onClick}
                className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 text-white hover:bg-white/20 transition-all hover:scale-110"
            >
                <div className="group relative">
                    <svg strokeLinejoin="round" strokeLinecap="round" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" height={24} width={24} xmlns="http://www.w3.org/2000/svg" className="w-6 hover:scale-125 duration-200 hover:stroke-blue-500" fill="none">
                        <path fill="none" d="M0 0h24v24H0z" stroke="none" />
                        <path d="M8 9h8" />
                        <path d="M8 13h6" />
                        <path d="M18 4a3 3 0 0 1 3 3v8a3 3 0 0 1 -3 3h-5l-5 3v-3h-2a3 3 0 0 1 -3 -3v-8a3 3 0 0 1 3 -3h12z" />
                    </svg>
                </div>
            </button>
            <span className="text-[10px] font-black text-white drop-shadow-md uppercase tracking-tighter">
                {commentCount > 0 ? commentCount : 'Comment'}
            </span>

            {/* Tooltip moved to the left to avoid screen edge clipping */}
            <span className="absolute top-1/2 -translate-y-1/2 right-[110%] z-20 origin-right scale-0 px-3 py-1.5 rounded-lg border border-white/20 bg-zinc-900 text-white text-[10px] font-black uppercase tracking-widest shadow-2xl transition-all duration-200 ease-out group-hover:scale-100 pointer-events-none whitespace-nowrap backdrop-blur-md">
                Comment
            </span>
        </div>
    );
}

export default CommentButton;
