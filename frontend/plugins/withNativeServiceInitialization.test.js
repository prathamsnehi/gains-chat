const test = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeNativeInitialization,
} = require("./withNativeServiceInitialization");

const oldTemplate = `import Expo
class AppDelegate {
  func start() {
    INITIALIZATION
    factory.startReactNative()
  }
}`;
const sceneTemplate = `internal import Expo
class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {
  func application() -> Bool {
    let factory = ExpoReactNativeFactory(delegate: delegate)
    reactNativeFactory = factory
    INITIALIZATION
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
}`;

for (const [name, template, initialization] of [
  [
    "older duplicated Firebase initialization",
    oldTemplate,
    "FirebaseApp.configure()\n    RNFBAppCheckModule.sharedInstance()\n    FirebaseApp.configure()",
  ],
  [
    "older App Check initialization first",
    oldTemplate,
    "RNFBAppCheckModule.sharedInstance()\n    FirebaseApp.configure()",
  ],
  ["SDK 58 scene lifecycle before upstream supports it", sceneTemplate, ""],
  [
    "SDK 58 with future upstream initialization",
    sceneTemplate,
    "RNFBAppCheckModule.sharedInstance()\n    FirebaseApp.configure()",
  ],
]) {
  test(`initialization is ordered and idempotent: ${name}`, () => {
    const result = normalizeNativeInitialization(
      template.replace("INITIALIZATION", initialization),
    );
    assert.equal(result.split("FirebaseApp.configure()").length - 1, 1);
    assert.equal(
      result.split("RNFBAppCheckModule.sharedInstance()").length - 1,
      1,
    );
    assert.equal(
      result.split("UIApplication.shared.registerForRemoteNotifications()")
        .length - 1,
      1,
    );
    assert.ok(
      result.indexOf("RNFBAppCheckModule.sharedInstance()") <
        result.indexOf("FirebaseApp.configure()"),
    );
    const startup = result.includes("return super.application")
      ? "return super.application"
      : "factory.startReactNative()";
    assert.ok(
      result.indexOf("FirebaseApp.configure()") < result.indexOf(startup),
    );
    assert.equal(normalizeNativeInitialization(result), result);
  });
}

test("unsupported templates and missing plugins fail with a useful error", () => {
  assert.throws(
    () =>
      normalizeNativeInitialization(oldTemplate.replace("INITIALIZATION", "")),
    /app and app-check plugins/,
  );
  assert.throws(
    () => require("./withNativeServiceInitialization")({ plugins: [] }),
    /both RNFirebase/,
  );
});
