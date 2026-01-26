import { turso } from "../src/lib/turso";

async function run() {
    console.log("Updating channels table schema...");
    try {
        await turso.execute("ALTER TABLE channels ADD COLUMN account_type TEXT DEFAULT 'general'");
        console.log("Column added successfully.");
    } catch (e: any) {
        if (e.message.includes("duplicate column name")) {
            console.log("Column already exists.");
        } else {
            console.error("Failed to add column:", e.message);
        }
    }
    process.exit(0);
}

run();
