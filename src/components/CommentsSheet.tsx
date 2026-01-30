import React, { useState, useRef } from 'react';

interface Comment {
    id: string;
    user: string;
    avatar: string;
    text: string;
    image?: string;
    likes: number;
    timestamp: string;
    replies: Comment[];
    isCreator?: boolean;
    depth: number;
}

interface CommentsSheetProps {
    isOpen: boolean;
    onClose: () => void;
    videoId: string;
}

const MOCK_COMMENTS: Comment[] = [
    {
        id: 'c1',
        user: 'Create Master',
        avatar: '',
        text: 'Thanks for watching! Let me know what you think of this style! 🔥',
        likes: 124,
        timestamp: '2h ago',
        replies: [],
        isCreator: true,
        depth: 0,
    },
    {
        id: 'c2',
        user: 'Alex Johnson',
        avatar: '',
        text: 'This is actually insane. How did you do the transition?',
        likes: 45,
        timestamp: '1h ago',
        depth: 0,
        replies: [
            {
                id: 'c3',
                user: 'Sarah Lee',
                avatar: '',
                text: 'I think it uses the new cut tool!',
                likes: 12,
                timestamp: '45m ago',
                depth: 1,
                replies: [
                    {
                        id: 'c4',
                        user: 'Alex Johnson',
                        avatar: '',
                        text: 'Oh nice, I need to try that.',
                        likes: 5,
                        timestamp: '30m ago',
                        depth: 2,
                        replies: []
                    }
                ]
            }
        ]
    },
    {
        id: 'c5',
        user: 'Mike Brown',
        avatar: '',
        text: 'First!',
        likes: 2,
        timestamp: '5m ago',
        replies: [],
        depth: 0
    }
];

const CommentItem = ({ comment }: { comment: Comment }) => {
    const [isCollapsed, setIsCollapsed] = useState(true);
    const hasReplies = comment.replies && comment.replies.length > 0;

    return (
        <div className="relative">
            <div className="flex gap-3 mb-4 relative z-10">
                <div className="flex-shrink-0">
                    <div className={`w-8 h-8 rounded-full overflow-hidden bg-zinc-700 ${comment.isCreator ? 'border-2 border-yellow-500' : ''}`}>
                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br from-blue-500 to-purple-500">
                            {comment.user[0]}
                        </div>
                    </div>
                </div>

                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-xs font-bold ${comment.isCreator ? 'bg-yellow-500/10 text-yellow-500 px-1.5 rounded' : 'text-zinc-400'}`}>
                            {comment.user}
                        </span>
                        <span className="text-[10px] text-zinc-600">{comment.timestamp}</span>
                    </div>

                    <p className="text-[13px] sm:text-sm text-white leading-relaxed mb-2 break-words overflow-hidden">{comment.text}</p>
                    {comment.image && (
                        <div className="mb-2 rounded-lg overflow-hidden max-w-[200px] border border-white/10">
                            <img src={comment.image} alt="Comment attachment" className="w-full h-auto" />
                        </div>
                    )}

                    <div className="flex items-center gap-4 text-xs font-bold text-zinc-500">
                        <button className="flex items-center gap-1 hover:text-white transition-colors">
                            Like ({comment.likes})
                        </button>
                        <button className="hover:text-white transition-colors">Reply</button>
                    </div>

                    {hasReplies && (
                        <div className="mt-3">
                            {isCollapsed ? (
                                <button
                                    onClick={() => setIsCollapsed(false)}
                                    className="flex items-center gap-2 text-xs font-bold text-blue-400 hover:text-blue-300"
                                >
                                    <div className="w-8 h-[1px] bg-blue-400/50" />
                                    View {comment.replies.length} replies
                                </button>
                            ) : (
                                comment.replies.map((reply) => (
                                    <div key={reply.id} className="relative pl-5 sm:pl-9">
                                        {/* L-Shape Curve - Minimalist on mobile */}
                                        <div className="absolute left-1.5 sm:left-3 top-[-8px] w-2.5 sm:w-5 h-7 border-l-[1.5px] border-b-[1.5px] border-zinc-700/50 rounded-bl-lg"
                                        />
                                        <CommentItem comment={reply} />
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default function CommentsSheet({ isOpen, onClose }: CommentsSheetProps) {
    const [comments, setComments] = useState<Comment[]>(MOCK_COMMENTS);
    const [newComment, setNewComment] = useState('');
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSend = () => {
        if (!newComment.trim() && !selectedImage) return;

        const comment: Comment = {
            id: Date.now().toString(),
            user: 'You',
            avatar: '',
            text: newComment,
            likes: 0,
            timestamp: 'Just now',
            replies: [],
            depth: 0,
            image: selectedImage ? URL.createObjectURL(selectedImage) : undefined
        };

        setComments(prev => [comment, ...prev]);
        setNewComment('');
        setSelectedImage(null);
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm transition-opacity duration-300" onClick={onClose} />
            <div className="fixed bottom-0 left-1/2 -translate-x-1/2 z-[160] w-full max-w-2xl bg-[#0f0f0f] rounded-t-[2.5rem] border-t border-white/10 h-[85vh] sm:h-[70vh] flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.5)] animate-slide-in-up">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <h3 className="text-white font-bold text-lg">Comments <span className="text-zinc-500 text-sm ml-2">{100 + comments.length}</span></h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Creator Message (Pinned) */}
                <div className="px-4 py-3 bg-blue-500/10 border-b border-blue-500/20">
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-black font-bold text-xs ring-2 ring-blue-500 ring-offset-2 ring-offset-[#0f0f0f]">
                            C
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <span className="text-blue-400 font-bold text-xs">Pinned by Creator</span>
                            </div>
                            <p className="text-sm text-white mt-1">
                                Check out my other styles for the tutorial on this effect! Also link in bio for the preset.
                            </p>
                        </div>
                        <button className="text-zinc-500 hover:text-white">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                        </button>
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4">
                    {comments.map((comment) => (
                        <CommentItem key={comment.id} comment={comment} />
                    ))}
                </div>

                {/* Footer Input */}
                <div className="p-4 border-t border-white/10 bg-[#0f0f0f]">
                    {selectedImage && (
                        <div className="mb-2 relative w-fit">
                            <img src={URL.createObjectURL(selectedImage)} className="h-16 rounded-lg border border-white/20" />
                            <button
                                onClick={() => setSelectedImage(null)}
                                className="absolute -top-2 -right-2 bg-zinc-800 rounded-full p-1 text-white border border-white/20"
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    )}
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-700 overflow-hidden flex-shrink-0 border border-white/10">
                            <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-400">ME</div>
                        </div>
                        <div className="flex-1 bg-zinc-800 rounded-2xl px-3 py-1.5 flex items-center gap-2 border border-white/5">
                            <input
                                type="text"
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Add a comment..."
                                className="bg-transparent border-none outline-none text-white text-sm flex-1 placeholder-zinc-500"
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="text-zinc-400 hover:text-white transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            </button>
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={(e) => e.target.files && setSelectedImage(e.target.files[0])}
                            />
                        </div>
                        <button
                            onClick={handleSend}
                            disabled={!newComment.trim() && !selectedImage}
                            className={`p-2 rounded-full ${newComment.trim() || selectedImage ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-500'}`}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" /></svg>
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
