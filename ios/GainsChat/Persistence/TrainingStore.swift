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
        Task { await refreshSyncStatus() }
    }

    func reload() {
        let library = persistence.loadLibrary()
        exercises = library.exercises.sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
        lifts = library.lifts
    }

    func apply(_ command: LogCommand) throws -> LiftRecord {
        let exerciseID = command.exerciseID ?? UUID().uuidString
        let exercise = KnownExercise(id: exerciseID, name: command.name, aliases: command.aliases)
        try persistence.save(exercise: exercise)
        if exercises.contains(where: { $0.id == exerciseID }) {
            exercises = exercises.map { $0.id == exerciseID ? exercise : $0 }
        } else {
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
        try persistence.save(lift: lift)
        lifts.append(lift)
        return lift
    }

    func update(_ lift: LiftRecord) throws {
        try persistence.save(lift: lift)
        lifts = lifts.map { $0.id == lift.id ? lift : $0 }
    }

    func delete(_ lift: LiftRecord) throws {
        try persistence.deleteLift(id: lift.id)
        lifts.removeAll { $0.id == lift.id }
    }

    func refreshSyncStatus() async {
        let identifier = PersistenceController.cloudContainerIdentifier
        let status = (try? await CKContainer(identifier: identifier).accountStatus()) ?? .couldNotDetermine
        syncSummary = Self.summary(for: status)
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
        do {
            for exercise in imported.exercises where !exercises.contains(where: { $0.id == exercise.id }) {
                try persistence.save(exercise: exercise)
            }
            for lift in imported.lifts where !lifts.contains(where: { $0.id == lift.id }) {
                try persistence.save(lift: lift)
            }
        } catch {
            return
        }
        defaults.set(true, forKey: key)
        reload()
    }
}
