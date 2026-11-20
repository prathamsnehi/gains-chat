public enum WeightUnit: String, Codable, Equatable, Sendable {
    case lb
    case kg

    public var label: String {
        switch self {
        case .lb: "lb"
        case .kg: "kg"
        }
    }
}
