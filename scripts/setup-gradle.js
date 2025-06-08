const fs = require('fs');
const path = require('path');

// Load .env if present
let envPath = path.resolve(__dirname, '../.env');
let token = process.env.MAPBOX_DOWNLOADS_TOKEN;
if (fs.existsSync(envPath)) {
  const envData = fs.readFileSync(envPath, 'utf8');
  for (const line of envData.split(/\r?\n/)) {
    const m = line.match(/^MAPBOX_DOWNLOADS_TOKEN=(.*)$/);
    if (m) {
      token = m[1];
      break;
    }
  }
}

if (!token) {
  console.error('MAPBOX_DOWNLOADS_TOKEN is not set.');
  process.exit(1);
}

const gradlePropsPath = path.resolve(__dirname, '../mobile/android/gradle.properties');
const buildGradlePath = path.resolve(__dirname, '../mobile/android/build.gradle');

if (!fs.existsSync(gradlePropsPath) || !fs.existsSync(buildGradlePath)) {
  console.error('Android project not found. Please generate android/ folder first.');
  process.exit(1);
}

// Update gradle.properties
let props = fs.readFileSync(gradlePropsPath, 'utf8');
if (!props.includes('MAPBOX_DOWNLOADS_TOKEN')) {
  props += `\nMAPBOX_DOWNLOADS_TOKEN=${token}\n`;
} else {
  props = props.replace(/MAPBOX_DOWNLOADS_TOKEN=.*/g, `MAPBOX_DOWNLOADS_TOKEN=${token}`);
}
fs.writeFileSync(gradlePropsPath, props);
console.log('Updated gradle.properties');

// Insert Mapbox Maven block if missing
let buildGradle = fs.readFileSync(buildGradlePath, 'utf8');
const repoBlock = `maven {\n        url 'https://api.mapbox.com/downloads/v2/releases/maven'\n        authentication { basic(BasicAuthentication) }\n        credentials {\n            username = 'mapbox'\n            password = project.properties['MAPBOX_DOWNLOADS_TOKEN'] ?: ''\n        }\n    }`;

if (!buildGradle.includes("api.mapbox.com")) {
  buildGradle = buildGradle.replace(/allprojects\s*\{\n\s*repositories \{/, match => match + `\n        ${repoBlock.replace(/\n/g, '\n        ')}`);
  fs.writeFileSync(buildGradlePath, buildGradle);
  console.log('Inserted Mapbox repository block');
} else {
  console.log('Mapbox repository block already present');
}

