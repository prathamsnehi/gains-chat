@preconcurrency import FirebaseAppCheck
@preconcurrency import FirebaseCore
import Foundation

final class AppCheckController: NSObject, AppCheckProviderFactory {
    static let shared = AppCheckController()
    private var isConfigured = false

    func prepare() -> Bool {
        if isConfigured { return FirebaseApp.app() != nil }
        guard Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist") != nil else {
            return false
        }
        AppCheck.setAppCheckProviderFactory(self)
        FirebaseApp.configure()
        isConfigured = true
        return true
    }

    func token() async throws -> String {
        try await withCheckedThrowingContinuation { continuation in
            AppCheck.appCheck().token(forcingRefresh: false) { token, error in
                if let token {
                    continuation.resume(returning: token.token)
                } else {
                    continuation.resume(throwing: error ?? URLError(.userAuthenticationRequired))
                }
            }
        }
    }

    func createProvider(with app: FirebaseApp) -> AppCheckProvider? {
        #if DEBUG
        return AppCheckDebugProvider(app: app)
        #else
        return AppAttestProvider(app: app)
        #endif
    }
}
