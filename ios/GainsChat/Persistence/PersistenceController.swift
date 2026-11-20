import CloudKit
import CoreData
import Foundation
import GainsCore

private final class LoadResult: @unchecked Sendable {
    var succeeded = true
}

enum StoreError: Error {
    case unreadableValue
}

final class PersistenceController {
    static let cloudContainerIdentifier = "iCloud.com.blackmaskexe.gainschat"
    let container: NSPersistentCloudKitContainer
    private let didOpen: Bool

    let localOnly: Bool
    init(inMemory: Bool = false, localDirectory: URL? = nil) {
        localOnly = inMemory || localDirectory != nil
        let model = Self.makeModel()
        container = NSPersistentCloudKitContainer(name: "GainsChat", managedObjectModel: model)
        if inMemory {
            let description = NSPersistentStoreDescription(url: URL(fileURLWithPath: "/memory/workouts"))
            description.type = NSInMemoryStoreType
            description.configuration = "Cloud"
            description.shouldAddStoreAsynchronously = false
            let local = NSPersistentStoreDescription(url: URL(fileURLWithPath: "/memory/messages"))
            local.type = NSInMemoryStoreType
            local.configuration = "Local"
            local.shouldAddStoreAsynchronously = false
            container.persistentStoreDescriptions = [description, local]
        } else {
            container.persistentStoreDescriptions = Self.storeDescriptions(localDirectory: localDirectory)
        }
        let result = LoadResult()
        container.loadPersistentStores { _, error in
            if error != nil { result.succeeded = false }
        }
        didOpen = result.succeeded
        container.viewContext.automaticallyMergesChangesFromParent = true
        container.viewContext.mergePolicy = NSMergePolicy.mergeByPropertyObjectTrump
    }

    var isOpen: Bool { didOpen }

    func loadLibrary() -> ImportedLibrary {
        let context = container.viewContext
        let exercises = (try? context.fetch(NSFetchRequest<NSManagedObject>(entityName: "Exercise"))) ?? []
        let lifts = (try? context.fetch(NSFetchRequest<NSManagedObject>(entityName: "Lift"))) ?? []
        return ImportedLibrary(
            exercises: exercises.compactMap(Self.exercise),
            lifts: lifts.compactMap(Self.lift)
        )
    }

    func loadMessages() -> [ChatMessage] {
        let request = NSFetchRequest<NSManagedObject>(entityName: "ChatLine")
        let rows = (try? container.viewContext.fetch(request)) ?? []
        return rows.compactMap(Self.message).sorted { $0.createdAt < $1.createdAt }
    }

    func save(exercise: KnownExercise) throws {
        stage(exercise: exercise)
        try commit()
    }

    private func stage(exercise: KnownExercise) {
        let context = container.viewContext
        let object = existing("Exercise", id: exercise.id) ?? NSEntityDescription.insertNewObject(forEntityName: "Exercise", into: context)
        object.setValue(exercise.id, forKey: "id")
        object.setValue(exercise.name, forKey: "name")
        object.setValue(exercise.aliases.joined(separator: "\n"), forKey: "aliases")
        object.setValue(exercise.factorsBodyweight, forKey: "factorsBodyweight")
        object.setValue(Date(), forKey: "updatedAt")
    }

    func save(lift: LiftRecord, exercise: KnownExercise? = nil) throws {
        let load = LiftLoad.effective(weight: lift.weight, snapshot: lift.bodyweightSnapshot)
        if let snapshot = lift.bodyweightSnapshot {
            guard snapshot.isFinite, snapshot > 0, load.isFinite, load > 0, lift.reps.isFinite, lift.reps > 0, lift.reps <= 100 else {
                throw StoreError.unreadableValue
            }
        } else {
            guard lift.weight.isFinite, lift.weight > 0, lift.reps.isFinite, lift.reps > 0, lift.reps <= 100 else {
                throw StoreError.unreadableValue
            }
        }
        if let exercise { stage(exercise: exercise) }
        let context = container.viewContext
        let object = existing("Lift", id: lift.id) ?? NSEntityDescription.insertNewObject(forEntityName: "Lift", into: context)
        object.setValue(lift.id, forKey: "id")
        object.setValue(lift.exerciseID, forKey: "exerciseID")
        object.setValue(lift.exerciseName, forKey: "exerciseName")
        object.setValue(lift.weight, forKey: "weight")
        object.setValue(lift.reps, forKey: "reps")
        object.setValue(lift.unit.rawValue, forKey: "unit")
        object.setValue(lift.performedAt, forKey: "performedAt")
        object.setValue(lift.bodyweightSnapshot, forKey: "bodyweightSnapshot")
        try commit()
    }

