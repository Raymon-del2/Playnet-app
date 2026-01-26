import { turso } from "./turso";

export async function initDatabase() {
    try {
        console.log("Initializing Turso tables...");

        // Users Table
        await turso.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                username TEXT UNIQUE,
                account_type TEXT DEFAULT 'adult', -- adult | family | kid | advertiser
                parent_id TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (parent_id) REFERENCES users(id)
            );
        `);

        // Channels Table
        await turso.execute(`
            CREATE TABLE IF NOT EXISTS channels (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                avatar TEXT, -- Base64 storage
                verified BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );
        `);

        // Videos Table
        await turso.execute(`
            CREATE TABLE IF NOT EXISTS videos (
                id TEXT PRIMARY KEY,
                channel_id TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                visibility TEXT DEFAULT 'public', -- public | unlisted | private
                age_rating TEXT DEFAULT 'all', -- all | 13+ | 18+
                video_url TEXT NOT NULL,
                thumbnail_url TEXT,
                duration TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (channel_id) REFERENCES channels(id)
            );
        `);

        // Donations Table
        await turso.execute(`
            CREATE TABLE IF NOT EXISTS donations (
                id TEXT PRIMARY KEY,
                from_user_id TEXT,
                to_channel_id TEXT NOT NULL,
                amount REAL NOT NULL,
                currency TEXT DEFAULT 'USD',
                payment_provider TEXT DEFAULT 'paystack',
                status TEXT DEFAULT 'pending', -- pending | completed | failed
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (from_user_id) REFERENCES users(id),
                FOREIGN KEY (to_channel_id) REFERENCES channels(id)
            );
        `);

        // Platform Fees Table
        await turso.execute(`
            CREATE TABLE IF NOT EXISTS platform_fees (
                id TEXT PRIMARY KEY,
                donation_id TEXT NOT NULL,
                percentage REAL NOT NULL,
                amount REAL NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (donation_id) REFERENCES donations(id)
            );
        `);

        // Video Views Table
        // Video Views Table
        await turso.execute(`
            CREATE TABLE IF NOT EXISTS video_views (
                id TEXT PRIMARY KEY,
                video_id TEXT NOT NULL,
                user_id TEXT,
                watched_seconds INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (video_id) REFERENCES videos(id),
                FOREIGN KEY (user_id) REFERENCES users(id)
            );
        `);

        // Subscriptions Table
        await turso.execute(`
            CREATE TABLE IF NOT EXISTS subscriptions(
            id TEXT PRIMARY KEY,
            subscriber_id TEXT NOT NULL, --Profile ID of the subber
                channel_id TEXT NOT NULL, --Profile ID of the target
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(subscriber_id) REFERENCES channels(id),
            FOREIGN KEY(channel_id) REFERENCES channels(id),
            UNIQUE(subscriber_id, channel_id)
        );
        `);

        console.log("Turso tables initialized successfully.");
    } catch (error) {
        console.error("Error initializing database:", error);
    }
}
