'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCameraRecorder, RecordingSpeed, TimerDuration } from '@/hooks/useCameraRecorder';
import { useStyleEditor, AudioLayer, TextLayer } from '@/hooks/useStyleEditor';
import { uploadVideo, uploadVideoFile, uploadThumbnail } from '@/lib/supabase';
import { getActiveProfile } from '@/app/actions/profile';

type EditorMode = 'camera' | 'editor' | 'details';

export default function CreateStylePage() {
    const router = useRouter();
    const [mode, setMode] = useState<EditorMode>('camera');
    const [showSpeedMenu, setShowSpeedMenu] = useState(false);
    const [showTimerMenu, setShowTimerMenu] = useState(false);
    const [showEffectsMenu, setShowEffectsMenu] = useState(false);
    const [finalizedBlob, setFinalizedBlob] = useState<Blob | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [selectedEffect, setSelectedEffect] = useState<string | null>(null);

    // --- Editor State ---
    const [activeTool, setActiveTool] = useState<'none' | 'text' | 'audio'>('none');
    const [inputText, setInputText] = useState('');
    const [isRecordingVoiceover, setIsRecordingVoiceover] = useState(false);
    const voiceoverRecorderRef = useRef<MediaRecorder | null>(null);
    const voiceoverChunksRef = useRef<Blob[]>([]);

    // --- Draggable Text State ---
    const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);
    const previewContainerRef = useRef<HTMLDivElement>(null);
    const isDraggingRef = useRef(false);

    // --- Thumbnail State ---
    const [customThumbnail, setCustomThumbnail] = useState<File | null>(null);
    const [customThumbnailUrl, setCustomThumbnailUrl] = useState<string | null>(null);
    const thumbnailInputRef = useRef<HTMLInputElement>(null);
    const [isPublishingSuccess, setIsPublishingSuccess] = useState(false);

    const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setCustomThumbnail(file);
            const url = URL.createObjectURL(file);
            setCustomThumbnailUrl(url);
        }
    };

    const handleTextDragStart = (e: React.PointerEvent, id: string) => {
        e.stopPropagation();
        e.preventDefault();
        setDraggedLayerId(id);
        isDraggingRef.current = false;
    };

    const handlePreviewPointerMove = (e: React.PointerEvent) => {
        if (draggedLayerId && previewContainerRef.current) {
            e.preventDefault();
            isDraggingRef.current = true;
            const rect = previewContainerRef.current.getBoundingClientRect();
            // Clamp values between 0 and 100 to keep inside
            const x = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
            const y = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100));
            updateTextLayer(draggedLayerId, { x, y });
        }
    };

    const handlePreviewPointerUp = (e: React.PointerEvent) => {
        if (draggedLayerId) {
            e.preventDefault();
            setDraggedLayerId(null);
        }
    };

    // --- Upload State ---
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [activeProfile, setActiveProfile] = useState<any>(null);

    useEffect(() => {
        getActiveProfile().then(setActiveProfile);
    }, []);

    const {
        videoRef,
        stream,
        isRecording,
        segments,
        undoStack,
        currentSegmentProgress,
        totalProgress,
        error,
        facingMode,
        speed,
        timerDuration,
        timerCountdown,
        isInitialized,
        showAlignmentOverlay,
        lastFrameUrl,
        initCamera,
        flipCamera,
        setSpeed,
        setTimerDuration,
        startRecording,
        stopRecording,
        cancelTimer,
        undoLastSegment,
        redoSegment,
        discardRecording,
        finalizeRecording,
        toggleAlignmentOverlay,
    } = useCameraRecorder({
        maxDuration: 60,
        onRecordingComplete: (segments) => {
            console.log('Recording complete, segments:', segments.length);
        },
    });

    // Calculate total duration from segments to fix timeline issues with stitched blobs
    const totalDuration = segments.reduce((acc, s) => acc + s.duration, 0);

    const {
        audioLayers,
        textLayers,
        currentTime,
        duration,
        isPlaying,
        setVideoRef: setEditorVideoRef,
        addAudioLayer,
        removeAudioLayer,
        addTextLayer,
        updateTextLayer,
        removeTextLayer,
        togglePlay,
        seek,
        handleTimeUpdate,
        handleLoadedMetadata,
        handleEnded,
    } = useStyleEditor({ segments, initialDuration: totalDuration });

    // Initialize camera on mount
    useEffect(() => {
        initCamera('user');
    }, []);

    // Cleanup preview URL on unmount or new blob
    useEffect(() => {
        if (finalizedBlob) {
            const url = URL.createObjectURL(finalizedBlob);
            setPreviewUrl(url);
            return () => URL.revokeObjectURL(url);
        } else {
            setPreviewUrl(null);
        }
    }, [finalizedBlob]);

    const handleDone = async () => {
        if (segments.length > 0) {
            const blob = await finalizeRecording();
            if (blob) {
                setFinalizedBlob(blob);
                setMode('editor');
            }
        }
    };

    const handleDiscard = () => {
        discardRecording();
        setFinalizedBlob(null);
        setMode('camera');
        setActiveTool('none');
    };

    const handleNext = () => {
        setMode('details');
        // Pause playback
        if (isPlaying) togglePlay();
    };

    const handlePublish = async () => {
        if (!finalizedBlob || !activeProfile || !title.trim()) return;

        try {
            setIsUploading(true);

            // 1. Upload Video
            const videoFileName = `${activeProfile.id}/${Date.now()}_style.webm`;
            const videoFile = new File([finalizedBlob], 'style.webm', { type: 'video/webm' });
            const videoUrl = await uploadVideoFile(videoFile, videoFileName);

            // 2. Upload Thumbnail
            let thumbnailUrl = activeProfile.avatar || '';

            if (customThumbnail) {
                const thumbFileName = `${activeProfile.id}/${Date.now()}_custom_thumb.jpg`;
                const thumbData = await uploadThumbnail(customThumbnail, thumbFileName);
                thumbnailUrl = thumbData;
            } else if (lastFrameUrl) {
                // Convert data URL to blob
                const res = await fetch(lastFrameUrl);
                const blob = await res.blob();
                const thumbFileName = `${activeProfile.id}/${Date.now()}_thumb.jpg`;
                const thumbFile = new File([blob], 'thumb.jpg', { type: 'image/jpeg' });
                const thumbData = await uploadThumbnail(thumbFile, thumbFileName);
                thumbnailUrl = thumbData;
            }

            // 3. Create DB Record
            const metadata = {
                textLayers,
                audioLayers: [], // Voiceovers not uploaded for MVP
                selectedEffect,
            };

            await uploadVideo({
                title: title.substring(0, 100),
                description: JSON.stringify(metadata),
                video_url: videoUrl,
                thumbnail_url: thumbnailUrl,
                channel_id: activeProfile.id,
                channel_name: activeProfile.name,
                channel_avatar: activeProfile.avatar || '',
                duration: Math.round(duration).toString(),
                is_live: false,
                is_short: true,
                is_post: false,
                category: 'general',
            });

            // Redirect to Studio Content
            // router.push('/studio/content?type=short');
            setIsPublishingSuccess(true);
            setTimeout(() => {
                router.push('/studio/content?type=short');
            }, 2500);

        } catch (err) {
            console.error('Failed to upload style:', err);
            alert('Failed to upload. Please try again.');
            setIsUploading(false);
        }
    };

    const speedOptions: RecordingSpeed[] = [0.3, 0.5, 1, 2, 3];
    const timerOptions: TimerDuration[] = [0, 3, 10, 20];
    const effectOptions = [
        { id: 'none', label: 'None', icon: '✕' },
        { id: 'pop-art', label: 'Pop Art', icon: '🎨' },
        { id: 'cinematic', label: 'Cinematic', icon: '🎬' },
        { id: 'origami', label: 'Origami', icon: '📄' },
        { id: 'neon', label: 'Neon', icon: '💜' },
        { id: 'vintage', label: 'Vintage', icon: '📷' },
    ];

    const getEffectFilter = () => {
        switch (selectedEffect) {
            case 'pop-art': return 'saturate(2) contrast(1.4) hue-rotate(20deg)';
            case 'cinematic': return 'contrast(1.1) saturate(0.9) sepia(0.1)';
            case 'origami': return 'saturate(0.5) brightness(1.1)';
            case 'neon': return 'saturate(1.5) brightness(1.2) hue-rotate(-10deg)';
            case 'vintage': return 'sepia(0.4) contrast(1.1) brightness(0.95)';
            default: return 'none';
        }
    };

    // --- Editor Functions ---

    const startVoiceover = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            voiceoverChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) voiceoverChunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(voiceoverChunksRef.current, { type: 'audio/webm' });
                addAudioLayer(blob, currentTime);
                stream.getTracks().forEach(track => track.stop());
            };

            voiceoverRecorderRef.current = mediaRecorder;
            mediaRecorder.start();
            setIsRecordingVoiceover(true);

            // Resume playback if paused so user can record over the video
            if (!isPlaying) togglePlay();

        } catch (err) {
            console.error('Failed to start voiceover', err);
            alert('Could not access microphone! Please allow microphone access to record voiceovers.');
        }
    };

    const stopVoiceover = () => {
        if (voiceoverRecorderRef.current && voiceoverRecorderRef.current.state !== 'inactive') {
            voiceoverRecorderRef.current.stop();
            setIsRecordingVoiceover(false);
            // Pause playback after recording (optional ux choice, but good for review)
            if (isPlaying) togglePlay();
        }
    };

    const handleAddText = () => {
        if (inputText.trim()) {
            addTextLayer(inputText, currentTime);
            setInputText('');
            setActiveTool('none');
        }
    };

    // --- Render Modes ---

    if (mode === 'details') {
        return (
            <div className="fixed inset-0 bg-black flex flex-col z-50">
                {isPublishingSuccess && (
                    <div className="absolute inset-0 z-[60] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
                        <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(34,197,94,0.3)] animate-in zoom-in duration-500">
                            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-2">Thanks for uploading!</h2>
                        <p className="text-zinc-400 text-lg">Your video will be out in a sec...</p>
                    </div>
                )}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <button onClick={() => setMode('editor')} className="p-2 -ml-2">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div className="text-white font-bold">Details</div>
                    <div className="w-10" />
                </div>

                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                    {/* Style Card Preview */}
                    <div className="mx-auto relative w-full max-w-[200px] aspect-[9/16] rounded-2xl overflow-hidden shadow-2xl group cursor-pointer" onClick={() => thumbnailInputRef.current?.click()}>
                        {(customThumbnailUrl || previewUrl) ? (
                            <img
                                src={customThumbnailUrl || previewUrl || ''}
                                className="w-full h-full object-cover"
                                style={{ filter: !customThumbnailUrl ? getEffectFilter() : 'none' }}
                            />
                        ) : (
                            <div className="w-full h-full bg-zinc-800 animate-pulse" />
                        )}

                        {/* Card Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

                        {/* Content Info */}
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-6 h-6 rounded-full bg-zinc-700 overflow-hidden">
                                    {activeProfile?.avatar && <img src={activeProfile.avatar} className="w-full h-full object-cover" />}
                                </div>
                                <span className="text-xs font-bold text-white truncate">{activeProfile?.name || 'You'}</span>
                            </div>
                            <h3 className="text-white font-bold text-sm leading-tight line-clamp-2">{title || 'Your Style Title'}</h3>
                        </div>

                        {/* Upload Overlay */}
                        <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${customThumbnailUrl ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}>
                            <div className="bg-black/60 backdrop-blur-md rounded-full px-4 py-2 text-xs font-bold text-white flex items-center gap-2 border border-white/20">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                Click to Upload Thumbnail
                            </div>
                        </div>

                        <input
                            ref={thumbnailInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleThumbnailSelect}
                            hidden
                        />
                    </div>

                    {/* Fields */}
                    <div className="flex-1 space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Caption</label>
                            <textarea
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Describe your style... #shorts"
                                className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3 text-white placeholder:text-zinc-600 outline-none resize-none h-32"
                            />
                        </div>

                        <div className="bg-zinc-900/50 rounded-xl p-4 border border-white/5">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-zinc-400">Visibility</span>
                                <span className="text-white font-bold">Public</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-auto p-6 border-t border-white/10 shrink-0">
                    <button
                        onClick={handlePublish}
                        disabled={isUploading || !title.trim()}
                        className={`w-full py-4 rounded-full font-bold text-lg flex items-center justify-center gap-2 ${isUploading || !title.trim() ? 'bg-zinc-800 text-zinc-500' : 'bg-blue-600 text-white hover:bg-blue-500'
                            }`}
                    >
                        {isUploading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Uploading...</span>
                            </>
                        ) : (
                            'Post Style'
                        )}
                    </button>
                </div>
            </div>
        );
    }

    if (mode === 'editor') {
        return (
            <div className="fixed inset-0 bg-black flex flex-col z-50">
                {/* Editor Header */}
                <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
                    <button
                        onClick={() => setMode('camera')}
                        className="p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div className="text-white font-bold">Review</div>
                    <button
                        onClick={handleNext}
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-500 rounded-full text-white font-bold text-sm transition-colors"
                    >
                        Next
                    </button>
                </div>

                {/* Video Preview Area */}
                <div
                    ref={previewContainerRef}
                    className="flex-1 flex items-center justify-center relative bg-black touch-none" // touch-none for better dragging
                    onClick={(e) => {
                        // Only toggle play if we didn't just finish a drag
                        if (!isDraggingRef.current) togglePlay();
                    }}
                    onPointerDown={() => { isDraggingRef.current = false; }}
                    onPointerMove={handlePreviewPointerMove}
                    onPointerUp={handlePreviewPointerUp}
                    onPointerLeave={handlePreviewPointerUp}
                >
                    {previewUrl ? (
                        <>
                            <video
                                ref={setEditorVideoRef}
                                // src managed by useStyleEditor hook for multi-segment playback
                                className="max-h-full max-w-full object-contain"
                                style={{ filter: getEffectFilter() }}
                                playsInline
                                onTimeUpdate={handleTimeUpdate}
                                onLoadedMetadata={handleLoadedMetadata}
                                onEnded={handleEnded}
                            />

                            {/* Text Overlays */}
                            {textLayers.map(layer => {
                                // Simple visibility check based on time
                                if (currentTime >= layer.startTime && currentTime <= layer.endTime) {
                                    return (
                                        <div
                                            key={layer.id}
                                            className="absolute text-white font-bold text-2xl shadow-black drop-shadow-md select-none"
                                            // Draggable logic
                                            onPointerDown={(e) => handleTextDragStart(e, layer.id)}
                                            onClick={(e) => e.stopPropagation()} // Prevent play toggle
                                            style={{
                                                left: `${layer.x}%`,
                                                top: `${layer.y}%`,
                                                transform: `translate(-50%, -50%) scale(${layer.scale})`,
                                                color: layer.color,
                                                cursor: 'move',
                                                touchAction: 'none', // Critical for pointer events on touch devices
                                            }}
                                        >
                                            {layer.text}
                                        </div>
                                    );
                                }
                                return null;
                            })}

                            {!isPlaying && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="w-16 h-16 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-sm">
                                        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M8 5v14l11-7z" />
                                        </svg>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-white">Processing video...</div>
                    )}
                </div>

                {/* Editor UI - Overlay Tools */}
                {activeTool === 'text' && (
                    <div className="absolute inset-0 z-30 bg-black/80 flex flex-col items-center justify-center p-4">
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="Type something..."
                            className="bg-transparent text-white text-3xl font-bold text-center outline-none border-b-2 border-white/20 pb-2 w-full max-w-xs mb-8"
                            autoFocus
                        />
                        <div className="flex gap-4">
                            <button
                                onClick={() => setActiveTool('none')}
                                className="px-6 py-2 rounded-full bg-white/10 text-white font-bold"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddText}
                                className="px-6 py-2 rounded-full bg-blue-600 text-white font-bold"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                )}

                {/* Editor Toolbar & Timeline */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/90 to-transparent pt-8 pb-safe">
                    {/* Timeline Scrubber */}
                    <div className="px-4 mb-6">
                        <div
                            className="relative h-8 bg-white/10 rounded-lg overflow-hidden cursor-pointer"
                            onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const pos = (e.clientX - rect.left) / rect.width;
                                seek(pos * duration);
                            }}
                        >
                            {/* Audio Tracks Visuals */}
                            {audioLayers.map(layer => (
                                <div
                                    key={layer.id}
                                    className="absolute top-1 bottom-1 bg-blue-500/50 rounded-sm"
                                    style={{
                                        left: `${(layer.startTime / duration) * 100}%`,
                                        width: `${(layer.duration / duration) * 100}%`
                                    }}
                                />
                            ))}

                            {/* Text Tracks Visuals */}
                            {textLayers.map(layer => (
                                <div
                                    key={layer.id}
                                    className="absolute top-0 h-1 bg-yellow-500 rounded-sm"
                                    style={{
                                        left: `${(layer.startTime / duration) * 100}%`,
                                        width: `${((layer.endTime - layer.startTime) / duration) * 100}%`
                                    }}
                                />
                            ))}

                            {/* Playhead */}
                            <div
                                className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                                style={{ left: `${(currentTime / duration) * 100}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-[10px] text-white/50 mt-1">
                            <span>{Math.floor(currentTime)}s</span>
                            <span>{Math.floor(duration)}s</span>
                        </div>
                    </div>

                    {/* Toolbar Actions */}
                    <div className="flex items-center justify-around px-4 pb-4">
                        <button
                            onClick={() => setActiveTool(activeTool === 'audio' ? 'none' : 'audio')}
                            className={`flex flex-col items-center gap-1 transition-colors ${activeTool === 'audio' ? 'text-blue-400' : 'text-white/70 hover:text-white'}`}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                            <span className="text-[10px] font-bold">Voiceover</span>
                        </button>

                        <button
                            onClick={() => setActiveTool('text')}
                            className="flex flex-col items-center gap-1 text-white/70 hover:text-white transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" />
                            </svg>
                            <span className="text-[10px] font-bold">Text</span>
                        </button>

                        <button className="flex flex-col items-center gap-1 text-white/70 hover:text-white transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                            </svg>
                            <span className="text-[10px] font-bold">Volume</span>
                        </button>
                    </div>

                    {/* Voiceover Recorder UI */}
                    {activeTool === 'audio' && (
                        <div className="absolute bottom-24 left-0 right-0 flex justify-center animate-in slide-in-from-bottom-10 fade-in duration-200">
                            <div className="bg-zinc-900/90 backdrop-blur-xl rounded-full px-6 py-3 flex items-center gap-4 border border-white/10 shadow-2xl">
                                <span className="text-white text-sm font-bold">Hold to record</span>
                                <button
                                    onMouseDown={startVoiceover}
                                    onMouseUp={stopVoiceover}
                                    onMouseLeave={stopVoiceover}
                                    onTouchStart={startVoiceover}
                                    onTouchEnd={stopVoiceover}
                                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isRecordingVoiceover ? 'bg-red-500 scale-110' : 'bg-red-500/80 hover:bg-red-500'}`}
                                >
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Camera mode
    return (
        <div className="fixed inset-0 bg-black flex flex-col overflow-hidden">
            {/* Multi-Segment Progress Bar */}
            <div className="absolute top-0 left-0 right-0 z-30 h-2 bg-black/20 flex gap-[2px] px-1 pt-1">
                {/* Existing segments */}
                {segments.map((seg) => (
                    <div
                        key={seg.id}
                        className="h-full bg-red-500 rounded-sm relative"
                        style={{ width: `${(seg.duration / 60) * 100}%` }}
                    >
                    </div>
                ))}

                {/* Current recording segment */}
                {isRecording && (
                    <div
                        className="h-full bg-red-500 rounded-sm animate-pulse"
                        style={{ width: `${(currentSegmentProgress * (60 - segments.reduce((acc, s) => acc + s.duration, 0)) / 60) / 100 * 100}%`, minWidth: '4px' }}
                    />
                )}
            </div>

            {/* Timer Countdown Overlay */}
            {timerCountdown !== null && (
                <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60">
                    <div className="text-9xl font-black text-white animate-pulse">
                        {timerCountdown}
                    </div>
                    <button
                        onClick={cancelTimer}
                        className="absolute bottom-20 px-6 py-3 bg-white/20 rounded-full text-white font-bold"
                    >
                        Cancel
                    </button>
                </div>
            )}

            {/* Top Controls */}
            <div className="absolute top-4 left-0 right-0 z-20 flex items-center justify-between px-4 bg-gradient-to-b from-black/40 to-transparent pt-4">
                <button
                    onClick={() => router.back()}
                    className="p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="flex items-center gap-3">
                    {/* Add Music - Feature placeholder */}
                    <button className="px-4 py-1.5 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors flex items-center gap-2">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" /></svg>
                        <span className="text-sm font-bold">Add Sound</span>
                    </button>

                    {/* Flip Camera */}
                    <button
                        onClick={flipCamera}
                        className="p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Side Controls */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-3">
                {/* Speed */}
                <div className="relative">
                    <button
                        onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                        className="w-12 h-12 rounded-full bg-black/40 border border-white/20 text-white hover:bg-black/60 transition-colors flex items-center justify-center"
                    >
                        <div className="flex flex-col items-center">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            <span className="text-[8px] font-bold">{speed}x</span>
                        </div>
                    </button>
                    {showSpeedMenu && (
                        <div className="absolute right-full mr-2 top-0 bg-zinc-900 rounded-2xl p-2 flex flex-col gap-1 shadow-xl border border-white/10">
                            {speedOptions.map((s) => (
                                <button
                                    key={s}
                                    onClick={() => { setSpeed(s); setShowSpeedMenu(false); }}
                                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${speed === s ? 'bg-white text-black' : 'text-white hover:bg-white/10'}`}
                                >
                                    {s}x
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Timer */}
                <div className="relative">
                    <button
                        onClick={() => setShowTimerMenu(!showTimerMenu)}
                        className="w-12 h-12 rounded-full bg-black/40 border border-white/20 text-white hover:bg-black/60 transition-colors flex items-center justify-center"
                    >
                        <div className="flex flex-col items-center">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-[8px] font-bold">{timerDuration > 0 ? `${timerDuration}s` : 'Off'}</span>
                        </div>
                    </button>
                    {showTimerMenu && (
                        <div className="absolute right-full mr-2 top-0 bg-zinc-900 rounded-2xl p-2 flex flex-col gap-1 shadow-xl border border-white/10">
                            {timerOptions.map((t) => (
                                <button
                                    key={t}
                                    onClick={() => { setTimerDuration(t); setShowTimerMenu(false); }}
                                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${timerDuration === t ? 'bg-white text-black' : 'text-white hover:bg-white/10'}`}
                                >
                                    {t === 0 ? 'Off' : `${t}s`}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Effects */}
                <button
                    onClick={() => setShowEffectsMenu(!showEffectsMenu)}
                    className="w-12 h-12 rounded-full bg-black/40 border border-white/20 text-white hover:bg-black/60 transition-colors flex items-center justify-center"
                >
                    <div className="flex flex-col items-center">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                        <span className="text-[8px] font-bold">FX</span>
                    </div>
                </button>

                {/* Green Screen - Placeholder */}
                <button className="w-12 h-12 rounded-full bg-black/40 border border-white/20 text-white/50 transition-colors flex items-center justify-center cursor-not-allowed">
                    <div className="flex flex-col items-center">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-[8px] font-bold">BG</span>
                    </div>
                </button>

                {/* Alignment / Ghost Tool */}
                {lastFrameUrl && (
                    <button
                        onClick={toggleAlignmentOverlay}
                        className={`w-12 h-12 rounded-full border border-white/20 transition-colors flex items-center justify-center ${showAlignmentOverlay ? 'bg-white text-black' : 'bg-black/40 text-white'}`}
                    >
                        <div className="flex flex-col items-center">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                            </svg>
                            <span className="text-[8px] font-bold">Align</span>
                        </div>
                    </button>
                )}
            </div>

            {/* Camera Preview */}
            <div className="flex-1 flex items-center justify-center relative">
                {error ? (
                    <div className="text-center p-8">
                        <div className="text-red-400 text-lg font-bold mb-4">{error}</div>
                        <button
                            onClick={() => initCamera()}
                            className="px-6 py-3 bg-white/10 rounded-full text-white font-bold hover:bg-white/20 transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                ) : (
                    <>
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="h-full w-full object-cover"
                            style={{
                                transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                                filter: getEffectFilter(),
                            }}
                        />
                        {/* Ghost Overlay */}
                        {showAlignmentOverlay && lastFrameUrl && (
                            <img
                                src={lastFrameUrl}
                                className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none"
                                style={{
                                    transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                                }}
                            />
                        )}
                    </>
                )}
            </div>

            {/* Effects Tray */}
            {showEffectsMenu && (
                <div className="absolute bottom-32 left-0 right-0 z-30 px-4">
                    <div className="bg-zinc-900/95 backdrop-blur-xl rounded-3xl p-4 border border-white/10">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-white font-bold">Effects</span>
                            <button
                                onClick={() => setShowEffectsMenu(false)}
                                className="text-white/60 hover:text-white"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="flex gap-3 overflow-x-auto pb-2">
                            {effectOptions.map((effect) => (
                                <button
                                    key={effect.id}
                                    onClick={() => setSelectedEffect(effect.id === 'none' ? null : effect.id)}
                                    className={`flex flex-col items-center gap-2 p-3 rounded-2xl min-w-[70px] transition-all ${(effect.id === 'none' && !selectedEffect) || selectedEffect === effect.id
                                        ? 'bg-white text-black'
                                        : 'bg-white/10 text-white hover:bg-white/20'
                                        }`}
                                >
                                    <span className="text-2xl">{effect.icon}</span>
                                    <span className="text-[10px] font-bold">{effect.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Controls */}
            <div className="absolute bottom-0 left-0 right-0 z-20 p-6 bg-gradient-to-t from-black/60 to-transparent">
                <div className="flex items-center justify-between px-8 pb-safe">
                    {/* Gallery / Drafts */}
                    {!isRecording && segments.length === 0 && (
                        <button className="w-12 h-12 rounded-xl bg-zinc-800 border-2 border-white/20 overflow-hidden">
                            <div className="w-full h-full bg-zinc-700" />
                        </button>
                    )}

                    {/* Undo Button */}
                    {!isRecording && segments.length > 0 && (
                        <button
                            onClick={undoLastSegment}
                            className="w-12 h-12 flex items-center justify-center text-white"
                        >
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                            </svg>
                        </button>
                    )}

                    {/* Record Button */}
                    <div className="flex-1 flex justify-center">
                        <button
                            onClick={isRecording ? stopRecording : startRecording}
                            disabled={!isInitialized && !error}
                            className={`rounded-full border-4 border-white flex items-center justify-center transition-all active:scale-95 ${isRecording ? 'w-20 h-20 bg-transparent' : 'w-20 h-20 bg-transparent'
                                }`}
                        >
                            <div className={`transition-all ${isRecording
                                ? 'w-8 h-8 rounded-md bg-red-500'
                                : 'w-16 h-16 rounded-full bg-red-500'
                                }`} />
                        </button>
                    </div>

                    {/* Redo or Done */}
                    {!isRecording && segments.length > 0 ? (
                        <button
                            onClick={handleDone}
                            className="w-12 h-12 flex items-center justify-center bg-white rounded-full text-black"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        </button>
                    ) : (
                        undoStack.length > 0 && !isRecording && (
                            <button
                                onClick={redoSegment}
                                className="w-12 h-12 flex items-center justify-center text-white"
                            >
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
                                </svg>
                            </button>
                        )
                    )}

                    {/* Keep layout balanced if nothing on right */}
                    {!isRecording && segments.length === 0 && undoStack.length === 0 && (
                        <div className="w-12" />
                    )}
                </div>
            </div>
        </div>
    );
}
