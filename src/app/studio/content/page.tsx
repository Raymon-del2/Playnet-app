'use client';

import { useState, useRef, useEffect } from 'react';
import { getActiveProfile } from '@/app/actions/profile';
import Link from 'next/link';
import { supabase, uploadVideoFile, uploadVideo } from '@/lib/supabase';

type UploadStep = 'idle' | 'details' | 'success';

export default function ChannelContent() {
    const [activeProfile, setActiveProfile] = useState<any>(null);
    const [activeTab, setActiveTab] = useState('Videos');
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    // Upload State
    const [uploadStep, setUploadStep] = useState<UploadStep>('idle');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [videoTitle, setVideoTitle] = useState('');
    const [videoDescription, setVideoDescription] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<'adults' | 'family' | 'kids' | 'advert' | 'general'>('general');
    const [isSaving, setIsSaving] = useState(false);

    // List State
    const [videos, setVideos] = useState<any[]>([]);
    const [isLoadingList, setIsLoadingList] = useState(true);

    const tabs = ['Videos', 'Styles', 'Live', 'Posts', 'Playlists', 'Podcasts', 'Promotions', 'Collaborations'];

    const filteredVideos = videos.filter(v => {
        if (activeTab === 'Videos') return !v.is_short && !v.is_live && !v.is_post;
        if (activeTab === 'Styles') return v.is_short;
        if (activeTab === 'Live') return v.is_live;
        if (activeTab === 'Posts') return v.is_post;
        return false; // Other tabs show no content for now
    });

    const fetchVideos = async (profileId: string) => {
        setIsLoadingList(true);
        try {
            const { data, error } = await supabase!
                .from('videos')
                .select('*')
                .eq('channel_id', profileId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setVideos(data || []);
        } catch (error) {
            console.error('Error fetching videos:', error);
        } finally {
            setIsLoadingList(false);
        }
    };

    useEffect(() => {
        const fetchProfileData = async () => {
            const profile = await getActiveProfile();
            setActiveProfile(profile);
            if (profile) {
                fetchVideos(profile.id);
            } else {
                setIsLoadingList(false);
            }
        };
        fetchProfileData();
    }, []);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setVideoTitle(file.name.replace(/\.[^/.]+$/, ""));
            setUploadStep('details');
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('video/')) {
            setSelectedFile(file);
            setVideoTitle(file.name.replace(/\.[^/.]+$/, ""));
            setUploadStep('details');
        }
    };

    const handleSave = async () => {
        if (!selectedFile || !activeProfile) return;

        setIsSaving(true);
        try {
            // 1. Upload to Storage
            const timestamp = Date.now();
            const filePath = `${activeProfile.id}/${timestamp}-${selectedFile.name}`;

            // Note: In a real app, you'd use the progress callback if available via supabase client
            setUploadProgress(40);
            const videoUrl = await uploadVideoFile(selectedFile, filePath);

            setUploadProgress(80);
            // 2. Save to Database
            await uploadVideo({
                title: videoTitle,
                description: videoDescription,
                video_url: videoUrl,
                thumbnail_url: 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?w=400&h=225&fit=crop', // Placeholder
                channel_id: activeProfile.id,
                channel_name: activeProfile.name,
                channel_avatar: activeProfile.avatar || '',
                duration: '0:00', // Should be calculated
                is_live: activeTab === 'Live',
                is_short: activeTab === 'Styles',
                is_post: activeTab === 'Posts',
                category: selectedCategory
            });

            setUploadProgress(100);
            setUploadStep('success');
            // Refresh list
            if (activeProfile) {
                fetchVideos(activeProfile.id);
            }
        } catch (error: any) {
            console.error('Upload failed:', error);
            alert(`Upload failed: ${error.message || 'Unknown error'}. Check that your 'videos' bucket and table exist in Supabase.`);
        } finally {
            setIsSaving(false);
        }
    };

    const resetModal = () => {
        setIsUploadModalOpen(false);
        setUploadStep('idle');
        setSelectedFile(null);
        setUploadProgress(0);
        setVideoTitle('');
        setVideoDescription('');
    };

    return (
        <div className="min-h-screen bg-[#0f0f0f] text-white">
            {/* Header / Search Area */}
            <div className="h-14 border-b border-white/10 flex items-center justify-between px-6 bg-[#0f0f0f] sticky top-0 z-20">
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search across your channel"
                        className="w-[400px] h-9 bg-[#121212] border border-white/10 rounded-full px-10 text-sm focus:border-white/30 outline-none transition-colors"
                    />
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
                <div className="flex items-center gap-4">
                    <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                        </svg>
                    </button>
                    <button className="p-2 hover:bg-white/10 rounded-full transition-colors relative">
                        <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                        </svg>
                    </button>
                    <button
                        onClick={() => {
                            if (activeTab !== 'Live') {
                                setIsUploadModalOpen(true);
                            }
                        }}
                        disabled={activeTab === 'Live'}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded text-sm font-medium transition-colors border border-white/10 ${activeTab === 'Live' ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-white/10 hover:bg-white/15 text-white'
                            }`}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        {activeTab === 'Live' ? 'Coming Soon' : activeTab === 'Styles' ? 'Upload Style' : activeTab === 'Posts' ? 'Create Post' : 'Create'}
                    </button>
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-700">
                        {activeProfile?.avatar ? (
                            <img src={activeProfile.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-sm font-bold">
                                {activeProfile?.name?.[0]?.toUpperCase() || 'U'}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="p-8">
                <h1 className="text-2xl font-bold mb-6">Channel content</h1>

                {/* Tabs */}
                <div className="flex items-center gap-8 border-b border-white/10 mb-4 overflow-x-auto no-scrollbar">
                    {tabs.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === tab ? 'text-white' : 'text-zinc-400 hover:text-white'
                                }`}
                        >
                            {tab}
                            {activeTab === tab && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />
                            )}
                        </button>
                    ))}
                </div>

                {/* Filters */}
                <div className="flex items-center gap-4 mb-6">
                    <button className="flex items-center gap-2 p-2 hover:bg-white/5 rounded text-zinc-400 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4.5h18m-18 5h18m-18 5h18m-18 5h18" />
                        </svg>
                        <span className="text-sm font-medium">Filter</span>
                    </button>
                </div>

                {/* Table Header */}
                <div className="grid grid-cols-[1fr_repeat(5,120px)] gap-4 px-4 py-2 border-b border-white/5 text-[12px] font-bold text-zinc-400 uppercase tracking-wider">
                    <div className="flex items-center gap-4">
                        <input type="checkbox" className="rounded border-zinc-600 bg-transparent" />
                        <span>Video</span>
                    </div>
                    <span>Visibility</span>
                    <span>Restrictions</span>
                    <span className="flex items-center gap-1">
                        Date
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5H7z" /></svg>
                    </span>
                    <span>Views</span>
                    <span>Comments</span>
                </div>

                {/* Content List / Empty State */}
                {isLoadingList ? (
                    <div className="flex flex-col items-center justify-center py-24">
                        <div className="w-10 h-10 border-4 border-white/10 border-t-white rounded-full animate-spin"></div>
                    </div>
                ) : filteredVideos.length > 0 ? (
                    <div className="space-y-0">
                        {filteredVideos.map((video) => (
                            <div key={video.id} className="grid grid-cols-[1fr_repeat(5,120px)] gap-4 px-4 py-4 border-b border-white/5 hover:bg-white/5 transition-colors group items-center">
                                <div className="flex items-center gap-4 min-w-0">
                                    <input type="checkbox" className="rounded border-zinc-600 bg-transparent flex-shrink-0" />
                                    <Link href={`/watch/${video.id}`} className="flex gap-4 items-center min-w-0 flex-1">
                                        <div className="w-32 aspect-video bg-zinc-800 rounded overflow-hidden flex-shrink-0 relative">
                                            <img src={video.thumbnail_url} className="w-full h-full object-cover" alt="" />
                                            <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="text-sm font-medium text-white truncate group-hover:text-blue-400 transition-colors uppercase tracking-tight">{video.title}</h3>
                                            <p className="text-[12px] text-zinc-500 line-clamp-1 mt-1">{video.description || 'Add description'}</p>
                                        </div>
                                    </Link>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-zinc-300">
                                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                    Public
                                </div>
                                <div className="text-sm text-zinc-400">None</div>
                                <div className="text-sm text-zinc-400">
                                    {new Date(video.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    <div className="text-[11px] text-zinc-500 uppercase tracking-tighter">Published</div>
                                </div>
                                <div className="text-sm text-zinc-400">{video.views || 0}</div>
                                <div className="text-sm text-zinc-400">0</div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-24">
                        <div className="relative w-48 h-48 mb-8 flex items-center justify-center">
                            <div className={`absolute inset-0 rounded-full blur-3xl ${activeTab === 'Live' ? 'bg-red-500/10' : 'bg-teal-500/10'}`} />
                            {/* Custom Cartoon Illustration for empty state */}
                            <div className={`relative z-10 w-40 h-40 rounded-2xl border-4 flex items-center justify-center overflow-hidden ${activeTab === 'Live' ? 'bg-red-400/20 border-red-400/30' : 'bg-teal-400/20 border-teal-400/30'
                                }`}>
                                <svg className={`w-24 h-24 ${activeTab === 'Live' ? 'text-red-400' : 'text-teal-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    {activeTab === 'Live' ? (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    ) : (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    )}
                                </svg>
                            </div>
                        </div>
                        <p className="text-zinc-500 text-sm mb-6">
                            {activeTab === 'Live' ? 'Live streaming is coming soon!' : `No ${activeTab.toLowerCase()} content available`}
                        </p>
                        <button
                            onClick={() => {
                                if (activeTab !== 'Live') {
                                    setIsUploadModalOpen(true);
                                }
                            }}
                            disabled={activeTab === 'Live'}
                            className={`px-6 py-2 rounded-full text-sm font-bold transition-colors ${activeTab === 'Live'
                                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                                : 'bg-white text-black hover:bg-zinc-200'
                                }`}
                        >
                            {activeTab === 'Live' ? 'Coming Soon' : activeTab === 'Styles' ? 'Upload Styles' : activeTab === 'Posts' ? 'Create Post' : 'Upload videos'}
                        </button>
                    </div>
                )}
            </div>

            {/* Upload Modal */}
            {isUploadModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
                    <div
                        className="absolute inset-0"
                        onClick={() => setIsUploadModalOpen(false)}
                    />

                    <div className="relative w-full max-w-[800px] aspect-[16/10] bg-[#282828] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                            <h2 className="text-[20px] font-bold text-white">Upload videos</h2>
                            <div className="flex items-center gap-2">
                                <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                    <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => setIsUploadModalOpen(false)}
                                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                                >
                                    <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 flex flex-col overflow-y-auto">
                            {uploadStep === 'idle' ? (
                                <div
                                    className={`flex-1 flex flex-col items-center justify-center p-8 transition-colors ${isDragging ? 'bg-white/5' : ''
                                        }`}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                >
                                    <div className="w-24 h-24 bg-[#1f1f1f] rounded-full flex items-center justify-center mb-6">
                                        <svg className="w-10 h-10 text-zinc-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                        </svg>
                                    </div>

                                    <h3 className="text-[15px] font-bold text-white mb-2">Drag and drop video files to upload</h3>
                                    <p className="text-[13px] text-zinc-400 mb-8">Your videos will be private until you publish them.</p>

                                    <label className="px-6 py-2 bg-white text-black rounded-full text-sm font-bold hover:bg-zinc-200 transition-colors cursor-pointer">
                                        Select files
                                        <input type="file" className="hidden" accept="video/*" onChange={handleFileSelect} />
                                    </label>

                                    <div className="mt-12 text-center">
                                        <p className="text-[11px] text-zinc-500 leading-relaxed max-w-[600px] mx-auto px-10">
                                            By submitting your videos to Playra, you acknowledge that you agree to Playra's <span className="text-blue-400 cursor-pointer hover:underline">Terms of Service</span> and <span className="text-blue-400 cursor-pointer hover:underline">Community Guidelines</span>.
                                            <br />
                                            Please be sure not to violate others' copyright or privacy rights. <span className="text-blue-400 cursor-pointer hover:underline">Learn more</span>
                                        </p>
                                    </div>
                                </div>
                            ) : uploadStep === 'details' ? (
                                <div className="p-8 flex flex-col lg:flex-row gap-8">
                                    {/* Left: Details Form */}
                                    <div className="flex-1 space-y-6">
                                        <h2 className="text-xl font-bold">Details</h2>

                                        <div className="space-y-4">
                                            <div className="relative group">
                                                <div className="absolute inset-0 border border-zinc-700 group-focus-within:border-blue-500 rounded p-2 pointer-events-none transition-colors" />
                                                <label className="block text-[12px] text-zinc-500 px-2 pt-1 group-focus-within:text-blue-500 transition-colors">Title (required)</label>
                                                <input
                                                    type="text"
                                                    value={videoTitle}
                                                    onChange={(e) => setVideoTitle(e.target.value)}
                                                    placeholder="Add a title that describes your video"
                                                    className="w-full bg-transparent p-2 text-sm outline-none placeholder-zinc-600"
                                                />
                                            </div>

                                            <div className="relative group">
                                                <div className="absolute inset-0 border border-zinc-700 group-focus-within:border-blue-500 rounded p-2 pointer-events-none transition-colors" />
                                                <label className="block text-[12px] text-zinc-500 px-2 pt-1 group-focus-within:text-blue-500 transition-colors">Description</label>
                                                <textarea
                                                    rows={6}
                                                    value={videoDescription}
                                                    onChange={(e) => setVideoDescription(e.target.value)}
                                                    placeholder="Tell viewers about your video"
                                                    className="w-full bg-transparent p-2 text-sm outline-none resize-none placeholder-zinc-600"
                                                />
                                                <div className="relative group">
                                                    <div className="absolute inset-0 border border-zinc-700 group-focus-within:border-blue-500 rounded p-2 pointer-events-none transition-colors" />
                                                    <label className="block text-[12px] text-zinc-500 px-2 pt-1 group-focus-within:text-blue-500 transition-colors">Category</label>
                                                    <select
                                                        value={selectedCategory}
                                                        onChange={(e) => setSelectedCategory(e.target.value as any)}
                                                        className="w-full bg-transparent p-2 text-sm outline-none placeholder-zinc-600 appearance-none"
                                                    >
                                                        <option value="general" className="bg-[#282828]">General</option>
                                                        <option value="family" className="bg-[#282828]">Family</option>
                                                        <option value="kids" className="bg-[#282828]">Kids</option>
                                                        <option value="adults" className="bg-[#282828]">Adults (18+)</option>
                                                    </select>
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                                        <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <h3 className="text-sm font-bold text-white">Thumbnail</h3>
                                            <p className="text-[12px] text-zinc-400">Select or upload a picture that shows what's in your video. A good thumbnail stands out and draws viewers' attention.</p>
                                            <div className="w-32 aspect-video bg-zinc-800 border-2 border-dashed border-zinc-700 rounded flex flex-col items-center justify-center cursor-pointer hover:border-zinc-500 transition-colors">
                                                <svg className="w-5 h-5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                <span className="text-[10px] text-zinc-500 mt-2">Upload thumbnail</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Preview & Progress */}
                                    <div className="w-full lg:w-[300px] space-y-4">
                                        <div className="bg-[#1a1a1a] rounded overflow-hidden aspect-video border border-white/5 relative">
                                            {selectedFile && (
                                                <video
                                                    src={URL.createObjectURL(selectedFile)}
                                                    className="w-full h-full object-contain"
                                                />
                                            )}
                                        </div>
                                        <div className="bg-[#1a1a1a] p-3 rounded space-y-2">
                                            <div className="flex justify-between items-center text-[12px]">
                                                <span className="text-zinc-400">Filename</span>
                                                <span className="text-white truncate max-w-[150px]">{selectedFile?.name}</span>
                                            </div>
                                            {isSaving && (
                                                <div className="space-y-1">
                                                    <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                                                        <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                                                    </div>
                                                    <p className="text-[10px] text-blue-400 text-center uppercase font-bold tracking-widest">Uploading {uploadProgress}%</p>
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            disabled={isSaving || !videoTitle}
                                            onClick={handleSave}
                                            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-full text-sm font-bold transition-all"
                                        >
                                            {isSaving ? 'Uploading...' : 'Publish'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                                    <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
                                        <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">Video published successfully!</h3>
                                    <p className="text-zinc-400 mb-8 max-w-[400px]">Your video is now live on Playra. You can manage it from your content dashboard.</p>
                                    <button
                                        onClick={resetModal}
                                        className="px-8 py-2 bg-white text-black rounded-full text-sm font-bold hover:bg-zinc-200 transition-colors"
                                    >
                                        Done
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
