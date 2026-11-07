// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "GainsCore",
    platforms: [
        .iOS(.v16),
        .macOS(.v13),
    ],
    products: [
        .library(name: "GainsCore", targets: ["GainsCore"]),
    ],
    targets: [
        .target(name: "GainsCore"),
        .testTarget(name: "GainsCoreTests", dependencies: ["GainsCore"]),
    ]
)