    func save(bodyweight: BodyweightReading, recordedAt: Date = .now) throws {
        guard bodyweight.weight.isFinite, bodyweight.weight > 0 else {
            throw StoreError.unreadableValue
        }
        let context = container.viewContext
        let object = existing("Athlete", id: Self.athleteID) ?? NSEntityDescription.insertNewObject(forEntityName: "Athlete", into: context)
        object.setValue(Self.athleteID, forKey: "id")
        object.setValue(bodyweight.weight, forKey: "bodyweight")
        object.setValue(bodyweight.unit.rawValue, forKey: "unit")
        let sample = NSEntityDescription.insertNewObject(forEntityName: "BodyweightSample", into: context)
        sample.setValue(UUID().uuidString, forKey: "id")
        sample.setValue(bodyweight.weight, forKey: "weight")
        sample.setValue(bodyweight.unit.rawValue, forKey: "unit")
        sample.setValue(recordedAt, forKey: "recordedAt")
        try commit()
    }

    func loadBodyweight() -> BodyweightReading? {
        guard let object = existing("Athlete", id: Self.athleteID) else { return nil }
        guard let weight = Self.doubleValue(object, key: "bodyweight"), weight > 0 else { return nil }
        let unit = WeightUnit(rawValue: object.value(forKey: "unit") as? String ?? "") ?? .lb
        return BodyweightReading(weight: weight, unit: unit)
    }

    func loadBodyweightSamples() -> [BodyweightSample] {
        let request = NSFetchRequest<NSManagedObject>(entityName: "BodyweightSample")
        let rows = (try? container.viewContext.fetch(request)) ?? []
        return rows.compactMap(Self.sample).sorted { $0.recordedAt < $1.recordedAt }
    }

    func deleteLift(id: String) throws {
        if let object = existing("Lift", id: id) {
            container.viewContext.delete(object)
            try commit()
        }
    }

    func deleteExercise(id: String) throws {
        if let object = existing("Exercise", id: id) {
            container.viewContext.delete(object)
            try commit()
        }
    }

    func deleteAll() throws {
        let context = container.viewContext
        for name in ["Exercise", "Lift", "Athlete", "BodyweightSample", "ChatLine"] {
            let request = NSFetchRequest<NSManagedObject>(entityName: name)
            let rows = try context.fetch(request)
            rows.forEach(context.delete)
        }
        try commit()
    }

    @MainActor
    func deleteCloudZone() async {
        guard !localOnly else { return }
        let zoneID = CKRecordZone.ID(zoneName: "com.apple.coredata.cloudkit.zone")
        _ = try? await CKContainer(identifier: Self.cloudContainerIdentifier).privateCloudDatabase.deleteRecordZone(withID: zoneID)
    }

    func save(message: ChatMessage) throws {
        let context = container.viewContext
        let object = existing("ChatLine", id: message.id) ?? NSEntityDescription.insertNewObject(forEntityName: "ChatLine", into: context)
        object.setValue(message.id, forKey: "id")
        object.setValue(message.role.rawValue, forKey: "role")
        object.setValue(message.storedText, forKey: "text")
        object.setValue(message.createdAt, forKey: "createdAt")
        try commit()
    }

