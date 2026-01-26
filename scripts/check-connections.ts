import { turso } from "../src/lib/turso";
import { supabase } from "../src/lib/supabase";

async function check() {
    console.log("--- Connection Check ---");

    try {
        console.log("Testing Turso...");
        const tursoRes = await turso.execute("SELECT 1+1 as result");
        console.log("Turso OK! Result:", tursoRes.rows[0]);
    } catch (e: any) {
        console.error("Turso Failed:", e.message);
    }

    try {
        console.log("\nTesting Supabase...");
        if (!supabase) throw new Error("Supabase client is null");
        const { data, error } = await supabase.from('videos').select('count', { count: 'exact', head: true });
        if (error) throw error;
        console.log("Supabase OK! Video count:", data);
    } catch (e: any) {
        console.error("Supabase Failed:", e.message);
    }
}

check();
