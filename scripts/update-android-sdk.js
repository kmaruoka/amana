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
const nodeModulesDir = path.resolve(__dirname, '../mobile/node_modules');
const gradleProperties = path.join(androidDir, 'gradle.properties');

function updateModuleCompileOptions(gradlePath) {
  if (!fs.existsSync(gradlePath)) return;
  let data = fs.readFileSync(gradlePath, 'utf8');
  let changed = false;
  if (/JavaVersion\.VERSION_1_8/.test(data)) {
    data = data.replace(/JavaVersion\.VERSION_1_8/g, 'JavaVersion.VERSION_17');
    changed = true;
  }
  if (/jvmTarget\s*=\s*"1\.8"/.test(data)) {
    data = data.replace(/jvmTarget\s*=\s*"1\.8"/g, 'jvmTarget = "17"');
    changed = true;
  }
  if (changed) {
    fs.writeFileSync(gradlePath, data);
    console.log(`Updated compileOptions in ${path.basename(path.dirname(gradlePath))}`);
  }
}

function updateModuleBuildFeatures(gradlePath) {
  if (!fs.existsSync(gradlePath)) return;
  let data = fs.readFileSync(gradlePath, 'utf8');
  let changed = false;
  if (/android\s*\{/.test(data)) {
    if (/buildFeatures/.test(data)) {
      if (!/buildConfig\s+true/.test(data)) {
        data = data.replace(/buildFeatures\s*\{/, '$&\n        buildConfig true');
        changed = true;
      }
    } else {
      data = data.replace(/android\s*\{/, (m) => `${m}\n    buildFeatures {\n        buildConfig true\n    }`);
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(gradlePath, data);
    console.log(`Enabled buildConfig in ${path.basename(path.dirname(gradlePath))}`);
  }
}

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
    if (!/<manifest[^>]*\s+package=/.test(manifest)) {
      manifest = manifest.replace(
        /<manifest/,
        `<manifest package="${packageName}"`
      );
      fs.writeFileSync(androidManifest, manifest);
    } else if (/namespace\s+['"][^'"]+['"]/.test(gradle)) {
      const updated = manifest.replace(/\s+package="[^"]*"/, '');
      if (manifest !== updated) {
        fs.writeFileSync(androidManifest, updated);
        console.log('Removed package attribute from AndroidManifest.xml');
      }
    }
  }
}

ensureNamespace();

function hasKotlinAndroidPlugin(data) {
  return (
    /['"]kotlin-android['"]/.test(data) ||
    /org\.jetbrains\.kotlin\.android/.test(data) ||
    /kotlin\s*\(\s*['"]android['"]\s*\)/.test(data)
  );
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
  if (/compileSdk(?:Version)?\s*(?:=|\s).*ext\.compileSdk(?:Version)?/.test(data)) {
    data = data.replace(/compileSdk(?:Version)?\s*(?:=|\s).*ext\.compileSdk(?:Version)?/, 'compileSdkVersion = 34');
  } else if (/compileSdk(?:Version)?\s*(?:=|\s).*rootProject\.ext\.compileSdk(?:Version)?/.test(data)) {
    data = data.replace(/compileSdk(?:Version)?\s*(?:=|\s).*rootProject\.ext\.compileSdk(?:Version)?/, 'compileSdkVersion = 34');
  } else if (/compileSdk(?:Version)?/.test(data) || /compileSdk\s*(?:=|\s)/.test(data)) {
    data = data.replace(/^(\s*)compileSdk(?:Version)?\s*.*$/gm, '$1compileSdkVersion = 34');
    data = data.replace(/^(\s*)compileSdk(?!Version)\s*.*$/gm, '$1compileSdk = 34');
  } else {
    data = data.replace(/android\s*\{/, '$&\n    compileSdkVersion = 34');
  }
  if (/targetSdkVersion\s*=?.*ext\.targetSdkVersion/.test(data)) {
    data = data.replace(/targetSdkVersion\s*=?.*ext\.targetSdkVersion/, 'targetSdkVersion = 34');
  } else if (/targetSdkVersion\s*=?.*rootProject\.ext\.targetSdkVersion/.test(data)) {
    data = data.replace(/targetSdkVersion\s*=?.*rootProject\.ext\.targetSdkVersion/, 'targetSdkVersion = 34');
  } else if (/targetSdkVersion/.test(data)) {
    data = data.replace(/targetSdkVersion\s*=\s*[\dA-Za-z_.]+/, 'targetSdkVersion = 34');
  } else {
    data = data.replace(/android\s*\{/, '$&\n    targetSdkVersion = 34');
  }
  if (/ndkVersion/.test(data)) {
    data = data.replace(/ndkVersion\s*=?\s*"?[^"\n]+"?/, 'ndkVersion = "23.1.7779620"');
  } else {
    data = data.replace(/android\s*\{/, '$&\n    ndkVersion = "23.1.7779620"');
  }
  fs.writeFileSync(buildGradle, data);
  console.log('Updated Android Gradle plugin and SDK versions');
}

// Update ext.compileSdkVersion / ext.targetSdkVersion in root build.gradle
function updateRootExt() {
  if (!fs.existsSync(buildGradle)) return;
  let root = fs.readFileSync(buildGradle, 'utf8');
  let changed = false;

  const hasCompileSdkVersion = /compileSdkVersion\s*(?:=|\s)\s*\d+/.test(root);
  const hasCompileSdk = /compileSdk(?!Version)\s*(?:=|\s)\s*\d+/.test(root);
  if (hasCompileSdkVersion) {
    root = root.replace(/compileSdkVersion\s*(?:=|\s)\s*\d+/g, 'compileSdkVersion = 34');
    changed = true;
  }
  if (hasCompileSdk) {
    root = root.replace(/compileSdk(?!Version)\s*(?:=|\s)\s*\d+/g, 'compileSdk = 34');
    changed = true;
  }
  if (!hasCompileSdkVersion && hasCompileSdk) {
    root = root.replace(/compileSdk(?!Version)\s*(?:=|\s)\s*\d+/, '$&\n    compileSdkVersion = 34');
    changed = true;
  } else if (!hasCompileSdk && !hasCompileSdkVersion && /ext\s*\{/.test(root)) {
    root = root.replace(/ext\s*\{/, '$&\n    compileSdkVersion = 34');
    changed = true;
  }

  const hasTargetSdkVersion = /targetSdkVersion\s*(?:=|\s)\s*\d+/.test(root);
  const hasTargetSdk = /targetSdk(?!Version)\s*(?:=|\s)\s*\d+/.test(root);
  if (hasTargetSdkVersion) {
    root = root.replace(/targetSdkVersion\s*(?:=|\s)\s*\d+/g, 'targetSdkVersion = 34');
    changed = true;
  }
  if (hasTargetSdk) {
    root = root.replace(/targetSdk(?!Version)\s*(?:=|\s)\s*\d+/g, 'targetSdk = 34');
    changed = true;
  }
  if (!hasTargetSdkVersion && hasTargetSdk) {
    root = root.replace(/targetSdk(?!Version)\s*(?:=|\s)\s*\d+/, '$&\n    targetSdkVersion = 34');
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
  if (/compileSdk(?:Version)?\s*=?.*ext\.compileSdk(?:Version)?/.test(data)) {
    data = data.replace(/compileSdk(?:Version)?\s*=?.*ext\.compileSdk(?:Version)?/, 'compileSdkVersion = 34');
  } else if (/compileSdk(?:Version)?\s*=?.*rootProject\.ext\.compileSdk(?:Version)?/.test(data)) {
    data = data.replace(/compileSdk(?:Version)?\s*=?.*rootProject\.ext\.compileSdk(?:Version)?/, 'compileSdkVersion = 34');
  } else if (/compileSdk(?:Version)?/.test(data) || /compileSdk\s*=/.test(data)) {
    data = data.replace(/^(\s*)compileSdk(?:Version)?\s*.*$/gm, '$1compileSdkVersion = 34');
    data = data.replace(/^(\s*)compileSdk(?!Version)\s*.*$/gm, '$1compileSdk = 34');
  } else {
    data = data.replace(/android\s*\{/, '$&\n    compileSdkVersion = 34');
  }
  if (/targetSdkVersion\s*(?:=|\s).*ext\.targetSdkVersion/.test(data)) {
    data = data.replace(/targetSdkVersion\s*(?:=|\s).*ext\.targetSdkVersion/, 'targetSdkVersion = 34');
  } else if (/targetSdkVersion\s*(?:=|\s).*rootProject\.ext\.targetSdkVersion/.test(data)) {
    data = data.replace(/targetSdkVersion\s*(?:=|\s).*rootProject\.ext\.targetSdkVersion/, 'targetSdkVersion = 34');
  } else if (/targetSdkVersion/.test(data)) {
    data = data.replace(/targetSdkVersion\s*(?:=|\s)\s*[\dA-Za-z_.]+/g, 'targetSdkVersion = 34');
  } else {
    data = data.replace(/android\s*\{/, '$&\n    targetSdkVersion = 34');
  }
  if (/ndkVersion/.test(data)) {
    data = data.replace(/ndkVersion\s*=?\s*"?[^"\n]+"?/, 'ndkVersion = "23.1.7779620"');
  } else {
    data = data.replace(/android\s*\{/, '$&\n    ndkVersion = "23.1.7779620"');
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
  const hasKotlinPlugin = hasKotlinAndroidPlugin(data);
  if (/kotlinOptions/.test(data)) {
    if (hasKotlinPlugin) {
      data = data.replace(/jvmTarget\s*=\s*"?\d+"?/, 'jvmTarget = "17"');
    } else {
      data = data.replace(/kotlinOptions\s*\{[^}]*\}/s, '');
      console.warn('kotlin-android プラグインが無いため既存の kotlinOptions ブロックを削除しました');
    }
  } else if (hasKotlinPlugin) {
    data = data.replace(/android\s*\{/, (m) => `${m}\n    kotlinOptions {\n        jvmTarget = "17"\n    }`);
  } else {
    console.warn('kotlin-android プラグインが見つからないため kotlinOptions を追加できません');
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

// Ensure node module build.gradle files use Java 17
if (fs.existsSync(nodeModulesDir)) {
  const modules = ['react-native-screens', 'react-native-safe-area-context'];
  for (const mod of modules) {
    const g = path.join(nodeModulesDir, mod, 'android', 'build.gradle');
    updateModuleCompileOptions(g);
    updateModuleBuildFeatures(g);
  }

  // react-native-screens 3.x uses R.attr which breaks with newer SDK
  const screensKt = path.join(
    nodeModulesDir,
    'react-native-screens',
    'android',
    'src',
    'main',
    'java',
    'com',
    'swmansion',
    'rnscreens',
    'ScreenStackHeaderConfig.kt',
  );
  if (fs.existsSync(screensKt)) {
    let ktData = fs.readFileSync(screensKt, 'utf8');
    if (/R\.attr\.colorPrimary/.test(ktData) && !/androidx\.appcompat\.R\.attr\.colorPrimary/.test(ktData)) {
      ktData = ktData.replace(
        /R\.attr\.colorPrimary/g,
        'androidx.appcompat.R.attr.colorPrimary',
      );
      fs.writeFileSync(screensKt, ktData);
      console.log('Patched react-native-screens colorPrimary reference');
    }
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
  const debug = process.env.DEBUG_SDK_UPDATE;
  const finalData = fs.readFileSync(appBuildGradle, 'utf8');

  function checkCompileSdk(data) {
    const m = data.match(/compileSdk(?:Version)?\s*(?:=|\s)\s*(\d+)/);
    return m ? Number(m[1]) === 34 : false;
  }

  let compileSdkOK = checkCompileSdk(finalData);

  if (!compileSdkOK && fs.existsSync(buildGradle)) {
    const rootData = fs.readFileSync(buildGradle, 'utf8');
    if (debug) {
      const lines = rootData.match(/^.*compileSdk.*$/gm);
      console.log('[DEBUG] root build.gradle compileSdk lines:\n' + (lines ? lines.join('\n') : 'none'));
    }
    compileSdkOK = checkCompileSdk(rootData);
  }
  if (debug) {
    const lines = finalData.match(/^.*compileSdk.*$/gm);
    console.log('[DEBUG] app/build.gradle compileSdk lines:\n' + (lines ? lines.join('\n') : 'none'));
    console.log('[DEBUG] compileSdkOK:', compileSdkOK);
  }
  if (!compileSdkOK) {
    console.warn(
      'compileSdkVersion (compileSdk) を自動で更新できませんでした。`mobile/android/app/build.gradle` を手動で編集してください。'
    );
  }
  const hasKotlinPluginFinal = hasKotlinAndroidPlugin(finalData);
  if (hasKotlinPluginFinal && !/kotlinOptions/.test(finalData)) {
    console.warn(
      'kotlinOptions ブロックが見つかりません。kotlin-android プラグインが適用されているか確認してください。'
    );
  }
}