    private func commit() throws {
        let context = container.viewContext
        do {
            try context.save()
        } catch {
            context.rollback()
            throw error
        }
    }

    func replace(message: ChatMessage) throws {
        try save(message: message)
    }

    private func existing(_ entity: String, id: String) -> NSManagedObject? {
        let request = NSFetchRequest<NSManagedObject>(entityName: entity)
        request.predicate = NSPredicate(format: "id == %@", id)
        request.fetchLimit = 1
        return try? container.viewContext.fetch(request).first
    }

    private static func exercise(_ object: NSManagedObject) -> KnownExercise? {
        guard let id = object.value(forKey: "id") as? String, let name = object.value(forKey: "name") as? String else {
            return nil
        }
        let aliases = (object.value(forKey: "aliases") as? String)?.split(separator: "\n").map(String.init) ?? []
        return KnownExercise(
            id: id,
            name: name,
            aliases: aliases.filter { !$0.isEmpty },
            factorsBodyweight: boolValue(object, key: "factorsBodyweight")
        )
    }

    private static func lift(_ object: NSManagedObject) -> LiftRecord? {
        guard
            let id = object.value(forKey: "id") as? String,
            let exerciseID = object.value(forKey: "exerciseID") as? String,
            let name = object.value(forKey: "exerciseName") as? String,
            let performedAt = object.value(forKey: "performedAt") as? Date
        else { return nil }
        let weight = doubleValue(object, key: "weight") ?? 0
        let reps = doubleValue(object, key: "reps") ?? 0
        let unit = WeightUnit(rawValue: object.value(forKey: "unit") as? String ?? "") ?? .lb
        return LiftRecord(
            id: id,
            exerciseID: exerciseID,
            exerciseName: name,
            weight: weight,
            reps: reps,
            unit: unit,
            performedAt: performedAt,
            bodyweightSnapshot: positiveDouble(object, key: "bodyweightSnapshot")
        )
    }

    private static func message(_ object: NSManagedObject) -> ChatMessage? {
        guard
            let id = object.value(forKey: "id") as? String,
            let role = ChatMessage.Role(rawValue: object.value(forKey: "role") as? String ?? ""),
            let text = object.value(forKey: "text") as? String,
            let createdAt = object.value(forKey: "createdAt") as? Date
        else { return nil }
        var message = ChatMessage(id: id, role: role, text: text, createdAt: createdAt)
        message.decodeStoredText()
        return message
    }

    private static func storeDescriptions(localDirectory: URL?) -> [NSPersistentStoreDescription] {
        let folder = localDirectory ?? FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("GainsChat", isDirectory: true)
        try? FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        let cloud = NSPersistentStoreDescription(url: folder.appendingPathComponent("Cloud.sqlite"))
        cloud.configuration = "Cloud"
        let options = NSPersistentCloudKitContainerOptions(containerIdentifier: cloudContainerIdentifier)
        options.databaseScope = .private
        if localDirectory == nil { cloud.cloudKitContainerOptions = options }
        cloud.setOption(true as NSNumber, forKey: NSPersistentHistoryTrackingKey)
        cloud.setOption(true as NSNumber, forKey: NSPersistentStoreRemoteChangeNotificationPostOptionKey)
        cloud.setOption(true as NSNumber, forKey: NSMigratePersistentStoresAutomaticallyOption)
        cloud.setOption(true as NSNumber, forKey: NSInferMappingModelAutomaticallyOption)
        cloud.shouldAddStoreAsynchronously = false
        let local = NSPersistentStoreDescription(url: folder.appendingPathComponent("Local.sqlite"))
        local.configuration = "Local"
        local.setOption(true as NSNumber, forKey: NSMigratePersistentStoresAutomaticallyOption)
        local.setOption(true as NSNumber, forKey: NSInferMappingModelAutomaticallyOption)
        local.shouldAddStoreAsynchronously = false
        return [cloud, local]
    }

