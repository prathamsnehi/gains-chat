import Foundation
import Testing
@testable import GainsCore

struct LegacyImporterTests {
    @Test func importsLiftsExercisesAndAliasesAndSkipsGoals() {
        let library = LegacyImporter.importRecords([
            LegacyRecord(
                id: "exercise-1",
                kind: "exercise",
                payload: #"{"id":"exercise-1","name":"Bench","aliases":["bench"]}"#
            ),
            LegacyRecord(
                id: "alias-1",
                kind: "alias",
                payload: #"{"exerciseId":"exercise-1","name":"bp"}"#
            ),
            LegacyRecord(
                id: "lift-1",
                kind: "lift",
                payload: #"{"id":"lift-1","exerciseId":"exercise-1","exerciseName":"Bench","weight":155,"reps":5,"unit":"lb","performedAt":"2024-05-01T12:00:00Z"}"#
            ),
            LegacyRecord(
                id: "goal-1",
                kind: "goal",
                payload: #"{"id":"goal-1","exerciseId":"exercise-1","targetOneRepMax":300}"#
            ),
        ])
        #expect(library.exercises.count == 1)
        #expect(library.exercises[0].aliases.contains("bp"))
        #expect(library.lifts.count == 1)
        #expect(library.lifts[0].weight == 155)
        #expect(library.lifts[0].reps == 5)
        #expect(library.lifts[0].exerciseName == "Bench")
    }
}
