import { createClient } from '@supabase/supabase-js';

// Prioritize the new credentials specifically provided in the latest update
const supabaseUrl = 'https://dyhbrdijbxjrhfthknkw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5aGJyZGlqYnhqcmhmdGhrbmt3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNjM4MDYsImV4cCI6MjA4NDkzOTgwNn0.RSa6GmEkxO9Zf56JxSI7J9nG8upNY-9XrzAJu2QP5A8';

export const supabase = supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

function ensureSupabase() {
    if (!supabase) {
        throw new Error('Supabase is not configured. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your .env.local file.');
    }
    return supabase;
}

// Types for videos table
export interface Video {
    id: string;
    title: string;
    description: string;
    video_url: string;
    thumbnail_url: string;
    channel_id: string;
    channel_name: string;
    channel_avatar: string;
    views: number;
    duration: string;
    created_at: string;
    updated_at: string;
    is_live: boolean;
    is_short: boolean;
    is_post?: boolean;
    category?: 'adults' | 'family' | 'kids' | 'advert' | 'general';
}

// Video upload function
export async function uploadVideo(videoData: Omit<Video, 'id' | 'created_at' | 'updated_at' | 'views'>) {
    const { data, error } = await ensureSupabase()
        .from('videos')
        .insert([{
            ...videoData,
            is_post: videoData.is_post || false,
            category: videoData.category || 'general',
            views: 0,
        }])
        .select()
        .single();

    if (error) throw error;
    return data;
}

// Get all videos
export async function getVideos(limit = 20, offset = 0) {
    const { data, error } = await ensureSupabase()
        .from('videos')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (error) throw error;
    return data as Video[];
}

// Get only styles (shorts)
export async function getStyles(limit = 20, offset = 0) {
    const { data, error } = await ensureSupabase()
        .from('videos')
        .select('*')
        .eq('is_short', true)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (error) throw error;
    return data as Video[];
}

// Get video by ID
export async function getVideoById(id: string) {
    const { data, error } = await ensureSupabase()
        .from('videos')
        .select('*')
        .eq('id', id)
        .single();

    if (error) throw error;
    return data as Video;
}

// Increment views
export async function incrementViews(id: string) {
    const { error } = await ensureSupabase().rpc('increment_views', { video_id: id });
    if (error) throw error;
}

// Upload file to Supabase Storage
export async function uploadVideoFile(file: File, path: string) {
    const { data, error } = await ensureSupabase().storage
        .from('videos')
        .upload(path, file, {
            cacheControl: '3600',
            upsert: false
        });

    if (error) throw error;

    // Get public URL
    const { data: urlData } = ensureSupabase().storage
        .from('videos')
        .getPublicUrl(path);

    return urlData.publicUrl;
}

// Upload thumbnail to Supabase Storage
export async function uploadThumbnail(file: File, path: string) {
    const { data, error } = await ensureSupabase().storage
        .from('thumbnails')
        .upload(path, file, {
            cacheControl: '3600',
            upsert: false
        });

    if (error) throw error;

    // Get public URL
    const { data: urlData } = ensureSupabase().storage
        .from('thumbnails')
        .getPublicUrl(path);

    return urlData.publicUrl;
}