    private static func makeModel() -> NSManagedObjectModel {
        let exercise = entity("Exercise", attributes: [
            string("id"), string("name"), string("aliases"), boolean("factorsBodyweight"), date("updatedAt"),
        ])
        let lift = entity("Lift", attributes: [
            string("id"), string("exerciseID"), string("exerciseName"),
            double("weight"), double("reps"), string("unit", defaultValue: "lb"), date("performedAt"),
            optionalDouble("bodyweightSnapshot"),
        ])
        let athlete = entity("Athlete", attributes: [
            string("id"), optionalDouble("bodyweight"), string("unit", defaultValue: "lb"),
        ])
        let sample = entity("BodyweightSample", attributes: [
            string("id"), double("weight"), string("unit", defaultValue: "lb"), date("recordedAt"),
        ])
        let chat = entity("ChatLine", attributes: [
            string("id"), string("role"), string("text"), date("createdAt"),
        ])
        let model = NSManagedObjectModel()
        model.entities = [exercise, lift, athlete, sample, chat]
        model.setEntities([exercise, lift, athlete, sample], forConfigurationName: "Cloud")
        model.setEntities([chat], forConfigurationName: "Local")
        return model
    }

    private static func sample(_ object: NSManagedObject) -> BodyweightSample? {
        guard
            let id = object.value(forKey: "id") as? String,
            let recordedAt = object.value(forKey: "recordedAt") as? Date,
            let weight = doubleValue(object, key: "weight"),
            weight > 0
        else { return nil }
        let unit = WeightUnit(rawValue: object.value(forKey: "unit") as? String ?? "") ?? .lb
        return BodyweightSample(id: id, weight: weight, unit: unit, recordedAt: recordedAt)
    }

    private static let athleteID = "athlete"

    private static func doubleValue(_ object: NSManagedObject, key: String) -> Double? {
        if let value = object.value(forKey: key) as? Double { return value }
        if let number = object.value(forKey: key) as? NSNumber { return number.doubleValue }
        return nil
    }

    private static func positiveDouble(_ object: NSManagedObject, key: String) -> Double? {
        guard object.value(forKey: key) != nil, let value = doubleValue(object, key: key), value > 0 else {
            return nil
        }
        return value
    }

    private static func boolValue(_ object: NSManagedObject, key: String) -> Bool {
        if let value = object.value(forKey: key) as? Bool { return value }
        if let number = object.value(forKey: key) as? NSNumber { return number.boolValue }
        return false
    }

    private static func entity(_ name: String, attributes: [NSAttributeDescription]) -> NSEntityDescription {
        let entity = NSEntityDescription()
        entity.name = name
        entity.managedObjectClassName = NSStringFromClass(NSManagedObject.self)
        entity.properties = attributes
        return entity
    }

    private static func string(_ name: String, defaultValue: String = "") -> NSAttributeDescription {
        let attribute = NSAttributeDescription()
        attribute.name = name
        attribute.attributeType = .stringAttributeType
        attribute.defaultValue = defaultValue
        attribute.isOptional = true
        return attribute
    }

    private static func double(_ name: String) -> NSAttributeDescription {
        let attribute = NSAttributeDescription()
        attribute.name = name
        attribute.attributeType = .doubleAttributeType
        attribute.defaultValue = 0
        attribute.isOptional = true
        return attribute
    }

    private static func optionalDouble(_ name: String) -> NSAttributeDescription {
        let attribute = NSAttributeDescription()
        attribute.name = name
        attribute.attributeType = .doubleAttributeType
        attribute.isOptional = true
        return attribute
    }

    private static func boolean(_ name: String) -> NSAttributeDescription {
        let attribute = NSAttributeDescription()
        attribute.name = name
        attribute.attributeType = .booleanAttributeType
        attribute.defaultValue = false
        attribute.isOptional = true
        return attribute
    }

    private static func date(_ name: String) -> NSAttributeDescription {
        let attribute = NSAttributeDescription()
        attribute.name = name
        attribute.attributeType = .dateAttributeType
        attribute.isOptional = true
        return attribute
    }
}
