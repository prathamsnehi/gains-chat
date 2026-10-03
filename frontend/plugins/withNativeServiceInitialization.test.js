const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeNativeInitialization } = require("./withNativeServiceInitialization");
const { modifySwiftAppDelegate: addFirebase } = require("../node_modules/@react-native-firebase/app/plugin/build/ios/appDelegate");
const { modifySwiftAppDelegate: addAppCheck } = require("../node_modules/@react-native-firebase/app-check/plugin/build/ios/appDelegate");

const original = `import Expo
class AppDelegate {
  func start() {
    factory.startReactNative()
  }
}`;

for (const [name, transform] of [
  ["Firebase before App Check", (source) => addAppCheck(addFirebase(source))],
  ["App Check before Firebase", (source) => addFirebase(addAppCheck(source))],
]) {
  test(`native initialization remains safe with ${name}`, () => {
    const result = normalizeNativeInitialization(transform(original));
    assert.equal(result.split("FirebaseApp.configure()").length - 1, 1);
    assert.equal(result.split("RNFBAppCheckModule.sharedInstance()").length - 1, 1);
    assert.ok(result.indexOf("RNFBAppCheckModule.sharedInstance()") < result.indexOf("FirebaseApp.configure()"));
    assert.ok(result.indexOf("FirebaseApp.configure()") < result.indexOf("factory.startReactNative()"));
    assert.equal(result.split("UIApplication.shared.registerForRemoteNotifications()").length - 1, 1);
    assert.equal(normalizeNativeInitialization(result), result);
  });
}

test("missing native plugins fail the build with a useful error", () => {
  assert.throws(() => normalizeNativeInitialization(original), /app and app-check plugins/);
});
