import { supabase } from "../src/lib/supabase";

async function run() {
    if (!supabase) return;

    console.log("Forcing deletion of legacy videos...");

    const { data, error } = await supabase
        .from('videos')
        .delete()
        .or(`channel_name.eq.Guess-me,channel_id.eq.ch_1769262677206_k5xxdmskb`)
        .select();

    if (error) {
        console.error("Force delete failed:", error);
    } else {
        console.log(`Successfully deleted ${data?.length || 0} legacy videos.`);
        console.log(JSON.stringify(data, null, 2));
    }
    process.exit(0);
}

run().catch((e) => {
    console.error(e);
    process.exit(1);
});
