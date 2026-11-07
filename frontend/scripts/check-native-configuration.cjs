const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const frontend = path.resolve(__dirname, "..");
for (const reverse of [false, true]) {
  const project = fs.mkdtempSync(
    path.join(os.tmpdir(), "gainschat-native-config-"),
  );
  try {
    const config = structuredClone(require("../app.json"));
    config.expo.icon = path.join(frontend, config.expo.icon);
    config.expo.ios.googleServicesFile = "./GoogleService-Info.plist";
    config.expo.plugins = config.expo.plugins.map((plugin) => {
      if (plugin === "./plugins/withNativeServiceInitialization")
        return path.join(frontend, plugin);
      if (Array.isArray(plugin) && plugin[0] === "expo-splash-screen") {
        plugin[1].image = path.join(frontend, plugin[1].image);
      }
      return plugin;
    });
    if (reverse) {
      const plugins = config.expo.plugins;
      const app = plugins.indexOf("@react-native-firebase/app");
      const check = plugins.indexOf("@react-native-firebase/app-check");
      [plugins[app], plugins[check]] = [plugins[check], plugins[app]];
    }
    fs.writeFileSync(path.join(project, "app.json"), JSON.stringify(config));
    fs.copyFileSync(
      path.join(frontend, "package.json"),
      path.join(project, "package.json"),
    );
    fs.symlinkSync(
      path.join(frontend, "node_modules"),
      path.join(project, "node_modules"),
      "dir",
    );
    fs.symlinkSync(
      path.join(frontend, "modules"),
      path.join(project, "modules"),
      "dir",
    );
    // Public test metadata only: no real Firebase project or credentials are needed.
    fs.writeFileSync(
      path.join(project, "GoogleService-Info.plist"),
      `<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0"><dict><key>BUNDLE_ID</key><string>com.blackmaskexe.gainschat</string>
<key>GOOGLE_APP_ID</key><string>1:123456789:ios:0000000000000000</string>
<key>PROJECT_ID</key><string>migration-test</string></dict></plist>`,
    );
    const result = spawnSync(
      process.execPath,
      [
        path.join(frontend, "node_modules/expo/bin/cli"),
        "prebuild",
        "--platform",
        "ios",
        "--no-install",
      ],
      {
        cwd: project,
        env: { ...process.env, CI: "1", EXPO_OFFLINE: "1" },
        encoding: "utf8",
        timeout: 120_000,
      },
    );
    assert.equal(result.status, 0, result.stderr + result.stdout);
    const ios = path.join(project, "ios/GainsChat");
    const appDelegate = fs.readFileSync(
      path.join(ios, "AppDelegate.swift"),
      "utf8",
    );
    for (const call of [
      "RNFBAppCheckModule.sharedInstance()",
      "FirebaseApp.configure()",
      "UIApplication.shared.registerForRemoteNotifications()",
    ]) {
      assert.equal(appDelegate.split(call).length - 1, 1, call);
    }
    assert.ok(
      appDelegate.indexOf("RNFBAppCheckModule.sharedInstance()") <
        appDelegate.indexOf("FirebaseApp.configure()"),
    );
    assert.ok(
      appDelegate.indexOf("FirebaseApp.configure()") <
        appDelegate.indexOf("return super.application"),
    );
    assert.ok(fs.existsSync(path.join(ios, "SceneDelegate.swift")));
    const plist = fs.readFileSync(path.join(ios, "Info.plist"), "utf8");
    assert.match(plist, /UIApplicationSceneManifest/);
    assert.match(plist, /Ionicons.ttf/);
    assert.match(
      fs.readFileSync(path.join(ios, "GainsChat-Bridging-Header.h"), "utf8"),
      /RNFBAppCheckModule.h/,
    );
    const properties = JSON.parse(
      fs.readFileSync(
        path.join(project, "ios/Podfile.properties.json"),
        "utf8",
      ),
    );
    assert.equal(properties["ios.deploymentTarget"], "16.4");
    assert.equal(properties["ios.useFrameworks"], "dynamic");
    console.log(
      `Native configuration passed with ${reverse ? "App Check before Firebase" : "Firebase before App Check"}.`,
    );
  } finally {
    fs.rmSync(project, { recursive: true, force: true });
  }
}
