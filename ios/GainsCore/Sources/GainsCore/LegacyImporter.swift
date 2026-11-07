import Foundation

public enum LegacyImporter {
    public static func importRecords(_ records: [LegacyRecord]) -> ImportedLibrary {
        var exercises: [String: KnownExercise] = [:]
        var lifts: [LiftRecord] = []
        var pendingAliases: [(exerciseID: String, name: String)] = []

        for record in records {
            guard let object = jsonObject(record.payload) else { continue }
            switch record.kind {
            case "exercise":
                let id = string(object["id"]) ?? record.id
                let name = string(object["name"]) ?? ""
                guard !name.isEmpty else { continue }
                let aliases = stringArray(object["aliases"])
                exercises[id] = KnownExercise(id: id, name: name, aliases: aliases)
            case "alias":
                if let exerciseID = string(object["exerciseId"]), let name = string(object["name"]), !name.isEmpty {
                    pendingAliases.append((exerciseID, name))
                }
            case "lift":
                if let lift = lift(from: object, fallbackID: record.id) {
                    lifts.append(lift)
                }
            default:
                continue
            }
        }

        for alias in pendingAliases {
            if var exercise = exercises[alias.exerciseID] {
                if !exercise.aliases.contains(alias.name) {
                    exercise.aliases.append(alias.name)
                    exercises[alias.exerciseID] = exercise
                }
            }
        }

        return ImportedLibrary(
            exercises: exercises.values.sorted { $0.name < $1.name },
            lifts: lifts.sorted { $0.performedAt < $1.performedAt }
        )
    }

    private static func lift(from object: [String: Any], fallbackID: String) -> LiftRecord? {
        guard
            let name = string(object["exerciseName"]),
            let exerciseID = string(object["exerciseId"]),
            let weight = double(object["weight"]),
            let reps = double(object["reps"]),
            let performedAt = date(string(object["performedAt"]))
        else { return nil }
        let unit: WeightUnit = string(object["unit"]) == "kg" ? .kg : .lb
        return LiftRecord(
            id: string(object["id"]) ?? fallbackID,
            exerciseID: exerciseID,
            exerciseName: name,
            weight: weight,
            reps: Int(reps.rounded()),
            unit: unit,
            performedAt: performedAt
        )
    }

    private static func jsonObject(_ payload: String) -> [String: Any]? {
        guard let data = payload.data(using: .utf8),
              let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            return nil
        }
        return object
    }

    private static func string(_ value: Any?) -> String? {
        guard let text = value as? String, !text.isEmpty else { return nil }
        return text
    }

    private static func double(_ value: Any?) -> Double? {
        if let number = value as? Double { return number }
        if let number = value as? Int { return Double(number) }
        if let number = value as? NSNumber { return number.doubleValue }
        return nil
    }

    private static func stringArray(_ value: Any?) -> [String] {
        guard let values = value as? [Any] else { return [] }
        return values.compactMap { $0 as? String }
    }

    private static func date(_ value: String?) -> Date? {
        guard let value else { return nil }
        let fractional = ISO8601DateFormatter()
        fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let standard = ISO8601DateFormatter()
        return fractional.date(from: value) ?? standard.date(from: value)
    }
}
