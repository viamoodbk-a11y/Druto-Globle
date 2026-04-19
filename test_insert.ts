import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = "https://qizbkowzlpluacveknqc.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpemJrb3d6bHBsdWFjdmVrbnFjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzEyMjQ0OSwiZXhwIjoyMDgyNjk4NDQ5fQ.L65Dtkx1D2I-L3TIfhZpP6nOR5O6w2JbN4Xh4hT77zM"; // SERVICE ROLE KEY FROM process_scan index.ts
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('scratch_card_configs').insert([
    { restaurant_id: '16776b38-0e52-4cea-abcf-8493b1b3ea58', reward_title: 'TEST 1', odds_numerator: 1, odds_denominator: 10 },
    { restaurant_id: '16776b38-0e52-4cea-abcf-8493b1b3ea58', reward_title: 'TEST 2', odds_numerator: 1, odds_denominator: 10 }
  ]);
  console.log("Error:", error);
  console.log("Data:", data);
}
run();
