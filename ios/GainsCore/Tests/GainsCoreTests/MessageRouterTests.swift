import Foundation
import Testing
@testable import GainsCore

struct MessageRouterTests {
    @Test func aClearSetLogsEvenIfTheModelThinksItIsAQuestion() {
        let route = MessageRouter.decide(text: "bp 155 5", exercises: [], lifts: [], scores: { _ in
            IntentScores(log: 0.1, question: 0.9)
        })
        guard case .log(let command) = route else {
            Issue.record("expected a log, got \(route)")
            return
        }
        #expect(command.name == "Barbell Bench Press")
        #expect(command.exerciseID == nil)
        #expect(command.weight == 155)
        #expect(command.reps == 5)
        #expect(command.unit == .lb)
    }

    @Test func twoMatchingExercisesAskInsteadOfSaving() {
        let exercises = [
            KnownExercise(id: "a", name: "Barbell Bench Press", aliases: ["bp"]),
            KnownExercise(id: "b", name: "Competition Bench Press", aliases: ["bp"]),
        ]
        let route = MessageRouter.decide(text: "bp 155 5", exercises: exercises, lifts: [], scores: { _ in
            IntentScores(log: 0.9, question: 0.1)
        })
        guard case .clarify(let message) = route else {
            Issue.record("expected clarification, got \(route)")
            return
        }
        #expect(message.contains("Barbell Bench Press"))
        #expect(message.contains("Competition Bench Press"))
    }

    @Test func historyQuestionStaysOnTheQuestionPath() {
        let exercise = KnownExercise(id: "bench", name: "Barbell Bench Press", aliases: ["bp"])
        let lift = LiftRecord(
            id: "lift-1",
            exerciseID: "bench",
            exerciseName: "Barbell Bench Press",
            weight: 165,
            reps: 5,
            unit: .lb,
            performedAt: Date(timeIntervalSince1970: 1_700_000_000)
        )
        let route = MessageRouter.decide(
            text: "what was the last weight I did on bp",
            exercises: [exercise],
            lifts: [lift],
            scores: { _ in IntentScores(log: 0.2, question: 0.8) }
        )
        guard case .question(_, let snippets) = route else {
            Issue.record("expected a question, got \(route)")
            return
        }
        #expect(snippets.count == 1)
        #expect(snippets[0].weight == 165)
        #expect(snippets[0].reps == 5)
    }

    @Test func aQuestionAboutACustomExerciseDoesNotBorrowAnotherLift() {
        let mid = KnownExercise(id: "mid", name: "Mid Back Row", aliases: ["mid back row"])
        let bench = KnownExercise(id: "bench", name: "Barbell Bench Press", aliases: ["bp"])
        let midLift = LiftRecord(
            id: "mid-lift",
            exerciseID: "mid",
            exerciseName: "Mid Back Row",
            weight: 110,
            reps: 8,
            unit: .lb,
            performedAt: Date(timeIntervalSince1970: 1_700_000_000)
        )
        let benchLift = LiftRecord(
            id: "bench-lift",
            exerciseID: "bench",
            exerciseName: "Barbell Bench Press",
            weight: 155,
            reps: 5,
            unit: .lb,
            performedAt: Date(timeIntervalSince1970: 1_700_000_100)
        )
        let route = MessageRouter.decide(
            text: "what did I last mid back row",
            exercises: [mid, bench],
            lifts: [midLift, benchLift],
            scores: { _ in IntentScores(log: 0.2, question: 0.8) }
        )
        guard case .question(_, let snippets) = route else {
            Issue.record("expected a question, got \(route)")
            return
        }
        #expect(snippets.count == 1)
        #expect(snippets[0].exerciseName == "Mid Back Row")
        #expect(snippets[0].weight == 110)
    }
}
