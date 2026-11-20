public struct LegacyRecord: Equatable, Sendable {
    public var id: String
    public var kind: String
    public var payload: String

    public init(id: String, kind: String, payload: String) {
        self.id = id
        self.kind = kind
        self.payload = payload
    }
}
