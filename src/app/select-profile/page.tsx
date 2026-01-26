'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { getUserProfiles, createProfile, updateProfileAvatar, selectActiveProfile, checkProfileName } from '@/app/actions/profile';

export default function SelectProfilePage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [profiles, setProfiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);

    // Create Profile Form State
    const [newName, setNewName] = useState('');
    const [newAvatar, setNewAvatar] = useState<string | null>(null);
    const [newAccountType, setNewAccountType] = useState<'adult' | 'kids' | 'family'>('adult');
    const [creating, setCreating] = useState(false);

    // Name Checker State
    const [nameStatus, setNameStatus] = useState<{ available: boolean; loading: boolean; error: string | null; suggestions?: string[] }>({ available: false, loading: false, error: null });
    const checkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Edit Profile State
    const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const compressImage = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 800;
                    const MAX_HEIGHT = 800;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.7));
                };
                img.onerror = (err) => reject(err);
            };
            reader.onerror = (err) => reject(err);
        });
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const compressed = await compressImage(file);
                setNewAvatar(compressed);
            } catch (err) {
                console.error("Compression failed", err);
            }
        }
    };

    const handleEditFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && editingProfileId) {
            try {
                const compressed = await compressImage(file);
                await updateProfileAvatar(editingProfileId, compressed);
                if (user) {
                    const pros = await getUserProfiles(user.uid);
                    setProfiles(pros);
                }
                setEditingProfileId(null);
            } catch (err) {
                console.error("Compression/Upload failed", err);
            }
        }
    };

    const handleNameChange = (val: string) => {
        setNewName(val);
        if (checkTimerRef.current) clearTimeout(checkTimerRef.current);

        if (val.length < 2) {
            setNameStatus({ available: false, loading: false, error: null });
            return;
        }

        setNameStatus(prev => ({ ...prev, loading: true, error: null }));

        checkTimerRef.current = setTimeout(async () => {
            const res = await checkProfileName(val);
            setNameStatus({
                available: res.available,
                loading: false,
                error: res.error || null,
                suggestions: res.suggestions
            });
        }, 500);
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !newName || !newAvatar) return;

        if (!newName.startsWith('@')) {
            alert("Profile name must start with @");
            return;
        }

        if (!nameStatus.available) {
            alert(nameStatus.error || "Name is not available");
            return;
        }

        setCreating(true);
        const res = await createProfile(user.uid, newName, newAvatar, newAccountType);
        if (res.success) {
            const pros = await getUserProfiles(user.uid);
            setProfiles(pros);
            setShowCreate(false);
            setNewName('');
            setNewAvatar(null);
            setNameStatus({ available: false, loading: false, error: null });
        } else {
            alert(res.error);
        }
        setCreating(false);
    };

    const handleSelect = async (profileId: string) => {
        if (user) {
            await selectActiveProfile(profileId, user.uid);
            router.push('/');
        }
    };

    const handleEdit = (e: React.MouseEvent, profileId: string) => {
        e.stopPropagation();
        setEditingProfileId(profileId);
        setTimeout(() => {
            fileInputRef.current?.click();
        }, 0);
    };

    useEffect(() => {
        const safetyTimer = setTimeout(() => {
            if (loading) {
                console.warn("Profile fetching timed out");
                setLoading(false);
            }
        }, 10000);

        const unsubscribe = onAuthStateChanged(auth, async (u) => {
            if (u) {
                setUser(u);
                try {
                    const pros = await getUserProfiles(u.uid);
                    setProfiles(pros);
                } catch (e) {
                    console.error("Failed to load profiles", e);
                }
                setLoading(false);
            } else {
                router.push('/signin');
            }
        });
        return () => {
            unsubscribe();
            clearTimeout(safetyTimer);
        };
    }, [router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
                <div className="flex flex-col items-center gap-8 z-10">
                    <div className="flex gap-8">
                        {[1, 2].map(i => (
                            <div key={i} className="flex flex-col items-center gap-4">
                                <div className="w-32 h-32 rounded-full bg-zinc-900 border border-white/5 animate-pulse" />
                                <div className="w-24 h-4 bg-zinc-900 rounded animate-pulse" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />

            <div className="max-w-5xl w-full flex flex-col items-center animate-slide-in-up z-10">
                <h1 className="text-3xl font-black text-white mb-2 tracking-tight">Who is watching?</h1>
                <p className="text-zinc-500 font-bold mb-12 uppercase tracking-widest text-sm">You can have up to 4 profiles</p>

                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleEditFileChange} />

                <div className="flex flex-wrap justify-center gap-6 sm:gap-8 mb-12 sm:mb-16">
                    {profiles.map((profile) => (
                        <div key={profile.id} className="group relative flex flex-col items-center gap-4 cursor-pointer">
                            <div
                                className="w-28 h-28 sm:w-32 sm:h-32 rounded-full p-[3px] bg-gradient-to-tr from-transparent to-transparent group-hover:from-blue-500 group-hover:to-purple-500 transition-all duration-300 relative"
                                onClick={() => handleSelect(profile.id)}
                            >
                                <div className="w-full h-full rounded-full overflow-hidden border-4 border-zinc-800 group-hover:border-black transition-all relative">
                                    {profile.avatar ? (
                                        <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-3xl font-black text-zinc-600">
                                            {profile.name[0].toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <button
                                    className="absolute bottom-0 right-0 p-1.5 bg-zinc-800 rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-all hover:bg-white/10 hover:scale-110 z-10"
                                    title="Edit Profile Picture"
                                    onClick={(e) => handleEdit(e, profile.id)}
                                >
                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                </button>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-zinc-400 font-bold text-lg group-hover:text-white transition-colors capitalize">{profile.name}</span>
                                <span className={`text-[10px] font-black uppercase tracking-tighter mt-0.5 px-2 py-0.5 rounded ${profile.account_type === 'kids' ? 'text-green-400 bg-green-400/10' :
                                        profile.account_type === 'family' ? 'text-yellow-400 bg-yellow-400/10' :
                                            profile.account_type === 'adult' ? 'text-red-400 bg-red-400/10' :
                                                'text-blue-400 bg-blue-400/10'
                                    }`}>
                                    {profile.account_type || 'general'} Account
                                </span>
                            </div>
                        </div>
                    ))}

                    {profiles.length < 4 && (
                        <div className="group flex flex-col items-center gap-4 cursor-pointer" onClick={() => setShowCreate(true)}>
                            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center group-hover:bg-zinc-800 group-hover:scale-105 transition-all duration-300 shadow-xl">
                                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                                    <svg className="w-8 h-8 text-white/50 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" /></svg>
                                </div>
                            </div>
                            <span className="text-zinc-500 font-bold text-sm tracking-widest uppercase group-hover:text-zinc-300 transition-colors">Add Profile</span>
                        </div>
                    )}
                </div>

                {showCreate && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
                        <div className="bg-zinc-900 border border-white/10 p-8 rounded-[40px] max-w-sm w-full relative overflow-y-auto max-h-[90vh]">
                            <h2 className="text-2xl font-black text-white mb-6">Create Profile</h2>
                            <form onSubmit={handleCreate} className="space-y-6">
                                <div className="flex justify-center">
                                    <label className="relative cursor-pointer group">
                                        <div className="w-24 h-24 rounded-full bg-zinc-800 overflow-hidden border border-white/10 flex items-center justify-center">
                                            {newAvatar ? <img src={newAvatar} alt="Preview" className="w-full h-full object-cover" /> : <svg className="w-8 h-8 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                                        </div>
                                        <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} required />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 rounded-full transition-opacity">
                                            <span className="text-[10px] font-bold text-white uppercase">Upload</span>
                                        </div>
                                    </label>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1 flex justify-between">
                                        <span>Profile Handle</span>
                                        <span className={`text-[9px] ${nameStatus.error ? 'text-red-400' : 'text-blue-400'}`}>
                                            {nameStatus.loading ? 'Checking...' : nameStatus.error || 'Starting with @'}
                                        </span>
                                    </label>
                                    <input
                                        type="text"
                                        value={newName}
                                        onChange={(e) => handleNameChange(e.target.value)}
                                        placeholder="@username"
                                        className={`w-full h-12 bg-black border rounded-2xl px-4 text-white text-sm font-bold focus:border-white/30 transition-colors outline-none ${nameStatus.available ? 'border-green-500/50' :
                                                nameStatus.error ? 'border-red-500/50' : 'border-white/10'
                                            }`}
                                        required
                                    />

                                    {/* Handle Recommendations */}
                                    {nameStatus.suggestions && nameStatus.suggestions.length > 0 && (
                                        <div className="pt-2 flex flex-wrap gap-2">
                                            <p className="w-full text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Try these:</p>
                                            {nameStatus.suggestions.map(s => (
                                                <button
                                                    key={s}
                                                    type="button"
                                                    onClick={() => handleNameChange(s)}
                                                    className="px-2.5 py-1 bg-white/5 border border-white/5 rounded-lg text-[10px] font-bold text-zinc-400 hover:bg-white/10 hover:text-white transition-all"
                                                >
                                                    {s}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Subscription Type</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {(['adult', 'kids', 'family'] as const).map((type) => (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => setNewAccountType(type)}
                                                className={`py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${newAccountType === type ? 'bg-white text-black border-white' : 'bg-white/5 text-zinc-500 border-white/5 hover:border-white/20'}`}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => setShowCreate(false)} className="flex-1 h-12 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold text-sm transition-colors">Cancel</button>
                                    <button
                                        type="submit"
                                        disabled={creating || nameStatus.loading || (newName.length > 0 && !nameStatus.available)}
                                        className="flex-1 h-12 bg-white text-black hover:bg-zinc-200 rounded-2xl font-black text-sm transition-colors disabled:opacity-50"
                                    >
                                        {creating ? 'Creating...' : 'Create'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
