const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const androidDir = path.resolve(__dirname, '../mobile/android');
const wrapperProp = path.join(androidDir, 'gradle/wrapper/gradle-wrapper.properties');
const buildGradle = path.join(androidDir, 'build.gradle');
const appBuildGradle = path.join(androidDir, 'app', 'build.gradle');
const pluginDirs = [
  path.resolve(__dirname, '../mobile/node_modules/react-native-gradle-plugin'),
  path.resolve(__dirname, '../mobile/node_modules/@react-native/gradle-plugin'),
];
let pluginDir = pluginDirs.find((d) => fs.existsSync(d));
let pluginBuild = pluginDir ? path.join(pluginDir, 'build.gradle.kts') : null;
const rnmapboxGradle = path.resolve(__dirname, '../mobile/node_modules/@rnmapbox/maps/android/build.gradle');
const gradleProperties = path.join(androidDir, 'gradle.properties');

// Check Java version
let javaVersionOut;
try {
  javaVersionOut = execSync('java -version 2>&1', { encoding: 'utf8' });
} catch (e) {
  console.error('Java not found. Please install JDK 11 and set JAVA_HOME.');
  process.exit(1);
}
const match = javaVersionOut.match(/version "(\d+)/);
if (!match || parseInt(match[1], 10) < 11) {
  console.error('JDK 11 or newer is required. Current java -version output:\n' + javaVersionOut);
  process.exit(1);
}

if (!fs.existsSync(androidDir)) {
  console.error('android directory not found. Run react-native init first.');
  process.exit(1);
}

// Record JAVA_HOME for Gradle if possible
if (fs.existsSync(gradleProperties)) {
  const javaHome = process.env.JAVA_HOME;
  if (javaHome) {
    let props = fs.readFileSync(gradleProperties, 'utf8');
    const normalized = javaHome.replace(/\\/g, '/');
    if (/^org\.gradle\.java\.home/m.test(props)) {
      props = props.replace(/^org\.gradle\.java\.home=.*/m, `org.gradle.java.home=${normalized}`);
    } else {
      props += `\norg.gradle.java.home=${normalized}\n`;
    }
    fs.writeFileSync(gradleProperties, props);
    console.log('Updated org.gradle.java.home in gradle.properties');
  } else {
    console.warn('JAVA_HOME が設定されていません。JDK 11 のパスを指定してください。');
  }
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
  if (/compileSdkVersion/.test(data)) {
    data = data.replace(/compileSdkVersion\s*=\s*\d+/, 'compileSdkVersion = 34');
  } else {
    data = data.replace(/android\s*\{/, '$&\n    compileSdkVersion = 34');
  }
  if (/targetSdkVersion/.test(data)) {
    data = data.replace(/targetSdkVersion\s*=\s*\d+/, 'targetSdkVersion = 34');
  } else {
    data = data.replace(/android\s*\{/, '$&\n    targetSdkVersion = 34');
  }
  fs.writeFileSync(buildGradle, data);
  console.log('Updated Android Gradle plugin and SDK versions');
}

// Update compileSdkVersion and targetSdkVersion in app/build.gradle for older templates
if (fs.existsSync(appBuildGradle)) {
  let data = fs.readFileSync(appBuildGradle, 'utf8');
  if (/compileSdkVersion/.test(data)) {
    data = data.replace(/compileSdkVersion\s*=?\s*(\d+|[A-Za-z_.]+)/g, 'compileSdkVersion = 34');
  } else {
    data = data.replace(/android\s*\{/, '$&\n    compileSdkVersion = 34');
  }
  if (/targetSdkVersion/.test(data)) {
    data = data.replace(/targetSdkVersion\s*=?\s*(\d+|[A-Za-z_.]+)/g, 'targetSdkVersion = 34');
  } else {
    data = data.replace(/android\s*\{/, '$&\n    targetSdkVersion = 34');
  }
  if (/buildFeatures/.test(data)) {
    data = data.replace(/buildFeatures\s*\{[^}]*\}/s, (m) => {
      return /buildConfig\s+true/.test(m)
        ? m
        : m.replace(/\}/, '    buildConfig true\n    }');
    });
  } else {
    data = data.replace(/android\s*\{/, (m) =>
      `${m}\n    buildFeatures {\n        buildConfig true\n    }`
    );
  }
  if (/compileOptions/.test(data)) {
    data = data.replace(/sourceCompatibility\s+JavaVersion\.VERSION_\d+/,
      'sourceCompatibility JavaVersion.VERSION_11');
    data = data.replace(/targetCompatibility\s+JavaVersion\.VERSION_\d+/,
      'targetCompatibility JavaVersion.VERSION_11');
  } else {
    data = data.replace(/android\s*\{/, (m) =>
      `${m}\n    compileOptions {\n        sourceCompatibility JavaVersion.VERSION_11\n        targetCompatibility JavaVersion.VERSION_11\n    }`);
  }
  if (/kotlinOptions/.test(data)) {
    data = data.replace(/jvmTarget\s*=\s*"?\d+"?/,
      'jvmTarget = "11"');
  } else {
    data = data.replace(/android\s*\{/, (m) =>
      `${m}\n    kotlinOptions {\n        jvmTarget = "11"\n    }`);
  }
  fs.writeFileSync(appBuildGradle, data);
  console.log('Updated compileSdkVersion and targetSdkVersion to 34 in app/build.gradle');
}

console.log('Android configuration updated. Run ./gradlew clean to apply changes.');

if (!pluginDir) {
  console.warn(
    'react-native-gradle-plugin が見つかりません。Gradle 実行前に mobile ディレクトリで `npm install` を実行してください。'
  );
} else if (fs.existsSync(pluginBuild)) {
  let data = fs.readFileSync(pluginBuild, 'utf8');
  if (/kotlin\("jvm"\) version "1\.6/.test(data)) {
    data = data.replace(/kotlin\("jvm"\) version "[\d.]+"/, 'kotlin("jvm") version "1.8.10"');
    fs.writeFileSync(pluginBuild, data);
    console.log('Patched react-native-gradle-plugin Kotlin version to 1.8.10');
  }
}

// Enable BuildConfig generation for @rnmapbox/maps
if (fs.existsSync(rnmapboxGradle)) {
  let data = fs.readFileSync(rnmapboxGradle, 'utf8');
  if (/android\s*\{/.test(data)) {
    if (/buildFeatures/.test(data)) {
      if (!/buildConfig\s+true/.test(data)) {
        data = data.replace(/buildFeatures\s*\{/, '$&\n        buildConfig true');
        fs.writeFileSync(rnmapboxGradle, data);
        console.log('Enabled buildConfig in rnmapbox_maps');
      }
    } else {
      data = data.replace(/android\s*\{/, (m) => `${m}\n    buildFeatures {\n        buildConfig true\n    }`);
      fs.writeFileSync(rnmapboxGradle, data);
      console.log('Inserted buildFeatures block in rnmapbox_maps');
    }
  }
}

// Final sanity check
if (fs.existsSync(appBuildGradle)) {
  const finalData = fs.readFileSync(appBuildGradle, 'utf8');
  if (!/compileSdkVersion\s*=?\s*34/.test(finalData)) {
    console.warn(
      'compileSdkVersion を自動で更新できませんでした。`mobile/android/app/build.gradle` を手動で編集してください。'
    );
  }
  if (!/kotlinOptions/.test(finalData)) {
    console.warn(
      'kotlinOptions ブロックが見つかりません。kotlin-android プラグインが適用されているか確認してください。'
    );
  }
}

