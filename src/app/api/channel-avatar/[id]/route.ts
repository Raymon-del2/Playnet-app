import { NextResponse } from 'next/server';
import { turso } from '@/lib/turso';
import { supabase } from '@/lib/supabase';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: channelId } = await params;
  if (!channelId) {
    return NextResponse.json({ error: 'channel_id required' }, { status: 400 });
  }

  try {
    const result = await turso.execute({
      sql: 'SELECT avatar FROM channels WHERE id = ?',
      args: [channelId],
    });
    const avatar = (result.rows[0]?.avatar as string | null) || null;

    // Sync into Supabase videos so subsequent fetches use the fresh avatar
    if (avatar && supabase) {
      await supabase
        .from('videos')
        .update({ channel_avatar: avatar })
        .eq('channel_id', channelId);
    }

    return NextResponse.json({ avatar });
  } catch (error) {
    console.error('Failed to fetch channel avatar', error);
    return NextResponse.json({ error: 'Failed to fetch avatar' }, { status: 500 });
  }
}
