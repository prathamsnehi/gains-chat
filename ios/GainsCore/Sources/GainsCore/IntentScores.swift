public struct IntentScores: Equatable, Sendable {
    public var log: Double
    public var question: Double

    public init(log: Double, question: Double) {
        self.log = log
        self.question = question
    }
}
