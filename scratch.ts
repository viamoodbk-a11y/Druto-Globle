import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const url = "https://qizbkowzlpluacveknqc.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpemJrb3d6bHBsdWFjdmVrbnFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMjI0NDksImV4cCI6MjA4MjY5ODQ0OX0.ZgANrl2szBc_VWcJIQ_wNyMvkURzeW-Oa2DRt2IZ0z8";
const supabase = createClient(url, key);

async function main() {
  const { data, error } = await supabase.from('scratch_card_configs').select('*');
  console.log("Error:", error);
  console.log("Data:", data);
}
main();
