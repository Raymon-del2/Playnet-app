-- Run this in Supabase SQL Editor to add support for Posts.

ALTER TABLE videos 
ADD COLUMN is_post boolean DEFAULT false;
