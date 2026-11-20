@preconcurrency import CoreML
import Foundation
import GainsCore

final class CoreMLIntentScorer {
    private let model: MLModel?
    private let fallback = EmbeddedIntentScorer.make()

    init(model: MLModel? = CoreMLIntentScorer.loadBundledModel()) {
        self.model = model
    }

    func scores(for text: String) -> IntentScores {
        guard let model else { return fallback.scores(for: text) }
        guard
            let features = try? MLMultiArray(shape: [NSNumber(value: NGramFeaturizer.dimension)], dataType: .double)
        else {
            return fallback.scores(for: text)
        }
        let vector = NGramFeaturizer.vector(for: text)
        for (index, value) in vector.enumerated() {
            features[index] = NSNumber(value: value)
        }
        guard
            let provider = try? MLDictionaryFeatureProvider(dictionary: ["features": features]),
            let result = try? model.prediction(from: provider),
            let scores = result.featureValue(for: "scores")?.multiArrayValue,
            scores.count >= 2
        else {
            return fallback.scores(for: text)
        }
        let logLogit = scores[0].doubleValue
        let questionLogit = scores[1].doubleValue
        let peak = max(logLogit, questionLogit)
        let logExp = exp(logLogit - peak)
        let questionExp = exp(questionLogit - peak)
        let total = logExp + questionExp
        return IntentScores(log: logExp / total, question: questionExp / total)
    }

    private static func loadBundledModel() -> MLModel? {
        let url = Bundle.main.url(forResource: "IntentRouter", withExtension: "mlmodelc")
        return url.flatMap { try? MLModel(contentsOf: $0) }
    }
}
