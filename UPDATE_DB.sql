-- Run this in Supabase SQL Editor to fix the "new row violates row-level security policy" error.

-- This policy allows "anonymous" users to upload videos. 
-- This is necessary because you are handling authentication with Turso, so Supabase sees your users as "guests".

CREATE POLICY "Enable insert for everyone" 
ON videos FOR INSERT 
WITH CHECK (true);

-- If you haven't enabled viewing yet, run this too:
CREATE POLICY "Enable read access for everyone" 
ON videos FOR SELECT 
USING (true);
