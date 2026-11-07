const assert = require("node:assert/strict");

// Temporary exceptions to Expo's newest-patch recommendation. Keep these exact
// until the release-age gate permits a separately validated patch upgrade.
for (const [name, expected] of Object.entries({
  expo: "58.0.14",
  "expo-router": "58.0.23",
  "expo-font": "58.0.8",
})) {
  assert.equal(
    require(`${name}/package.json`).version,
    expected,
    `${name}: refresh the reviewed SDK patch exceptions`,
  );
}
for (const name of ["app", "app-check", "auth", "functions"]) {
  assert.equal(
    require(`@react-native-firebase/${name}/package.json`).version,
    "26.4.0",
  );
}
assert.equal(require("typescript/package.json").version, "6.0.3");
console.log(
  "Reviewed release-age exceptions match the installed Expo/Firebase versions.",
);
