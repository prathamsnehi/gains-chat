import CloudKit
import Foundation
import GainsCore

@MainActor
final class TrainingStore: ObservableObject {
    @Published private(set) var exercises: [KnownExercise] = []
    @Published private(set) var lifts: [LiftRecord] = []
    @Published private(set) var syncSummary = "Checking iCloud…"

    let persistence: PersistenceController
    private let defaults: UserDefaults

    init(persistence: PersistenceController = PersistenceController(), defaults: UserDefaults = .standard) {
        self.persistence = persistence
        self.defaults = defaults
        reload()
        importLegacyIfNeeded()
        refreshSyncStatus()
    }

    func reload() {
        let library = persistence.loadLibrary()
        exercises = library.exercises.sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
        lifts = library.lifts
    }

    func apply(_ command: LogCommand) -> LiftRecord {
        let exerciseID: String
        if let existing = command.exerciseID {
            exerciseID = existing
            let current = exercises.first { $0.id == existing }
            let exercise = KnownExercise(id: existing, name: command.name, aliases: command.aliases)
            persistence.save(exercise: exercise)
            if current == nil {
                exercises.append(exercise)
            } else {
                exercises = exercises.map { $0.id == existing ? exercise : $0 }
            }
        } else {
            exerciseID = UUID().uuidString
            let exercise = KnownExercise(id: exerciseID, name: command.name, aliases: command.aliases)
            persistence.save(exercise: exercise)
            exercises.append(exercise)
            exercises.sort { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
        }
        let lift = LiftRecord(
            id: UUID().uuidString,
            exerciseID: exerciseID,
            exerciseName: command.name,
            weight: command.weight,
            reps: command.reps,
            unit: command.unit,
            performedAt: Date()
        )
        persistence.save(lift: lift)
        lifts.append(lift)
        return lift
    }

    func update(_ lift: LiftRecord) {
        persistence.save(lift: lift)
        lifts = lifts.map { $0.id == lift.id ? lift : $0 }
    }

    func delete(_ lift: LiftRecord) {
        persistence.deleteLift(id: lift.id)
        lifts.removeAll { $0.id == lift.id }
    }

    func refreshSyncStatus() {
        let identifier = PersistenceController.cloudContainerIdentifier
        Task {
            let status = (try? await CKContainer(identifier: identifier).accountStatus()) ?? .couldNotDetermine
            syncSummary = Self.summary(for: status)
        }
    }

    private static func summary(for status: CKAccountStatus) -> String {
        switch status {
        case .available:
            "iCloud is available. Lifts and exercises sync in your private database."
        case .noAccount:
            "No iCloud account is signed in. Sets stay on this iPhone."
        case .restricted:
            "iCloud is restricted on this iPhone."
        case .couldNotDetermine, .temporarilyUnavailable:
            "iCloud status could not be determined."
        @unknown default:
            "iCloud status could not be determined."
        }
    }

    private func importLegacyIfNeeded() {
        let key = "didImportLegacyCloudRecords"
        guard !defaults.bool(forKey: key) else { return }
        let imported = LegacyImporter.importRecords(LegacyCloudReader.records())
        guard !imported.exercises.isEmpty || !imported.lifts.isEmpty else {
            defaults.set(true, forKey: key)
            return
        }
        for exercise in imported.exercises where !exercises.contains(where: { $0.id == exercise.id }) {
            persistence.save(exercise: exercise)
        }
        for lift in imported.lifts where !lifts.contains(where: { $0.id == lift.id }) {
            persistence.save(lift: lift)
        }
        defaults.set(true, forKey: key)
        reload()
    }
}
