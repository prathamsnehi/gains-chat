import SwiftUI

@main
struct GainsChatApp: App {
    var body: some Scene {
        WindowGroup {
            #if DEBUG
            if ProcessInfo.processInfo.arguments.contains("--workout-ui-test") {
                RootNavigationView(training: TrainingStore(
                    persistence: PersistenceController(localDirectory: FileManager.default.temporaryDirectory.appendingPathComponent("GainsChatUITest")),
                    defaults: UserDefaults(suiteName: "GainsChatUITest")!))
            } else { RootNavigationView() }
            #else
            RootNavigationView()
            #endif
        }
    }
}
