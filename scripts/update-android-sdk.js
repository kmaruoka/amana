const fs = require('fs');
const path = require('path');

const androidDir = path.resolve(__dirname, '../mobile/android');
const wrapperProp = path.join(androidDir, 'gradle/wrapper/gradle-wrapper.properties');
const buildGradle = path.join(androidDir, 'build.gradle');
const appBuildGradle = path.join(androidDir, 'app', 'build.gradle');
const pluginDir = path.resolve(__dirname, '../mobile/node_modules/react-native-gradle-plugin');

if (!fs.existsSync(androidDir)) {
  console.error('android directory not found. Run react-native init first.');
  process.exit(1);
}

// Update gradle wrapper
if (fs.existsSync(wrapperProp)) {
  let data = fs.readFileSync(wrapperProp, 'utf8');
  data = data.replace(/distributionUrl=.*gradle-.*-all.zip/,
    'distributionUrl=https\://services.gradle.org/distributions/gradle-8.1.1-all.zip');
  fs.writeFileSync(wrapperProp, data);
  console.log('Updated gradle wrapper to 8.1.1');
}

// Update Android Gradle plugin
if (fs.existsSync(buildGradle)) {
  let data = fs.readFileSync(buildGradle, 'utf8');
  data = data.replace(/com.android.tools.build:gradle:\d+\.\d+\.\d+/, 'com.android.tools.build:gradle:8.1.2');
  data = data.replace(/buildToolsVersion\s*=\s*"[\d.]+"/, 'buildToolsVersion = "34.0.0"');
  data = data.replace(/compileSdkVersion\s*=\s*\d+/, 'compileSdkVersion = 34');
  data = data.replace(/targetSdkVersion\s*=\s*\d+/, 'targetSdkVersion = 34');
  fs.writeFileSync(buildGradle, data);
  console.log('Updated Android Gradle plugin and SDK versions');
}

// Update compileSdkVersion and targetSdkVersion in app/build.gradle for older templates
if (fs.existsSync(appBuildGradle)) {
  let data = fs.readFileSync(appBuildGradle, 'utf8');
  data = data.replace(/compileSdkVersion\s*=?\s*\d+/g, 'compileSdkVersion = 34');
  data = data.replace(/targetSdkVersion\s*=?\s*\d+/g, 'targetSdkVersion = 34');
  fs.writeFileSync(appBuildGradle, data);
  console.log('Updated compileSdkVersion and targetSdkVersion to 34 in app/build.gradle');
}

console.log('Android configuration updated. Run ./gradlew clean to apply changes.');

if (!fs.existsSync(pluginDir)) {
  console.warn(
    'react-native-gradle-plugin not found. Run "npm install" in the mobile/ directory before executing gradle tasks.'
  );
}

