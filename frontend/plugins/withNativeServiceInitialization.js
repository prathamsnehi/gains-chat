const { withAppDelegate } = require("@expo/config-plugins");

// Run as an AppDelegate mod, after RNFirebase's dangerous mods have edited the file.
// RNFirebase 26.4's plugins can produce duplicate configure calls in one order.
function normalizeNativeInitialization(contents) {
  const initialization = /^[ \t]*(?:FirebaseApp\.configure\(\)|RNFBAppCheckModule\.sharedInstance\(\))[ \t]*;?[ \t]*(?:\r?\n|$)/gm;
  if (!contents.includes("RNFBAppCheckModule.sharedInstance()") ||
      !contents.includes("FirebaseApp.configure()")) {
    throw new Error("RNFirebase app and app-check plugins must initialize the Swift AppDelegate before Gains Chat's final plugin.");
  }
  let inserted = false;
  let result = contents.replace(initialization, (line) => {
    if (inserted) return "";
    inserted = true;
    const indent = line.match(/^[ \t]*/)[0];
    return `${indent}RNFBAppCheckModule.sharedInstance()\n${indent}FirebaseApp.configure()\n`;
  });
  if (!inserted) throw new Error("Unsupported Firebase initialization in Swift AppDelegate.");
  if (!result.includes("UIApplication.shared.registerForRemoteNotifications()")) {
    result = result.replace("FirebaseApp.configure()", "FirebaseApp.configure()\n    UIApplication.shared.registerForRemoteNotifications()");
  }
  if (!/^import UIKit[ \t]*$/m.test(result)) result = `import UIKit\n${result}`;
  return result;
}

module.exports = (config) => withAppDelegate(config, (mod) => {
  if (mod.modResults.language !== "swift") {
    throw new Error("Gains Chat's native initialization plugin requires a Swift AppDelegate.");
  }
  mod.modResults.contents = normalizeNativeInitialization(mod.modResults.contents);
  return mod;
});
module.exports.normalizeNativeInitialization = normalizeNativeInitialization;
