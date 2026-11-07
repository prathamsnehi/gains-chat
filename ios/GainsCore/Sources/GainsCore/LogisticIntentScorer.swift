import Foundation

public struct LogisticIntentScorer: Sendable {
    public var logWeights: [Double]
    public var questionWeights: [Double]
    public var logBias: Double
    public var questionBias: Double

    public init(logWeights: [Double], questionWeights: [Double], logBias: Double, questionBias: Double) {
        self.logWeights = logWeights
        self.questionWeights = questionWeights
        self.logBias = logBias
        self.questionBias = questionBias
    }

    public func scores(for text: String) -> IntentScores {
        let features = NGramFeaturizer.vector(for: text)
        let logLogit = logit(features, weights: logWeights, bias: logBias)
        let questionLogit = logit(features, weights: questionWeights, bias: questionBias)
        let peak = max(logLogit, questionLogit)
        let logExp = exp(logLogit - peak)
        let questionExp = exp(questionLogit - peak)
        let total = logExp + questionExp
        return IntentScores(log: logExp / total, question: questionExp / total)
    }

    private func logit(_ features: [Double], weights: [Double], bias: Double) -> Double {
        zip(features, weights).reduce(bias) { $0 + $1.0 * $1.1 }
    }
}
