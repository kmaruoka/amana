const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const mobileDir = path.resolve(__dirname, '../mobile');
const androidDir = path.join(mobileDir, 'android');
const iosDir = path.join(mobileDir, 'ios');
const appJson = path.join(mobileDir, 'app.json');

if (fs.existsSync(androidDir) && fs.existsSync(iosDir)) {
  console.log('mobile project already exists');
  process.exit(0);
}

const tempName = 'AmanaTmp';
const rnVersion = process.env.RN_VERSION || '0.71.8';

console.log(`Initializing React Native ${rnVersion} project...`);
execSync(`npx @react-native-community/cli init ${tempName} --version ${rnVersion}`, { stdio: 'inherit' });

fs.rmSync(path.join(tempName, '.git'), { recursive: true, force: true });
fs.mkdirSync(mobileDir, { recursive: true });
fs.renameSync(path.join(tempName, 'android'), androidDir);
fs.renameSync(path.join(tempName, 'ios'), iosDir);
fs.renameSync(path.join(tempName, 'app.json'), appJson);
fs.rmSync(tempName, { recursive: true, force: true });
console.log('React Native project created under mobile/');

