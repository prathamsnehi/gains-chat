import CloudKit
import Foundation
import GainsCore

@MainActor
final class TrainingStore: ObservableObject {
    @Published private(set) var exercises: [KnownExercise] = []
    @Published private(set) var lifts: [LiftRecord] = []
    @Published private(set) var bodyweight: BodyweightReading?
    @Published private(set) var syncSummary = "Checking iCloud…"

    @Published var unit: WeightUnit { didSet { defaults.set(unit.rawValue, forKey: "displayUnit") } }
    @Published var formula: MaxFormula { didSet { defaults.set(formula.rawValue, forKey: "maxFormula") } }
    @Published private var visits: [String: Double]
    private func score(_ date: Date) -> Double {
        exp(-max(0, Date().timeIntervalSince(date)) / (86400 * 30))
    }

    func viewed(_ id: String) {
        // Decayed view counts are stored relative to a fixed reference date.
        visits[id, default: 0] += exp(Date().timeIntervalSinceReferenceDate / (86400 * 30))
        defaults.set(visits, forKey: "exerciseVisits")
    }

    var suggested: [KnownExercise] {
        var scores = visits.mapValues { $0 * exp(-Date().timeIntervalSinceReferenceDate / (86400 * 30)) }
        for set in lifts { scores[set.exerciseID, default: 0] += 3 * score(set.performedAt) }
        return Array(exercises.filter { scores[$0.id, default: 0] > 0 }
            .sorted { scores[$0.id, default: 0] > scores[$1.id, default: 0] }.prefix(3))
    }

    func history(_ id: String) -> [LiftRecord] {
        lifts.filter { $0.exerciseID == id }.sorted {
            $0.performedAt == $1.performedAt ? $0.id > $1.id : $0.performedAt > $1.performedAt
        }
    }

    func points(_ id: String, range: ChartRange) -> [ChartPoint] {
        history(id).reversed().filter { range.contains($0.performedAt) }.compactMap {
            guard let value = $0.estimate(unit: unit, formula: formula) else { return nil }
            return ChartPoint(id: $0.id, performedAt: $0.performedAt, estimatedOneRepMax: value, unit: unit)
        }
    }

    let persistence: PersistenceController
    let defaults: UserDefaults

    init(persistence: PersistenceController = PersistenceController(), defaults: UserDefaults = .standard) {
        self.persistence = persistence
        self.defaults = defaults
        unit = WeightUnit(rawValue: defaults.string(forKey: "displayUnit") ?? "") ?? .lb
        formula = MaxFormula(rawValue: defaults.string(forKey: "maxFormula") ?? "") ?? .epley
        visits = defaults.dictionary(forKey: "exerciseVisits") as? [String: Double] ?? [:]
        reload()
        if !persistence.localOnly { importLegacyIfNeeded() }
        Task { await refreshSyncStatus() }
    }

    func reload() {
        let library = persistence.loadLibrary()
        exercises = library.exercises.sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
        lifts = library.lifts
        bodyweight = persistence.loadBodyweight()
    }

    func apply(_ command: LogCommand, operationID: String = UUID().uuidString, date: Date = .now) throws -> LiftRecord {
        if let saved = lifts.first(where: { $0.id == operationID }) { return saved }
        let exerciseID = command.exerciseID ?? UUID().uuidString
        let previous = exercises.first { $0.id == exerciseID }
        let exercise = KnownExercise(
            id: exerciseID,
            name: command.name,
            aliases: command.aliases,
            factorsBodyweight: previous?.factorsBodyweight ?? false
        )
        let lift = LiftRecord(
            id: operationID,
            exerciseID: exerciseID,
            exerciseName: command.name,
            weight: command.weight,
            reps: command.reps,
            unit: command.unit,
            performedAt: date,
            bodyweightSnapshot: command.bodyweightSnapshot
        )
        try persistence.save(lift: lift, exercise: exercise)
        if exercises.contains(where: { $0.id == exerciseID }) {
            exercises = exercises.map { $0.id == exerciseID ? exercise : $0 }
        } else {
            exercises.append(exercise)
            exercises.sort { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
        }
        lifts.append(lift)
        return lift
    }

    func save(bodyweight reading: BodyweightReading) throws {
        try persistence.save(bodyweight: reading)
        bodyweight = reading
    }

    func addExercise(name: String, factorsBodyweight: Bool) throws {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        if let existing = exercises.first(where: { $0.name.caseInsensitiveCompare(trimmed) == .orderedSame }) {
            var updated = existing
            updated.factorsBodyweight = factorsBodyweight
            try persistence.save(exercise: updated)
            exercises = exercises.map { $0.id == updated.id ? updated : $0 }
            return
        }
        let exercise = KnownExercise(
            id: UUID().uuidString,
            name: trimmed,
            aliases: [trimmed.lowercased()],
            factorsBodyweight: factorsBodyweight
        )
        try persistence.save(exercise: exercise)
        exercises.append(exercise)
        exercises.sort { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
    }

    func setFactorsBodyweight(_ factors: Bool, exerciseID: String) throws {
        guard var exercise = exercises.first(where: { $0.id == exerciseID }) else { return }
        exercise.factorsBodyweight = factors
        try persistence.save(exercise: exercise)
        exercises = exercises.map { $0.id == exerciseID ? exercise : $0 }
    }

    func deleteExercise(id: String) throws {
        for lift in lifts where lift.exerciseID == id {
            try persistence.deleteLift(id: lift.id)
        }
        try persistence.deleteExercise(id: id)
        lifts.removeAll { $0.exerciseID == id }
        exercises.removeAll { $0.id == id }
    }

    func deleteAll() throws {
        try persistence.deleteAll()
        exercises = []
        lifts = []
        bodyweight = nil
        visits = [:]
        defaults.removeObject(forKey: "exerciseVisits")
    }

    func update(_ lift: LiftRecord) throws {
        try persistence.save(lift: lift)
        if let index = lifts.firstIndex(where: { $0.id == lift.id }) { lifts[index] = lift } else { lifts.append(lift) }
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
