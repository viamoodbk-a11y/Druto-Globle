const url = "https://qizbkowzlpluacveknqc.supabase.co/rest/v1/scratch_card_configs?select=*";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpemJrb3d6bHBsdWFjdmVrbnFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMjI0NDksImV4cCI6MjA4MjY5ODQ0OX0.ZgANrl2szBc_VWcJIQ_wNyMvkURzeW-Oa2DRt2IZ0z8";
async function run() {
  const res = await fetch(url, { headers: { apikey: key, Authorization: "Bearer " + key } });
  const data = await res.json();
  console.log(data);
}
run();
