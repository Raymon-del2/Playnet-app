'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { getActiveProfile } from '@/app/actions/profile';
import { uploadVideo, uploadThumbnail } from '@/lib/supabase';

type PostMode = 'text' | 'poll' | 'quiz' | 'image';

interface PollOption {
    id: string;
    text: string;
    imageUrl?: string;
}

interface QuizAnswer {
    id: string;
    text: string;
    isCorrect: boolean;
}

export default function CreatePostPage() {
    const router = useRouter();
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Auth state
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Post state
    const [mode, setMode] = useState<PostMode>('text');
    const [text, setText] = useState('');
    const [visibility, setVisibility] = useState<'public' | 'members'>('public');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Poll state
    const [pollOptions, setPollOptions] = useState<PollOption[]>([
        { id: '1', text: '' },
        { id: '2', text: '' },
    ]);
    const [pollType, setPollType] = useState<'text' | 'image'>('text');

    // Quiz state
    const [quizQuestion, setQuizQuestion] = useState('');
    const [quizAnswers, setQuizAnswers] = useState<QuizAnswer[]>([
        { id: '1', text: '', isCorrect: false },
        { id: '2', text: '', isCorrect: false },
    ]);

    // Image state
    const [images, setImages] = useState<string[]>([]);

    // Load auth
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (u) => {
            if (u) {
                setUser(u);
                const p = await getActiveProfile();
                if (p) {
                    setProfile(p);
                } else {
                    router.push('/select-profile');
                }
            } else {
                router.push('/signin');
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [router]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [text]);

    const handleModeChange = (newMode: PostMode) => {
        if (newMode !== mode) {
            // Warn about data loss
            if (mode === 'poll' && pollOptions.some(o => o.text.trim())) {
                if (!confirm('Switching modes will clear your poll. Continue?')) return;
            }
            if (mode === 'quiz' && (quizQuestion.trim() || quizAnswers.some(a => a.text.trim()))) {
                if (!confirm('Switching modes will clear your quiz. Continue?')) return;
            }
            if (mode === 'image' && images.length > 0) {
                if (!confirm('Switching modes will clear your images. Continue?')) return;
            }

            setMode(newMode);
            // Reset mode-specific state
            setPollOptions([{ id: '1', text: '' }, { id: '2', text: '' }]);
            setQuizQuestion('');
            setQuizAnswers([{ id: '1', text: '', isCorrect: false }, { id: '2', text: '', isCorrect: false }]);
            setImages([]);
        }
    };

    const handleAddPollOption = () => {
        if (pollOptions.length < 5) {
            setPollOptions([...pollOptions, { id: Date.now().toString(), text: '' }]);
        }
    };

    const handleRemovePollOption = (id: string) => {
        if (pollOptions.length > 2) {
            setPollOptions(pollOptions.filter(o => o.id !== id));
        }
    };

    const handleAddQuizAnswer = () => {
        if (quizAnswers.length < 4) {
            setQuizAnswers([...quizAnswers, { id: Date.now().toString(), text: '', isCorrect: false }]);
        }
    };

    const handleSetCorrectAnswer = (id: string) => {
        setQuizAnswers(quizAnswers.map(a => ({ ...a, isCorrect: a.id === id })));
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const newImages: string[] = [];
        for (let i = 0; i < Math.min(files.length, 5 - images.length); i++) {
            const file = files[i];
            const reader = new FileReader();
            await new Promise<void>((resolve) => {
                reader.onload = (ev) => {
                    newImages.push(ev.target?.result as string);
                    resolve();
                };
                reader.readAsDataURL(file);
            });
        }
        setImages([...images, ...newImages].slice(0, 5));
    };

    const handleRemoveImage = (index: number) => {
        setImages(images.filter((_, i) => i !== index));
    };

    const isPostValid = () => {
        if (mode === 'text') return text.trim().length > 0;
        if (mode === 'poll') return pollOptions.filter(o => o.text.trim()).length >= 2;
        if (mode === 'quiz') return quizQuestion.trim() && quizAnswers.filter(a => a.text.trim()).length >= 2 && quizAnswers.some(a => a.isCorrect);
        if (mode === 'image') return images.length > 0 || text.trim().length > 0;
        return false;
    };

    const handleSubmit = async () => {
        if (!isPostValid() || !profile) return;

        setIsSubmitting(true);
        try {
            // Create the post in Supabase as a "video" with is_post: true
            const postData = {
                title: text.substring(0, 100) || 'Community Post',
                description: JSON.stringify({
                    mode,
                    text,
                    pollOptions: mode === 'poll' ? pollOptions : undefined,
                    quizQuestion: mode === 'quiz' ? quizQuestion : undefined,
                    quizAnswers: mode === 'quiz' ? quizAnswers : undefined,
                    images: mode === 'image' ? images : undefined,
                }),
                video_url: '',
                thumbnail_url: images[0] || profile.avatar || '',
                channel_id: profile.id,
                channel_name: profile.name,
                channel_avatar: profile.avatar || '',
                is_live: false,
                is_short: false,
                is_post: true,
                duration: '',
                category: 'general' as const,
            };

            await uploadVideo(postData);
            router.push('/');
        } catch (error) {
            console.error('Failed to create post:', error);
            alert('Failed to create post. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-white"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl border-b border-white/5">
                <div className="flex items-center justify-between h-14 px-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    <div className="flex items-center gap-3">
                        {/* Visibility dropdown */}
                        <select
                            value={visibility}
                            onChange={(e) => setVisibility(e.target.value as 'public' | 'members')}
                            className="bg-zinc-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-white/10 outline-none"
                        >
                            <option value="public">Public</option>
                            <option value="members">Members</option>
                        </select>

                        {/* Post button */}
                        <button
                            onClick={handleSubmit}
                            disabled={!isPostValid() || isSubmitting}
                            className={`px-5 py-2 rounded-full font-bold text-sm transition-all ${isPostValid() && !isSubmitting
                                    ? 'bg-blue-600 text-white hover:bg-blue-500 active:scale-95'
                                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                                }`}
                        >
                            {isSubmitting ? 'Posting...' : 'Post'}
                        </button>
                    </div>
                </div>
            </header>

            {/* Profile indicator */}
            <div className="px-4 py-3 flex items-center gap-3 border-b border-white/5">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-800">
                    {profile?.avatar && <img src={profile.avatar} alt="" className="w-full h-full object-cover" />}
                </div>
                <div>
                    <div className="text-white font-bold text-sm">{profile?.name}</div>
                    <div className="text-zinc-500 text-xs">Posting to your community</div>
                </div>
            </div>

            {/* Main content area */}
            <div className="flex-1 p-4 overflow-y-auto pb-32">
                {/* Text area - always visible */}
                <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="What's on your mind?"
                    className="w-full bg-transparent text-white text-lg font-medium placeholder:text-zinc-600 outline-none resize-none min-h-[120px]"
                    autoFocus
                />

                {/* Mode-specific content */}
                {mode === 'poll' && (
                    <div className="mt-6 space-y-3">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Poll Options</span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPollType('text')}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${pollType === 'text' ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-400'}`}
                                >
                                    Text
                                </button>
                                <button
                                    onClick={() => setPollType('image')}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${pollType === 'image' ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-400'}`}
                                >
                                    Image
                                </button>
                            </div>
                        </div>
                        {pollOptions.map((option, index) => (
                            <div key={option.id} className="flex items-center gap-3">
                                <div className="flex-1 bg-zinc-900 border border-white/10 rounded-2xl px-4 py-3">
                                    <input
                                        type="text"
                                        value={option.text}
                                        onChange={(e) => setPollOptions(pollOptions.map(o => o.id === option.id ? { ...o, text: e.target.value } : o))}
                                        placeholder={`Option ${index + 1}`}
                                        className="w-full bg-transparent text-white outline-none text-sm"
                                    />
                                </div>
                                {pollOptions.length > 2 && (
                                    <button
                                        onClick={() => handleRemovePollOption(option.id)}
                                        className="p-2 text-zinc-500 hover:text-red-400 transition-colors"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        ))}
                        {pollOptions.length < 5 && (
                            <button
                                onClick={handleAddPollOption}
                                className="w-full py-3 border-2 border-dashed border-zinc-700 rounded-2xl text-zinc-500 font-bold text-sm hover:border-zinc-500 hover:text-zinc-400 transition-colors"
                            >
                                + Add option
                            </button>
                        )}
                    </div>
                )}

                {mode === 'quiz' && (
                    <div className="mt-6 space-y-4">
                        <div>
                            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Quiz Question</span>
                            <div className="bg-zinc-900 border border-white/10 rounded-2xl px-4 py-3">
                                <input
                                    type="text"
                                    value={quizQuestion}
                                    onChange={(e) => setQuizQuestion(e.target.value)}
                                    placeholder="Enter your question..."
                                    className="w-full bg-transparent text-white outline-none"
                                />
                            </div>
                        </div>
                        <div className="space-y-3">
                            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Answers (tap to mark correct)</span>
                            {quizAnswers.map((answer, index) => (
                                <div
                                    key={answer.id}
                                    className={`flex items-center gap-3 bg-zinc-900 border rounded-2xl px-4 py-3 cursor-pointer transition-colors ${answer.isCorrect ? 'border-green-500 bg-green-500/10' : 'border-white/10'}`}
                                    onClick={() => handleSetCorrectAnswer(answer.id)}
                                >
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${answer.isCorrect ? 'border-green-500 bg-green-500' : 'border-zinc-600'}`}>
                                        {answer.isCorrect && (
                                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        )}
                                    </div>
                                    <input
                                        type="text"
                                        value={answer.text}
                                        onChange={(e) => {
                                            e.stopPropagation();
                                            setQuizAnswers(quizAnswers.map(a => a.id === answer.id ? { ...a, text: e.target.value } : a));
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        placeholder={`Answer ${index + 1}`}
                                        className="flex-1 bg-transparent text-white outline-none text-sm"
                                    />
                                </div>
                            ))}
                            {quizAnswers.length < 4 && (
                                <button
                                    onClick={handleAddQuizAnswer}
                                    className="w-full py-3 border-2 border-dashed border-zinc-700 rounded-2xl text-zinc-500 font-bold text-sm hover:border-zinc-500 hover:text-zinc-400 transition-colors"
                                >
                                    + Add answer
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {mode === 'image' && images.length > 0 && (
                    <div className="mt-6 grid grid-cols-2 gap-2">
                        {images.map((img, index) => (
                            <div key={index} className="relative aspect-square rounded-2xl overflow-hidden bg-zinc-900">
                                <img src={img} alt="" className="w-full h-full object-cover" />
                                <button
                                    onClick={() => handleRemoveImage(index)}
                                    className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full hover:bg-black/80 transition-colors"
                                >
                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                        {images.length < 5 && (
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="aspect-square rounded-2xl border-2 border-dashed border-zinc-700 flex items-center justify-center text-zinc-500 hover:border-zinc-500 hover:text-zinc-400 transition-colors"
                            >
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Attachment toolbar */}
            <div className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-white/10 px-4 py-3 safe-area-pb">
                <div className="flex items-center justify-around">
                    <button
                        onClick={() => handleModeChange('quiz')}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${mode === 'quiz' ? 'text-purple-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-[10px] font-bold">Quiz</span>
                    </button>

                    <button
                        onClick={() => handleModeChange('poll')}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${mode === 'poll' ? 'text-yellow-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                        </svg>
                        <span className="text-[10px] font-bold">Poll</span>
                    </button>

                    <button
                        onClick={() => {
                            handleModeChange('image');
                            fileInputRef.current?.click();
                        }}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${mode === 'image' ? 'text-green-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                        </svg>
                        <span className="text-[10px] font-bold">Image</span>
                    </button>

                    <button
                        onClick={() => handleModeChange('text')}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${mode === 'text' ? 'text-blue-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                        </svg>
                        <span className="text-[10px] font-bold">Text</span>
                    </button>
                </div>
            </div>

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageUpload}
            />
        </div>
    );
}
