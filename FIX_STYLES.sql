-- Run this to update your videos to likely correct types if they are messed up
-- Set all existing videos to 'is_short' if they are missing the flag or if you want to force them.

-- This marks all current videos as shorts (Since you said "I uploaded two shorts").
-- Run this if you don't see them in the styles feed.
UPDATE videos SET is_short = true;
