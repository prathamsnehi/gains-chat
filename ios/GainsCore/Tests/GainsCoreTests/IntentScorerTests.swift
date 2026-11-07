import Testing
@testable import GainsCore

struct IntentScorerTests {
    private let scorer = EmbeddedIntentScorer.make()

    @Test func shorthandLogsScoreAsLogs() {
        for phrase in [
            "bp 155 5",
            "incline db bp 55 7 reps",
            "squat 225 x 5",
            "rdl 185 8",
            "Close grip bench 135 7 reps",
            "Bicep curls 32.5s 6.5 reps",
            "Mid back rows 110 8 reps",
            "Batbell row 110x7",
            "Bench 225 for 5",
            "belt squat 180 6",
        ] {
            let scores = scorer.scores(for: phrase)
            #expect(scores.log > scores.question, "\(phrase) should be a log")
        }
    }

    @Test func questionsScoreAsQuestions() {
        for phrase in [
            "what was the last weight I did on the bench press",
            "how should I progress",
            "what did I last squat",
            "what did I last mid back row",
            "how should I progress on close grip bench",
        ] {
            let scores = scorer.scores(for: phrase)
            #expect(scores.question > scores.log, "\(phrase) should be a question")
        }
    }
}
