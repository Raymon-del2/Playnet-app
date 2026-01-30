'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export type RecordingSpeed = 0.3 | 0.5 | 1 | 2 | 3;
export type TimerDuration = 0 | 3 | 10 | 20;

// A single recorded clip/segment
export interface RecordingSegment {
    id: string;
    blob: Blob;
    duration: number; // in seconds
    startTime: number; // relative to total timeline
    lastFrame?: string; // data URL of last frame for alignment
}

interface UseCameraRecorderOptions {
    maxDuration?: number; // in seconds, default 60
    onRecordingComplete?: (segments: RecordingSegment[]) => void;
}

interface CameraRecorderState {
    stream: MediaStream | null;
    isRecording: boolean;
    segments: RecordingSegment[];
    undoStack: RecordingSegment[]; // for redo functionality
    currentSegmentProgress: number; // 0-100 for current segment being recorded
    totalProgress: number; // 0-100 total used time
    error: string | null;
    facingMode: 'user' | 'environment';
    speed: RecordingSpeed;
    timerDuration: TimerDuration;
    timerCountdown: number | null;
    isInitialized: boolean;
    showAlignmentOverlay: boolean;
    lastFrameUrl: string | null;
}

export function useCameraRecorder(options: UseCameraRecorderOptions = {}) {
    const { maxDuration = 60, onRecordingComplete } = options;

    const [state, setState] = useState<CameraRecorderState>({
        stream: null,
        isRecording: false,
        segments: [],
        undoStack: [],
        currentSegmentProgress: 0,
        totalProgress: 0,
        error: null,
        facingMode: 'user',
        speed: 1,
        timerDuration: 0,
        timerCountdown: null,
        isInitialized: false,
        showAlignmentOverlay: false,
        lastFrameUrl: null,
    });

    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const segmentStartTimeRef = useRef<number>(0);
    const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Calculate total used duration from segments
    const getTotalUsedDuration = useCallback(() => {
        return state.segments.reduce((acc, seg) => acc + seg.duration, 0);
    }, [state.segments]);

    // Calculate remaining duration
    const getRemainingDuration = useCallback(() => {
        return Math.max(0, maxDuration - getTotalUsedDuration());
    }, [getTotalUsedDuration, maxDuration]);

    // Capture last frame from video for alignment overlay
    const captureLastFrame = useCallback(() => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth || 1080;
            canvas.height = video.videoHeight || 1920;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                return canvas.toDataURL('image/jpeg', 0.8);
            }
        }
        return null;
    }, []);

    // Initialize camera
    const initCamera = useCallback(async (facingMode: 'user' | 'environment' = 'user') => {
        try {
            if (state.stream) {
                state.stream.getTracks().forEach(track => track.stop());
            }

            const constraints: MediaStreamConstraints = {
                video: {
                    facingMode,
                    width: { ideal: 1080 },
                    height: { ideal: 1920 },
                    aspectRatio: { ideal: 9 / 16 },
                },
                audio: true,
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }

            setState(prev => ({
                ...prev,
                stream,
                facingMode,
                error: null,
                isInitialized: true,
            }));

            return stream;
        } catch (err: any) {
            const errorMessage = err.name === 'NotAllowedError'
                ? 'Camera permission denied. Please allow camera access.'
                : err.name === 'NotFoundError'
                    ? 'No camera found on this device.'
                    : 'Failed to access camera. Please try again.';

            setState(prev => ({
                ...prev,
                error: errorMessage,
                isInitialized: false,
            }));
            return null;
        }
    }, [state.stream]);

    // Flip camera
    const flipCamera = useCallback(async () => {
        const newFacingMode = state.facingMode === 'user' ? 'environment' : 'user';
        await initCamera(newFacingMode);
    }, [state.facingMode, initCamera]);

    // Set recording speed
    const setSpeed = useCallback((speed: RecordingSpeed) => {
        setState(prev => ({ ...prev, speed }));
    }, []);

    // Set timer duration
    const setTimerDuration = useCallback((duration: TimerDuration) => {
        setState(prev => ({ ...prev, timerDuration: duration }));
    }, []);

    // Toggle alignment overlay
    const toggleAlignmentOverlay = useCallback(() => {
        setState(prev => ({ ...prev, showAlignmentOverlay: !prev.showAlignmentOverlay }));
    }, []);

    // Start recording a new segment with optional timer
    const startRecording = useCallback(async () => {
        if (!state.stream) {
            setState(prev => ({ ...prev, error: 'Camera not initialized' }));
            return;
        }

        const remaining = getRemainingDuration();
        if (remaining <= 0) {
            setState(prev => ({ ...prev, error: 'Maximum duration reached' }));
            return;
        }

        // If timer is set, start countdown
        if (state.timerDuration > 0) {
            setState(prev => ({ ...prev, timerCountdown: state.timerDuration }));

            return new Promise<void>((resolve) => {
                let countdown = state.timerDuration;
                timerIntervalRef.current = setInterval(() => {
                    countdown--;
                    setState(prev => ({ ...prev, timerCountdown: countdown }));

                    if (countdown <= 0) {
                        if (timerIntervalRef.current) {
                            clearInterval(timerIntervalRef.current);
                        }
                        setState(prev => ({ ...prev, timerCountdown: null }));
                        beginActualRecording();
                        resolve();
                    }
                }, 1000);
            });
        } else {
            beginActualRecording();
        }
    }, [state.stream, state.timerDuration, getRemainingDuration]);

    const beginActualRecording = useCallback(() => {
        if (!state.stream) return;

        // Hide alignment overlay when starting new recording
        setState(prev => ({ ...prev, showAlignmentOverlay: false }));

        chunksRef.current = [];

        const options: MediaRecorderOptions = {
            mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
                ? 'video/webm;codecs=vp9'
                : 'video/webm',
        };

        const mediaRecorder = new MediaRecorder(state.stream, options);

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                chunksRef.current.push(e.data);
            }
        };

        mediaRecorder.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: 'video/webm' });
            const duration = (Date.now() - segmentStartTimeRef.current) / 1000;
            const lastFrame = captureLastFrame();

            const newSegment: RecordingSegment = {
                id: Date.now().toString(),
                blob,
                duration,
                startTime: getTotalUsedDuration(),
                lastFrame: lastFrame || undefined,
            };

            setState(prev => ({
                ...prev,
                isRecording: false,
                segments: [...prev.segments, newSegment],
                undoStack: [], // Clear redo stack when new segment added
                currentSegmentProgress: 0,
                totalProgress: ((getTotalUsedDuration() + duration) / maxDuration) * 100,
                lastFrameUrl: lastFrame,
                showAlignmentOverlay: true, // Show alignment after stopping
            }));
        };

        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.start(100);
        segmentStartTimeRef.current = Date.now();

        setState(prev => ({
            ...prev,
            isRecording: true,
            currentSegmentProgress: 0,
        }));

        // Progress tracking
        const usedBefore = getTotalUsedDuration();
        progressIntervalRef.current = setInterval(() => {
            const elapsed = (Date.now() - segmentStartTimeRef.current) / 1000;
            const adjustedRemaining = (maxDuration - usedBefore) / state.speed;
            const segmentProgress = Math.min((elapsed / adjustedRemaining) * 100, 100);
            const totalProgress = ((usedBefore + elapsed * state.speed) / maxDuration) * 100;

            setState(prev => ({
                ...prev,
                currentSegmentProgress: segmentProgress,
                totalProgress: Math.min(totalProgress, 100),
            }));

            if (elapsed * state.speed >= maxDuration - usedBefore) {
                stopRecording();
            }
        }, 50);
    }, [state.stream, state.speed, maxDuration, getTotalUsedDuration, captureLastFrame]);

    // Stop recording current segment
    const stopRecording = useCallback(() => {
        if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
        }
        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
        }
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
    }, []);

    // Cancel timer
    const cancelTimer = useCallback(() => {
        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
        }
        setState(prev => ({ ...prev, timerCountdown: null }));
    }, []);

    // Undo - remove last segment
    const undoLastSegment = useCallback(() => {
        setState(prev => {
            if (prev.segments.length === 0) return prev;

            const lastSegment = prev.segments[prev.segments.length - 1];
            const newSegments = prev.segments.slice(0, -1);
            const newTotalProgress = newSegments.reduce((acc, seg) => acc + seg.duration, 0) / maxDuration * 100;

            // Get last frame from the now-last segment (if any)
            const newLastFrame = newSegments.length > 0
                ? newSegments[newSegments.length - 1].lastFrame || null
                : null;

            return {
                ...prev,
                segments: newSegments,
                undoStack: [...prev.undoStack, lastSegment],
                totalProgress: newTotalProgress,
                lastFrameUrl: newLastFrame,
            };
        });
    }, [maxDuration]);

    // Redo - restore last undone segment
    const redoSegment = useCallback(() => {
        setState(prev => {
            if (prev.undoStack.length === 0) return prev;

            const restoredSegment = prev.undoStack[prev.undoStack.length - 1];
            const newSegments = [...prev.segments, restoredSegment];
            const newTotalProgress = newSegments.reduce((acc, seg) => acc + seg.duration, 0) / maxDuration * 100;

            return {
                ...prev,
                segments: newSegments,
                undoStack: prev.undoStack.slice(0, -1),
                totalProgress: newTotalProgress,
                lastFrameUrl: restoredSegment.lastFrame || null,
            };
        });
    }, [maxDuration]);

    // Discard all segments
    const discardRecording = useCallback(() => {
        setState(prev => ({
            ...prev,
            segments: [],
            undoStack: [],
            totalProgress: 0,
            currentSegmentProgress: 0,
            lastFrameUrl: null,
            showAlignmentOverlay: false,
        }));
    }, []);

    // Finalize recording - merge all segments
    const finalizeRecording = useCallback(async () => {
        if (state.segments.length === 0) return null;

        // Combine all segment blobs
        const allBlobs = state.segments.map(s => s.blob);
        const mergedBlob = new Blob(allBlobs, { type: 'video/webm' });

        onRecordingComplete?.(state.segments);

        return mergedBlob;
    }, [state.segments, onRecordingComplete]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (state.stream) {
                state.stream.getTracks().forEach(track => track.stop());
            }
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
            }
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
            }
        };
    }, []);

    return {
        ...state,
        videoRef,
        canvasRef,
        maxDuration,
        remainingDuration: getRemainingDuration(),
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
    };
}
