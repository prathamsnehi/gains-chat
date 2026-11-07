import Foundation

public enum EmbeddedIntentScorer {
    public static func make() -> LogisticIntentScorer {
        LogisticIntentScorer(
            logWeights: IntentWeights.log,
            questionWeights: IntentWeights.question,
            logBias: IntentWeights.logBias,
            questionBias: IntentWeights.questionBias
        )
    }
}
