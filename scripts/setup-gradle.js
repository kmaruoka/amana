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
const settingsGradlePath = path.resolve(__dirname, '../mobile/android/settings.gradle');

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
const repoBlockBuild = `maven {\n        url 'https://api.mapbox.com/downloads/v2/releases/maven'\n        authentication { basic(BasicAuthentication) }\n        credentials {\n            username = 'mapbox'\n            password = project.properties['MAPBOX_DOWNLOADS_TOKEN'] ?: ''\n        }\n    }`;

const repoBlockSettings = `maven {\n        url 'https://api.mapbox.com/downloads/v2/releases/maven'\n        authentication { basic(BasicAuthentication) }\n        credentials {\n            username = 'mapbox'\n            password = providers.gradleProperty('MAPBOX_DOWNLOADS_TOKEN').orNull ?: System.getenv('MAPBOX_DOWNLOADS_TOKEN') ?: ''\n        }\n    }`;

if (!buildGradle.includes("api.mapbox.com")) {
  const patterns = [
    /(allprojects\s*\{[\s\S]*?repositories\s*\{)/,
    /(dependencyResolutionManagement\s*\{[\s\S]*?repositories\s*\{)/,
  ];
  const formatted = repoBlockBuild
    .split(/\n/)
    .map((l) => '        ' + l)
    .join('\n');
  let inserted = false;
  for (const pat of patterns) {
    if (pat.test(buildGradle)) {
      buildGradle = buildGradle.replace(pat, (m) => m + '\n' + formatted);
      inserted = true;
      break;
    }
  }
  if (!inserted) {
    // Fall back to appending a new allprojects block for older templates
    buildGradle +=
      '\nallprojects {\n    repositories {\n' +
      formatted +
      '\n    }\n}\n';
    console.log('Appended new allprojects block with Mapbox repository');
  }
  fs.writeFileSync(buildGradlePath, buildGradle);
  console.log('Inserted Mapbox repository block');
} else {
  console.log('Mapbox repository block already present');
}

// Also update settings.gradle for projects using dependencyResolutionManagement
if (fs.existsSync(settingsGradlePath)) {
  let settingsGradle = fs.readFileSync(settingsGradlePath, 'utf8');
  if (!settingsGradle.includes('api.mapbox.com')) {
    const pattern = /(dependencyResolutionManagement\s*\{[\s\S]*?repositories\s*\{)/;
    const formatted = repoBlockSettings
      .split(/\n/)
      .map((l) => '        ' + l)
      .join('\n');
    if (pattern.test(settingsGradle)) {
      settingsGradle = settingsGradle.replace(pattern, (m) => m + '\n' + formatted);
      fs.writeFileSync(settingsGradlePath, settingsGradle);
      console.log('Inserted Mapbox repository block into settings.gradle');
    } else {
      settingsGradle +=
        '\n' +
        'dependencyResolutionManagement {\n' +
        '    repositories {\n' +
        formatted +
        '\n    }\n' +
        '}\n';
      fs.writeFileSync(settingsGradlePath, settingsGradle);
      console.log(
        'Added dependencyResolutionManagement block with Mapbox repository to settings.gradle'
      );
    }
  } else {
    console.log('Mapbox repository block already present in settings.gradle');
  }
}

