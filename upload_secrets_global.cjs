const fs = require('fs');
const { execSync } = require('child_process');

const file = fs.readFileSync('/Users/hj/Downloads/druto---reward-aa8770c2ec09.json', 'utf8');
const keyFile = JSON.parse(file);

// Write exact raw key to a tmp file
fs.writeFileSync('/tmp/raw_key_global.txt', keyFile.private_key);

const projectRef = 'xbcizfkykozvcmoqildi';

console.log(`Setting secrets for project ${projectRef}...`);

console.log("Setting FIREBASE_PROJECT_ID...");
execSync(`npx --yes supabase@latest secrets set FIREBASE_PROJECT_ID="${keyFile.project_id}" --project-ref ${projectRef}`);

console.log("Setting FIREBASE_CLIENT_EMAIL...");
execSync(`npx --yes supabase@latest secrets set FIREBASE_CLIENT_EMAIL="${keyFile.client_email}" --project-ref ${projectRef}`);

console.log("Setting FIREBASE_PRIVATE_KEY...");
execSync(`npx --yes supabase@latest secrets set FIREBASE_PRIVATE_KEY="$(cat /tmp/raw_key_global.txt)" --project-ref ${projectRef}`);

console.log("Done!");
