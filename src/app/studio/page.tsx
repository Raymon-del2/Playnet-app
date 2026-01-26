'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getActiveProfile } from '@/app/actions/profile';

export default function StudioDashboard() {
  const [activeProfile, setActiveProfile] = useState<any>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const profile = await getActiveProfile();
      setActiveProfile(profile);
    };
    fetchProfile();
  }, []);

  const stats = [
    { label: 'Current subscribers', value: '0', change: '', icon: 'users' },
    { label: 'Views (last 28 days)', value: '0', change: '', icon: 'eye' },
    { label: 'Watch time (hours)', value: '0', change: '', icon: 'clock' },
  ];

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <div className="h-14 border-b border-white/10 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
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
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
            </svg>
          </button>
          <button className="p-2 hover:bg-white/10 rounded-full transition-colors relative">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
          </button>
          <Link href="/studio/content" className="flex items-center gap-2 px-4 py-1.5 bg-white/10 hover:bg-white/15 rounded text-sm font-medium transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Create
          </Link>
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

      {/* Content */}
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-8">Channel dashboard</h1>

        <div className="grid grid-cols-3 gap-6 mb-8">
          {stats.map((stat, i) => (
            <div key={i} className="bg-[#1a1a1a] rounded-xl p-6 border border-white/5">
              <p className="text-sm text-zinc-400 mb-2">{stat.label}</p>
              <p className="text-3xl font-bold">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-[#1a1a1a] rounded-xl p-6 border border-white/5">
          <h2 className="text-lg font-bold mb-4">Latest video performance</h2>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <svg className="w-24 h-24 text-zinc-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <p className="text-zinc-400 mb-4">Upload and publish a video to get started</p>
            <Link href="/studio/content" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium transition-colors">
              Upload videos
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
