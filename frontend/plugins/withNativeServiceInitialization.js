const { withAppDelegate } = require("expo/config-plugins");

// SDK 58 moves React startup to SceneDelegate. RNFirebase 26's plugins still
// look for factory.startReactNative(), so fill that gap and normalize older output.
function normalizeNativeInitialization(contents) {
  const initialization =
    /^[ \t]*(?:FirebaseApp\.configure\(\)|RNFBAppCheckModule\.sharedInstance\(\)|UIApplication\.shared\.registerForRemoteNotifications\(\))[ \t]*;?[ \t]*(?:\r?\n|$)/gm;
  const sceneAnchor =
    /^[ \t]*return super\.application\(application, didFinishLaunchingWithOptions: launchOptions\)/m;
  const sceneTemplate =
    contents.includes("ExpoReactNativeFactoryProvider") &&
    contents.includes("reactNativeFactory = factory") &&
    sceneAnchor.test(contents);
  const hasInitialization =
    contents.includes("RNFBAppCheckModule.sharedInstance()") &&
    contents.includes("FirebaseApp.configure()");
  if (!sceneTemplate && !hasInitialization) {
    throw new Error(
      "RNFirebase app and app-check plugins must initialize a supported Swift AppDelegate before Gains Chat's final plugin.",
    );
  }
  const block = (indent) =>
    `${indent}RNFBAppCheckModule.sharedInstance()\n${indent}FirebaseApp.configure()\n${indent}UIApplication.shared.registerForRemoteNotifications()\n`;
  let result;
  if (sceneTemplate) {
    result = contents.replace(initialization, "");
    result = result.replace(
      sceneAnchor,
      (line) => block(line.match(/^[ \t]*/)[0]) + line,
    );
  } else {
    let inserted = false;
    result = contents.replace(initialization, (line) => {
      if (inserted) return "";
      inserted = true;
      return block(line.match(/^[ \t]*/)[0]);
    });
  }
  if (!/^import UIKit[ \t]*$/m.test(result)) result = `import UIKit\n${result}`;
  if (!/^import FirebaseCore[ \t]*$/m.test(result))
    result = `import FirebaseCore\n${result}`;
  return result;
}

module.exports = (config) => {
  const plugins = (config.plugins ?? []).map((plugin) =>
    Array.isArray(plugin) ? plugin[0] : plugin,
  );
  if (
    !plugins.includes("@react-native-firebase/app") ||
    !plugins.includes("@react-native-firebase/app-check")
  ) {
    throw new Error(
      "Gains Chat requires both RNFirebase app and app-check plugins.",
    );
  }
  return withAppDelegate(config, (mod) => {
    if (mod.modResults.language !== "swift")
      throw new Error("Gains Chat requires a Swift AppDelegate.");
    mod.modResults.contents = normalizeNativeInitialization(
      mod.modResults.contents,
    );
    return mod;
  });
};
module.exports.normalizeNativeInitialization = normalizeNativeInitialization;
