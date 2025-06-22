const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const androidDir = path.resolve(__dirname, '../mobile/android');
const wrapperProp = path.join(androidDir, 'gradle/wrapper/gradle-wrapper.properties');
const buildGradle = path.join(androidDir, 'build.gradle');
const appBuildGradle = path.join(androidDir, 'app', 'build.gradle');
const androidManifest = path.join(
  androidDir,
  'app',
  'src',
  'main',
  'AndroidManifest.xml',
);
const appJsonPath = path.resolve(__dirname, '../mobile/app.json');
const pluginDirs = [
  path.resolve(__dirname, '../mobile/node_modules/react-native-gradle-plugin'),
  path.resolve(__dirname, '../mobile/node_modules/@react-native/gradle-plugin'),
];
let pluginDir = pluginDirs.find((d) => fs.existsSync(d));
let pluginBuild = pluginDir ? path.join(pluginDir, 'build.gradle.kts') : null;
const rnmapboxGradle = path.resolve(__dirname, '../mobile/node_modules/@rnmapbox/maps/android/build.gradle');
const gradleProperties = path.join(androidDir, 'gradle.properties');

// Resolve package name for Android namespace
let packageName = process.env.ANDROID_PACKAGE_NAME;
if (!packageName && fs.existsSync(appJsonPath)) {
  try {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    if (appJson.name) {
      packageName = `com.${appJson.name}`;
    }
  } catch (e) {
    // fall back to default below
  }
}
if (!packageName) {
  packageName = 'com.amana.app';
}

