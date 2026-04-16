const fs = require('fs');
const { execSync } = require('child_process');

const file = fs.readFileSync('/Users/hj/Downloads/druto---reward-aa8770c2ec09.json', 'utf8');
const keyFile = JSON.parse(file);

// Write exact raw key to a tmp file
fs.writeFileSync('/tmp/raw_key.txt', keyFile.private_key);

// Set secrets using the exact values from JSON, without .env parsing adding quotes
console.log("Setting PROJECT_ID...");
execSync(`npx --yes supabase@latest secrets set FIREBASE_PROJECT_ID="${keyFile.project_id}" --project-ref qizbkowzlpluacveknqc`);

console.log("Setting CLIENT_EMAIL...");
execSync(`npx --yes supabase@latest secrets set FIREBASE_CLIENT_EMAIL="${keyFile.client_email}" --project-ref qizbkowzlpluacveknqc`);

console.log("Setting PRIVATE_KEY...");
// Use standard input to avoid bash escaping issues
execSync(`npx --yes supabase@latest secrets set FIREBASE_PRIVATE_KEY="$(cat /tmp/raw_key.txt)" --project-ref qizbkowzlpluacveknqc`);

console.log("Done!");
