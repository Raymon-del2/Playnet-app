'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { getUserProfiles, createProfile, updateProfileAvatar, selectActiveProfile, checkProfileName, deleteProfile, getProfileVideoCount } from '@/app/actions/profile';

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

    // Deletion State
    const [profileToDelete, setProfileToDelete] = useState<any | null>(null);
    const [videoCount, setVideoCount] = useState(0);
    const [deleting, setDeleting] = useState(false);

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

    const handleDeleteClick = async (e: React.MouseEvent, profile: any) => {
        e.stopPropagation();
        setProfileToDelete(profile);
        setVideoCount(0); // Reset
        const count = await getProfileVideoCount(profile.id);
        setVideoCount(count);
    };

    const confirmDelete = async () => {
        if (!profileToDelete || !user) return;
        setDeleting(true);
        const res = await deleteProfile(profileToDelete.id, user.uid);
        if (res.success) {
            const pros = await getUserProfiles(user.uid);
            setProfiles(pros);
            setProfileToDelete(null);
        } else {
            alert(res.error);
        }
        setDeleting(false);
    };

    const handleSelect = async (profileId: string) => {
        if (user) {
            await selectActiveProfile(profileId, user.uid);
            window.location.href = '/'; // Full reload to pick up cookie
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
            <div className="min-h-screen bg-black flex items-center justify-center p-4">
                <div className="flex flex-col items-center gap-8">
                    <div className="flex gap-8">
                        {[1, 2].map(i => (
                            <div key={i} className="flex flex-col items-center gap-4">
                                <div className="w-32 h-32 rounded-full bg-zinc-900 animate-pulse" />
                                <div className="w-24 h-4 bg-zinc-900 rounded animate-pulse" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 sm:p-12 relative overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/5 blur-[120px] rounded-full" />

            <div className="w-full max-w-6xl mx-auto flex flex-col items-center relative z-10">
                <h1 className="text-4xl sm:text-5xl font-black text-white mb-4 tracking-tight text-center">Who is watching?</h1>
                <p className="text-zinc-500 font-bold mb-16 uppercase tracking-[0.2em] text-xs sm:text-sm text-center opacity-60">Select your identity</p>

                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleEditFileChange} />

                <div className="flex flex-wrap items-start justify-center gap-10 sm:gap-14 w-full">
                    {profiles.map((profile) => (
                        <div key={profile.id} className="group flex flex-col items-center gap-5 cursor-pointer max-w-[140px]">
                            <div
                                className="w- 28 h-28 sm:w-36 sm:h-36 rounded-full p-[4px] bg-gradient-to-tr from-transparent to-transparent group-hover:from-blue-500 group-hover:to-purple-500 transition-all duration-500 relative"
                            >
                                <div
                                    className="w-full h-full rounded-full overflow-hidden border-4 border-zinc-900 group-hover:border-black transition-all relative ring-1 ring-white/5"
                                    onClick={() => handleSelect(profile.id)}
                                >
                                    {profile.avatar ? (
                                        <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover scale-105 group-hover:scale-110 transition-transform duration-500" />
                                    ) : (
                                        <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-4xl font-black text-zinc-700 uppercase">
                                            {profile.name[0]}
                                        </div>
                                    )}
                                </div>

                                {/* Edit/Delete Controls Overlay - Show on hover */}
                                <div className="absolute top-0 right-0 flex gap-1 -translate-y-2 translate-x-2 opacity-0 group-hover:opacity-100 transition-all z-20">
                                    <button
                                        title="Edit Avatar"
                                        className="p-2 bg-zinc-800 rounded-full border border-white/10 hover:bg-zinc-700 hover:scale-110 shadow-2xl transition-all"
                                        onClick={(e) => handleEdit(e, profile.id)}
                                    >
                                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                    </button>
                                    <button
                                        title="Delete Profile"
                                        className="p-2 bg-red-600/90 rounded-full border border-red-500/20 hover:bg-red-500 hover:scale-110 shadow-2xl transition-all"
                                        onClick={(e) => handleDeleteClick(e, profile)}
                                    >
                                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                            </div>
                            <div className="flex flex-col items-center text-center w-full">
                                <span className="text-zinc-400 font-bold text-lg sm:text-xl group-hover:text-white transition-colors capitalize truncate w-full">{profile.name}</span>
                                <span className={`text-[10px] font-black uppercase tracking-tighter mt-1.5 px-2.5 py-1 rounded-md ${profile.account_type === 'kids' ? 'text-green-400 bg-green-400/10' :
                                    profile.account_type === 'family' ? 'text-yellow-400 bg-yellow-400/10' :
                                        profile.account_type === 'adult' ? 'text-red-400 bg-red-400/10' :
                                            'text-blue-400 bg-blue-400/10'
                                    }`}>
                                    {profile.account_type || 'general'}
                                </span>
                            </div>
                        </div>
                    ))}

                    {profiles.length < 4 && (
                        <div className="group flex flex-col items-center gap-5 cursor-pointer" onClick={() => setShowCreate(true)}>
                            <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-zinc-900/50 border-2 border-dashed border-zinc-700/50 flex items-center justify-center group-hover:border-white/20 group-hover:bg-zinc-800/80 transition-all duration-300">
                                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <svg className="w-8 h-8 text-zinc-500 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4.5v15m7.5-7.5h-15" /></svg>
                                </div>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-zinc-500 font-bold text-sm sm:text-base tracking-widest uppercase group-hover:text-zinc-300 transition-colors">Add Profile</span>
                                <div className="h-5" />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Modal */}
            {showCreate && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
                    <div className="bg-zinc-950 border border-white/5 p-8 sm:p-10 rounded-[48px] max-w-sm w-full shadow-[0_0_100px_rgba(0,0,0,1)] relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-purple-600"></div>
                        <h2 className="text-3xl font-black text-white mb-8">New Identity</h2>
                        <form onSubmit={handleCreate} className="space-y-8">
                            <div className="flex justify-center">
                                <label className="relative cursor-pointer group">
                                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-zinc-900 border border-white/5 flex items-center justify-center overflow-hidden shadow-2xl">
                                        {newAvatar ? <img src={newAvatar} alt="Preview" className="w-full h-full object-cover" /> : <svg className="w-10 h-10 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                                    </div>
                                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} required />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 rounded-full flex items-center justify-center transition-all">
                                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Update</span>
                                    </div>
                                </label>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-end px-1">
                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Handle Name</label>
                                    <span className={`text-[9px] font-bold ${nameStatus.error ? 'text-red-500' : 'text-blue-500'}`}>
                                        {nameStatus.loading ? 'Verifying...' : nameStatus.error || 'Identity available'}
                                    </span>
                                </div>
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => handleNameChange(e.target.value)}
                                    placeholder="@username"
                                    className={`w-full h-14 bg-white/5 border rounded-2xl px-5 text-white font-bold outline-none transition-all ${nameStatus.available ? 'border-green-500/30 bg-green-500/5' :
                                        nameStatus.error ? 'border-red-500/30 bg-red-500/5' : 'border-white/5'
                                        }`}
                                    required
                                />

                                {nameStatus.suggestions && nameStatus.suggestions.length > 0 && (
                                    <div className="pt-1.5 flex flex-wrap gap-2 px-1">
                                        {nameStatus.suggestions.map(s => (
                                            <button
                                                key={s}
                                                type="button"
                                                onClick={() => handleNameChange(s)}
                                                className="px-3 py-1.5 bg-white/5 rounded-lg text-[10px] font-black text-zinc-400 hover:bg-white/10 hover:text-white transition-all uppercase tracking-tighter"
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Access Level</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['kids', 'family', 'adult'] as const).map((type) => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => setNewAccountType(type)}
                                            className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all tracking-widest border ${newAccountType === type ? 'bg-white text-black border-white shadow-lg' : 'bg-white/5 text-zinc-600 border-transparent hover:border-white/10'}`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 h-14 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-colors">Back</button>
                                <button
                                    type="submit"
                                    disabled={creating || nameStatus.loading || (newName.length > 0 && !nameStatus.available)}
                                    className="flex-1 h-14 bg-white text-black hover:bg-zinc-200 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl disabled:opacity-30 disabled:scale-100 active:scale-95"
                                >
                                    {creating ? 'Syncing...' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {profileToDelete && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[200] flex items-center justify-center p-4">
                    <div className="bg-zinc-950 border border-white/5 p-8 sm:p-10 rounded-[48px] max-w-sm w-full text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-red-600"></div>
                        <div className="w-20 h-20 bg-red-600/10 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        </div>
                        <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter">Wait a moment!</h2>
                        <p className="text-zinc-400 text-sm font-bold mb-8">
                            Are you sure you wish to delete <span className="text-white">{profileToDelete.name}</span>?
                            {videoCount > 0 ? (
                                <span className="block mt-4 text-red-400 p-4 bg-red-500/5 rounded-2xl border border-red-500/10">
                                    This profile has <span className="font-black underline">{videoCount} uploaded videos</span>. Correcting this: if you delete, your uploads will be permanently removed. Please rethink this!
                                </span>
                            ) : (
                                " This action cannot be undone."
                            )}
                        </p>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setProfileToDelete(null)}
                                className="flex-1 h-14 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-colors"
                            >
                                Rethink
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={deleting}
                                className="flex-1 h-14 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl disabled:opacity-50 active:scale-95"
                            >
                                {deleting ? 'Removing...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
