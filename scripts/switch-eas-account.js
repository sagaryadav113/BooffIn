const fs = require('fs');
const path = require('path');

const target = process.argv[2];

if (!target || !['booffin', 'personal'].includes(target.toLowerCase())) {
  console.error('Usage: node scripts/switch-eas-account.js <booffin|personal>');
  process.exit(1);
}

const key = target.toLowerCase();
const configPath = path.resolve(__dirname, '..', 'eas-accounts.json');
const appJsonPath = path.resolve(__dirname, '..', 'app.json');

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

const account = config.accounts[key];
if (!account) {
  console.error(`Account "${key}" not found in eas-accounts.json`);
  process.exit(1);
}

// Preserve existing projectId if personal already had one or update it
if (appJson.expo?.owner === 'sagaryadav_11' && appJson.expo?.extra?.eas?.projectId) {
  config.accounts.personal.projectId = appJson.expo.extra.eas.projectId;
} else if (appJson.expo?.owner === 'booffin' && appJson.expo?.extra?.eas?.projectId) {
  config.accounts.booffin.projectId = appJson.expo.extra.eas.projectId;
}

appJson.expo.owner = account.owner;

if (!appJson.expo.extra) appJson.expo.extra = {};
if (!appJson.expo.extra.eas) appJson.expo.extra.eas = {};

if (account.projectId) {
  appJson.expo.extra.eas.projectId = account.projectId;
} else {
  // Clear projectId so EAS will prompt or init fresh for personal account
  delete appJson.expo.extra.eas.projectId;
}

config.active = key;

fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n', 'utf8');
fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8');

console.log(`✅ Successfully switched EAS active profile to: ${account.description} (owner: "${account.owner}")`);
if (account.projectId) {
  console.log(`   EAS Project ID: ${account.projectId}`);
} else {
  console.log('   EAS Project ID cleared (ready for fresh init under personal account)');
}
