'use server';

import { turso } from "@/lib/turso";
import { initDatabase } from "@/lib/db-setup";

export async function syncUserToDb(userData: {
    id: string;
    email: string;
    username?: string;
    account_type?: string;
}) {
    try {
        // Ensure tables exist (one-time check essentially)
        await initDatabase();

        const { id, email, username, account_type = 'adult' } = userData;

        // Use an UPSERT pattern to create or update user
        await turso.execute({
            sql: `
                INSERT INTO users (id, email, username, account_type)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    email = excluded.email,
                    username = COALESCE(excluded.username, users.username),
                    account_type = COALESCE(excluded.account_type, users.account_type)
            `,
            args: [id, email, username || null, account_type]
        });

        // Also create a default channel for the user if they don't have one
        const channelId = `ch_${id}`;
        const channelName = username || email.split('@')[0];

        await turso.execute({
            sql: `
                INSERT OR REPLACE INTO channels (id, user_id, name)
                VALUES (?, ?, ?)
            `,
            args: [channelId, id, channelName]
        });

        return { success: true };
    } catch (error) {
        console.error("Error syncing user to Turso:", error);
        return { success: false, error: "Database synchronization failed" };
    }
}

export async function updateUserProfile(userId: string, data: {
    username: string;
    bio?: string;
}) {
    try {
        const { username, bio } = data;

        // Update user in Turso
        await turso.execute({
            sql: `
                UPDATE users 
                SET username = ?
                WHERE id = ?
            `,
            args: [username, userId]
        });

        // Update channel name in Turso
        await turso.execute({
            sql: `
                UPDATE channels
                SET name = ?, description = ?
                WHERE user_id = ?
            `,
            args: [username, bio || null, userId]
        });

        return { success: true };
    } catch (error) {
        console.error("Error updating profile in Turso:", error);
        return { success: false, error: "Profile synchronization failed" };
    }
}
