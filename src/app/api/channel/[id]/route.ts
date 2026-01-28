import { NextResponse } from 'next/server';
import { turso } from '@/lib/turso';

async function ensureBannerColumn() {
  try {
    await turso.execute(`ALTER TABLE channels ADD COLUMN banner TEXT`);
  } catch (err: any) {
    // Ignore "duplicate column" errors
    if (!`${err?.message || ''}`.toLowerCase().includes('duplicate')) {
      console.warn('ensureBannerColumn failed', err);
    }
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: channelId } = await params;
  if (!channelId) {
    return NextResponse.json({ error: 'channel id required' }, { status: 400 });
  }

  try {
    await ensureBannerColumn();
    const result = await turso.execute({
      sql: 'SELECT id, name, description, avatar, banner, verified, account_type, created_at FROM channels WHERE id = ?',
      args: [channelId],
    });
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ channel: result.rows[0] });
  } catch (error) {
    console.error('Failed to fetch channel', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: channelId } = await params;
  if (!channelId) {
    return NextResponse.json({ error: 'channel id required' }, { status: 400 });
  }

  // Owner check via active profile cookie
  const cookie = req.headers.get('cookie') || '';
  const match = cookie.match(/playra_active_profile=([^;]+)/);
  const activeProfileId = match ? decodeURIComponent(match[1]) : null;
  if (!activeProfileId || activeProfileId !== channelId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const banner = body?.banner as string | null;
  if (!banner) {
    return NextResponse.json({ error: 'banner required' }, { status: 400 });
  }

  try {
    await ensureBannerColumn();
    await turso.execute({
      sql: 'UPDATE channels SET banner = ? WHERE id = ?',
      args: [banner, channelId],
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update channel banner', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