// Check Java version
let javaVersionOut;
try {
  javaVersionOut = execSync('java -version 2>&1', { encoding: 'utf8' });
} catch (e) {
  console.error('Java not found. Please install JDK 17 and set JAVA_HOME.');
  process.exit(1);
}
const match = javaVersionOut.match(/version "(\d+)/);
if (!match || parseInt(match[1], 10) < 17) {
  console.error('JDK 17 or newer is required. Current java -version output:\n' + javaVersionOut);
  process.exit(1);
}

if (!fs.existsSync(androidDir)) {
  console.error('android directory not found. Run react-native init first.');
  process.exit(1);
}

// Ensure namespace and applicationId are set
function ensureNamespace() {
  if (!fs.existsSync(appBuildGradle)) return;
  let gradle = fs.readFileSync(appBuildGradle, 'utf8');
  let changed = false;
  if (!/namespace\s+['"][^'"]+['"]/.test(gradle)) {
    gradle = gradle.replace(/android\s*\{/, `android {\n    namespace "${packageName}"`);
    changed = true;
  }
  if (!/applicationId\s+['"][^'"]+['"]/.test(gradle)) {
    gradle = gradle.replace(/defaultConfig\s*\{/, `defaultConfig {\n        applicationId "${packageName}"`);
    changed = true;
  }
  if (changed) {
    fs.writeFileSync(appBuildGradle, gradle);
    console.log(`Set Android namespace to ${packageName}`);
  }
  if (fs.existsSync(androidManifest)) {
    let manifest = fs.readFileSync(androidManifest, 'utf8');
    if (!/manifest\s+package=/.test(manifest)) {
      manifest = manifest.replace(/<manifest/, `<manifest package="${packageName}"`);
      fs.writeFileSync(androidManifest, manifest);
    }
  }
}

ensureNamespace();

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
    console.warn('JAVA_HOME が設定されていません。JDK 17 のパスを指定してください。');
  }
  let props2 = fs.readFileSync(gradleProperties, 'utf8');
  if (!/^hermesEnabled/m.test(props2)) {
    props2 += '\nhermesEnabled=true\n';
  } else {
    props2 = props2.replace(/^hermesEnabled=.*/m, 'hermesEnabled=true');
  }
  if (!/^ndkVersion/m.test(props2)) {
    props2 += 'ndkVersion=23.1.7779620\n';
  } else {
    props2 = props2.replace(/^ndkVersion=.*/m, 'ndkVersion=23.1.7779620');
  }
  fs.writeFileSync(gradleProperties, props2);
}

// Update gradle wrapper
if (fs.existsSync(wrapperProp)) {
  let data = fs.readFileSync(wrapperProp, 'utf8');
  data = data.replace(/distributionUrl=.*gradle-.*-all.zip/,
    'distributionUrl=https\://services.gradle.org/distributions/gradle-8.0.2-all.zip');
  fs.writeFileSync(wrapperProp, data);
  console.log('Updated gradle wrapper to 8.0.2');
}

// Update Android Gradle plugin
if (fs.existsSync(buildGradle)) {
  let data = fs.readFileSync(buildGradle, 'utf8');
  if (/ext\.kotlin_version/.test(data)) {
    data = data.replace(/ext\.kotlin_version\s*=\s*['"][^'"]+['"]/,
      "ext.kotlin_version = '1.8.10'");
  } else {
    data = data.replace(/buildscript\s*\{/, `$&\n    ext.kotlin_version = '1.8.10'`);
  }
  data = data.replace(/com.android.tools.build:gradle:\d+\.\d+\.\d+/, 'com.android.tools.build:gradle:8.0.2');
  data = data.replace(/buildToolsVersion\s*=\s*"[\d.]+"/, 'buildToolsVersion = "34.0.0"');
  if (/compileSdk(?:Version)?\s*=?.*ext\.compileSdkVersion/.test(data)) {
    data = data.replace(/compileSdk(?:Version)?\s*=?.*ext\.compileSdkVersion/, 'compileSdkVersion = 34');
  } else if (/compileSdk(?:Version)?/.test(data)) {
    data = data.replace(/^(\s*)compileSdk(?:Version)?\s*.*$/gm, '$1compileSdkVersion = 34');
  } else {
    data = data.replace(/android\s*\{/, '$&\n    compileSdkVersion = 34');
  }
  if (/targetSdkVersion\s*=?.*ext\.targetSdkVersion/.test(data)) {
    data = data.replace(/targetSdkVersion\s*=?.*ext\.targetSdkVersion/, 'targetSdkVersion = 34');
  } else if (/targetSdkVersion/.test(data)) {
    data = data.replace(/targetSdkVersion\s*=\s*\d+/, 'targetSdkVersion = 34');
  } else {
    data = data.replace(/android\s*\{/, '$&\n    targetSdkVersion = 34');
  }
  if (/ndkVersion/.test(data)) {
    data = data.replace(/ndkVersion\s*=?\s*"?[^"]+"?/, 'ndkVersion "23.1.7779620"');
  } else {
    data = data.replace(/android\s*\{/, '$&\n    ndkVersion "23.1.7779620"');
  }
  fs.writeFileSync(buildGradle, data);
  console.log('Updated Android Gradle plugin and SDK versions');
}

// Update ext.compileSdkVersion / ext.targetSdkVersion in root build.gradle
function updateRootExt() {
  if (!fs.existsSync(buildGradle)) return;
  let root = fs.readFileSync(buildGradle, 'utf8');
  let changed = false;
  if (/ext\.compileSdkVersion/.test(root)) {
    if (/ext\.compileSdkVersion\s*=\s*\d+/.test(root)) {
      root = root.replace(/ext\.compileSdkVersion\s*=\s*\d+/, 'ext.compileSdkVersion = 34');
    } else if (/ext\s*\{/.test(root)) {
      root = root.replace(/ext\s*\{/, '$&\n    compileSdkVersion = 34');
    }
    changed = true;
  }
  if (/ext\.targetSdkVersion/.test(root)) {
    root = root.replace(/ext\.targetSdkVersion\s*=\s*\d+/, 'ext.targetSdkVersion = 34');
    changed = true;
  }
  if (changed) {
    fs.writeFileSync(buildGradle, root);
    console.log('Updated ext compile/target SDK versions');
  }
}
updateRootExt();

// Update compileSdkVersion and targetSdkVersion in app/build.gradle for older templates
if (fs.existsSync(appBuildGradle)) {
  let data = fs.readFileSync(appBuildGradle, 'utf8');
  if (/compileSdk(?:Version)?\s*=?.*ext\.compileSdkVersion/.test(data)) {
    data = data.replace(/compileSdk(?:Version)?\s*=?.*ext\.compileSdkVersion/, 'compileSdkVersion = 34');
  } else if (/compileSdk(?:Version)?/.test(data)) {
    data = data.replace(/^(\s*)compileSdk(?:Version)?\s*.*$/gm, '$1compileSdkVersion = 34');
  } else {
    data = data.replace(/android\s*\{/, '$&\n    compileSdkVersion = 34');
  }
  if (/targetSdkVersion\s*=?.*ext\.targetSdkVersion/.test(data)) {
    data = data.replace(/targetSdkVersion\s*=?.*ext\.targetSdkVersion/, 'targetSdkVersion = 34');
  } else if (/targetSdkVersion/.test(data)) {
    data = data.replace(/targetSdkVersion\s*=?\s*(\d+|[A-Za-z_.]+)/g, 'targetSdkVersion = 34');
  } else {
    data = data.replace(/android\s*\{/, '$&\n    targetSdkVersion = 34');
  }
  if (/ndkVersion/.test(data)) {
    data = data.replace(/ndkVersion\s*=?\s*"?[^"]+"?/, 'ndkVersion "23.1.7779620"');
  } else {
    data = data.replace(/android\s*\{/, '$&\n    ndkVersion "23.1.7779620"');
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
      'sourceCompatibility JavaVersion.VERSION_17');
    data = data.replace(/targetCompatibility\s+JavaVersion\.VERSION_\d+/,
      'targetCompatibility JavaVersion.VERSION_17');
  } else {
    data = data.replace(/android\s*\{/, (m) =>
      `${m}\n    compileOptions {\n        sourceCompatibility JavaVersion.VERSION_17\n        targetCompatibility JavaVersion.VERSION_17\n    }`);
  }
  if (/kotlinOptions/.test(data)) {
    data = data.replace(/jvmTarget\s*=\s*"?\d+"?/,
      'jvmTarget = "17"');
  } else {
    data = data.replace(/android\s*\{/, (m) =>
      `${m}\n    kotlinOptions {\n        jvmTarget = "17"\n    }`);
  }
  if (/hermesEnabled\s*[:=]\s*false/.test(data)) {
    data = data.replace(/hermesEnabled\s*[:=]\s*false/, 'hermesEnabled = true');
  }
  if (/enableHermes\s*[:=]\s*false/.test(data)) {
    data = data.replace(/enableHermes\s*[:=]\s*false/, 'enableHermes true');
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
  let compileSdkOK = /compileSdk(?:Version)?\s*=?\s*34/.test(finalData);
  if (!compileSdkOK && /compileSdk(?:Version)?\s*=?.*ext\.compileSdkVersion/.test(finalData)) {
    if (fs.existsSync(buildGradle)) {
      const rootData = fs.readFileSync(buildGradle, 'utf8');
      compileSdkOK = /ext\.compileSdkVersion\s*=\s*34/.test(rootData);
    }
  }
  if (!compileSdkOK) {
    console.warn(
      'compileSdkVersion (compileSdk) を自動で更新できませんでした。`mobile/android/app/build.gradle` を手動で編集してください。'
    );
  }
  if (!/kotlinOptions/.test(finalData)) {
    console.warn(
      'kotlinOptions ブロックが見つかりません。kotlin-android プラグインが適用されているか確認してください。'
    );
  }
}

