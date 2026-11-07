#!/usr/bin/env node
'use strict';

// Prepare a minimal native simulator app without Expo, CocoaPods, or Metro.
// Default is read-only; --write generates only workspace-ignored Xcode sources.
// Build/install/launch are separate reviewed commands. The app reads account
// status on launch and initializes Development schema only after a button tap.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'frontend/ios/schema-initializer');
const flags = process.argv.slice(2);
if (flags.length > 1 || (flags.length && flags[0] !== '--write')) throw new Error('Use no flags or --write.');
const expo = JSON.parse(fs.readFileSync(path.join(root, 'frontend/app.json'), 'utf8')).expo;
if (expo.ios.bundleIdentifier !== 'com.blackmaskexe.gainschat' || expo.ios.appleTeamId !== 'T296YJXC87') {
  throw new Error('Unexpected bundle/team; review required.');
}
const sourcePath = path.join(root, 'frontend/modules/gains-local-store/ios/GainsLocalStoreModule.swift');
const source = fs.readFileSync(sourcePath, 'utf8');
const modelStart = source.indexOf('    let model = NSManagedObjectModel()');
const modelEnd = source.indexOf('    let folder =', modelStart);
if (modelStart < 0 || modelEnd < 0) throw new Error('Native model source layout changed; review required.');
const model = source.slice(modelStart, modelEnd).trimEnd();
const methodStart = source.indexOf('  private static func makeEntity(');
const braceStart = source.indexOf('{', methodStart);
let depth = 1;
let methodEnd = braceStart + 1;
for (; methodEnd < source.length && depth; methodEnd++) {
  if (source[methodEnd] === '{') depth++;
  else if (source[methodEnd] === '}') depth--;
}
if (methodStart < 0 || braceStart < 0 || depth) throw new Error('Native entity source layout changed; review required.');
const entityFactory = source.slice(methodStart, methodEnd);
const swift = `import UIKit
import CoreData
import CloudKit

@main
final class SchemaApp: UIResponder, UIApplicationDelegate {
  func application(_ application: UIApplication, configurationForConnecting session: UISceneSession, options: UIScene.ConnectionOptions) -> UISceneConfiguration {
    let configuration = UISceneConfiguration(name: "DefaultConfiguration", sessionRole: session.role)
    configuration.delegateClass = SchemaSceneDelegate.self
    return configuration
  }
}

final class SchemaSceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?
  private let status = UILabel()
  private let button = UIButton(type: .system)
  private var persistent: NSPersistentCloudKitContainer?
  private let containerID = "iCloud.com.blackmaskexe.gainschat"

  func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options: UIScene.ConnectionOptions) {
    guard let windowScene = scene as? UIWindowScene else { return }
    let controller = UIViewController()
    controller.view.backgroundColor = .systemBackground
    status.numberOfLines = 0
    status.textAlignment = .center
    status.text = "Gains Chat development schema initializer\\nChecking simulator iCloud account…"
    button.setTitle("Initialize development schema", for: .normal)
    button.isEnabled = false
    button.addTarget(self, action: #selector(initializeSchema), for: .touchUpInside)
    let stack = UIStackView(arrangedSubviews: [status, button])
    stack.axis = .vertical
    stack.spacing = 24
    stack.translatesAutoresizingMaskIntoConstraints = false
    controller.view.addSubview(stack)
    NSLayoutConstraint.activate([
      stack.centerYAnchor.constraint(equalTo: controller.view.centerYAnchor),
      stack.leadingAnchor.constraint(equalTo: controller.view.leadingAnchor, constant: 28),
      stack.trailingAnchor.constraint(equalTo: controller.view.trailingAnchor, constant: -28)
    ])
    window = UIWindow(windowScene: windowScene)
    window?.rootViewController = controller
    window?.makeKeyAndVisible()
    CKContainer(identifier: containerID).accountStatus { state, error in
      DispatchQueue.main.async {
        if state == .available && error == nil {
          self.status.text = "iCloud account available.\\nThis uses the exact app Core Data model and changes only the Development schema. Deploy it to Production in CloudKit Console afterward."
          self.button.isEnabled = true
        } else {
          let diagnostic = error.map { "\\(($0 as NSError).domain):\\(($0 as NSError).code)" } ?? "status=\\(state.rawValue)"
          self.status.text = "Sign in to iCloud in this simulator’s Settings and enable iCloud Drive, then relaunch.\\n\\(diagnostic)"
          NSLog("Gains schema account unavailable: %@", diagnostic)
        }
      }
    }
  }

  @objc private func initializeSchema() {
    button.isEnabled = false
    status.text = "Initializing Development schema…"
    DispatchQueue.global(qos: .userInitiated).async {
      do {
        let folder = try FileManager.default.url(for: .documentDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
        let persistent = NSPersistentCloudKitContainer(name: "GainsSchemaInitializer", managedObjectModel: Self.makeModel())
        let description = NSPersistentStoreDescription(url: folder.appendingPathComponent("GainsSchemaInitializer.sqlite"))
        description.configuration = "Cloud"
        description.shouldAddStoreAsynchronously = false
        let options = NSPersistentCloudKitContainerOptions(containerIdentifier: self.containerID)
        options.databaseScope = .private
        description.cloudKitContainerOptions = options
        description.setOption(true as NSNumber, forKey: NSPersistentHistoryTrackingKey)
        description.setOption(true as NSNumber, forKey: NSPersistentStoreRemoteChangeNotificationPostOptionKey)
        persistent.persistentStoreDescriptions = [description]
        var loadError: Error?
        persistent.loadPersistentStores { _, error in loadError = error }
        if let error = loadError { throw error }
        try persistent.initializeCloudKitSchema(options: [])
        self.persistent = persistent
        NSLog("Gains Chat Development schema initialized successfully.")
        DispatchQueue.main.async { self.status.text = "Development schema initialized successfully.\\nVerify Core Data record types in CloudKit Console and deploy the schema to Production." }
      } catch {
        let diagnostic = "\\((error as NSError).domain):\\((error as NSError).code)"
        NSLog("Gains schema initialization failed: %@", diagnostic)
        DispatchQueue.main.async {
          self.status.text = "Schema initialization failed.\\n\\(diagnostic)"
          self.button.isEnabled = true
        }
      }
    }
  }

  private static func makeModel() -> NSManagedObjectModel {
${model}
    return model
  }

${entityFactory}
}
`;
const entitlements = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>application-identifier</key><string>T296YJXC87.com.blackmaskexe.gainschat</string>
<key>com.apple.developer.team-identifier</key><string>T296YJXC87</string>
<key>com.apple.developer.icloud-services</key><array><string>CloudKit</string></array>
<key>com.apple.developer.icloud-container-identifiers</key><array><string>iCloud.com.blackmaskexe.gainschat</string></array>
<key>com.apple.developer.icloud-container-environment</key><string>Development</string>
<key>aps-environment</key><string>development</string>
<key>get-task-allow</key><true/>
</dict></plist>
`;
const infoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleDevelopmentRegion</key><string>en</string>
<key>CFBundleDisplayName</key><string>Gains Schema</string>
<key>CFBundleExecutable</key><string>$(EXECUTABLE_NAME)</string>
<key>CFBundleIdentifier</key><string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
<key>CFBundleInfoDictionaryVersion</key><string>6.0</string>
<key>CFBundleName</key><string>$(PRODUCT_NAME)</string>
<key>CFBundlePackageType</key><string>APPL</string>
<key>CFBundleShortVersionString</key><string>1.0</string>
<key>CFBundleVersion</key><string>1</string>
<key>LSRequiresIPhoneOS</key><true/>
<key>UILaunchScreen</key><dict/>
<key>UISupportedInterfaceOrientations</key><array><string>UIInterfaceOrientationPortrait</string></array>
<key>UIApplicationSceneManifest</key><dict>
  <key>UIApplicationSupportsMultipleScenes</key><false/>
  <key>UISceneConfigurations</key><dict>
    <key>UIWindowSceneSessionRoleApplication</key><array><dict>
      <key>UISceneConfigurationName</key><string>DefaultConfiguration</string>
      <key>UISceneDelegateClassName</key><string>$(PRODUCT_MODULE_NAME).SchemaSceneDelegate</string>
    </dict></array>
  </dict>
</dict>
</dict></plist>
`;
const pbx = `// !$*UTF8*$!
{ archiveVersion = 1; classes = {}; objectVersion = 56; objects = {
 A00000000000000000000001 = {isa = PBXProject; attributes = {LastUpgradeCheck = 1500; TargetAttributes = {A00000000000000000000002 = {DevelopmentTeam = T296YJXC87; }; }; }; buildConfigurationList = A00000000000000000000003; compatibilityVersion = "Xcode 14.0"; developmentRegion = en; hasScannedForEncodings = 0; knownRegions = (en,Base,); mainGroup = A00000000000000000000004; productRefGroup = A00000000000000000000005; projectDirPath = ""; projectRoot = ""; targets = (A00000000000000000000002,); };
 A00000000000000000000002 = {isa = PBXNativeTarget; buildConfigurationList = A00000000000000000000006; buildPhases = (A00000000000000000000007,A00000000000000000000008,A00000000000000000000009,); buildRules = (); dependencies = (); name = CloudKitSchema; productName = CloudKitSchema; productReference = A00000000000000000000010; productType = "com.apple.product-type.application"; };
 A00000000000000000000003 = {isa = XCConfigurationList; buildConfigurations = (A00000000000000000000011,); defaultConfigurationIsVisible = 0; defaultConfigurationName = Debug; };
 A00000000000000000000004 = {isa = PBXGroup; children = (A00000000000000000000012,A00000000000000000000013,A00000000000000000000005,); sourceTree = "<group>"; };
 A00000000000000000000005 = {isa = PBXGroup; children = (A00000000000000000000010,); name = Products; sourceTree = "<group>"; };
 A00000000000000000000006 = {isa = XCConfigurationList; buildConfigurations = (A00000000000000000000014,); defaultConfigurationIsVisible = 0; defaultConfigurationName = Debug; };
 A00000000000000000000007 = {isa = PBXSourcesBuildPhase; buildActionMask = 2147483647; files = (A00000000000000000000015,); runOnlyForDeploymentPostprocessing = 0; };
 A00000000000000000000008 = {isa = PBXFrameworksBuildPhase; buildActionMask = 2147483647; files = (); runOnlyForDeploymentPostprocessing = 0; };
 A00000000000000000000009 = {isa = PBXResourcesBuildPhase; buildActionMask = 2147483647; files = (); runOnlyForDeploymentPostprocessing = 0; };
 A00000000000000000000010 = {isa = PBXFileReference; explicitFileType = wrapper.application; includeInIndex = 0; path = CloudKitSchema.app; sourceTree = BUILT_PRODUCTS_DIR; };
 A00000000000000000000011 = {isa = XCBuildConfiguration; buildSettings = {CLANG_ENABLE_MODULES = YES; IPHONEOS_DEPLOYMENT_TARGET = 15.1; SDKROOT = iphonesimulator; SWIFT_VERSION = 5.0; SWIFT_OPTIMIZATION_LEVEL = "-Onone"; }; name = Debug; };
 A00000000000000000000012 = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = SchemaApp.swift; sourceTree = "<group>"; };
 A00000000000000000000013 = {isa = PBXFileReference; lastKnownFileType = text.plist.entitlements; path = Schema.entitlements; sourceTree = "<group>"; };
 A00000000000000000000014 = {isa = XCBuildConfiguration; buildSettings = {CODE_SIGN_ENTITLEMENTS = Schema.entitlements; CODE_SIGN_IDENTITY = "-"; CODE_SIGNING_ALLOWED = YES; CODE_SIGN_STYLE = Automatic; DEVELOPMENT_TEAM = T296YJXC87; GENERATE_INFOPLIST_FILE = NO; INFOPLIST_FILE = SchemaInfo.plist; LD_RUNPATH_SEARCH_PATHS = ("$(inherited)","@executable_path/Frameworks",); PRODUCT_BUNDLE_IDENTIFIER = com.blackmaskexe.gainschat; PRODUCT_NAME = "$(TARGET_NAME)"; SUPPORTED_PLATFORMS = iphonesimulator; TARGETED_DEVICE_FAMILY = 1; SWIFT_ACTIVE_COMPILATION_CONDITIONS = DEBUG; }; name = Debug; };
 A00000000000000000000015 = {isa = PBXBuildFile; fileRef = A00000000000000000000012; };
 }; rootObject = A00000000000000000000001; }
`;
const files = new Map([['SchemaApp.swift', swift], ['Schema.entitlements', entitlements], ['SchemaInfo.plist', infoPlist], ['CloudKitSchema.xcodeproj/project.pbxproj', pbx]]);
console.log(JSON.stringify({ mode: flags[0] === '--write' ? 'write-source' : 'dry-run', output: out,
  nativeModelSource: sourcePath, nativeModelSha256: crypto.createHash('sha256').update(model + entityFactory).digest('hex'),
  files: [...files].map(([file, content]) => ({ file, bytes: Buffer.byteLength(content) })),
  bundle: expo.ios.bundleIdentifier, team: expo.ios.appleTeamId, cloudKitEnvironment: 'Development' }, null, 2));
if (flags[0] === '--write') {
  for (const [file, content] of files) {
    const target = path.join(out, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
}
