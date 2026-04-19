import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://qizbkowzlpluacveknqc.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpemJrb3d6bHBsdWFjdmVrbnFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMjI0NDksImV4cCI6MjA4MjY5ODQ0OX0.ZgANrl2szBc_VWcJIQ_wNyMvkURzeW-Oa2DRt2IZ0z8";

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function checkDB() {
  console.log("Checking restaurants (REVERTED)...");
  const { data, error } = await supabase.from("restaurants").select("id, name, slug, is_active").limit(5);
  if (error) {
    console.error("Error fetching restaurants:", error.message);
  } else {
    console.log(`Found ${data.length} restaurants:`);
    console.table(data);
  }
}

checkDB();
