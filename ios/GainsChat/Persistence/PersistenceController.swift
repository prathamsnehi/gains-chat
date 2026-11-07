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

    init(inMemory: Bool = false) {
        let model = Self.makeModel()
        container = NSPersistentCloudKitContainer(name: "GainsChat", managedObjectModel: model)
        if inMemory {
            let description = NSPersistentStoreDescription()
            description.type = NSInMemoryStoreType
            description.configuration = "Cloud"
            description.shouldAddStoreAsynchronously = false
            let local = NSPersistentStoreDescription()
            local.type = NSInMemoryStoreType
            local.configuration = "Local"
            local.shouldAddStoreAsynchronously = false
            container.persistentStoreDescriptions = [description, local]
        } else {
            container.persistentStoreDescriptions = Self.storeDescriptions()
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
        let context = container.viewContext
        let object = existing("Exercise", id: exercise.id) ?? NSEntityDescription.insertNewObject(forEntityName: "Exercise", into: context)
        object.setValue(exercise.id, forKey: "id")
        object.setValue(exercise.name, forKey: "name")
        object.setValue(exercise.aliases.joined(separator: "\n"), forKey: "aliases")
        object.setValue(Date(), forKey: "updatedAt")
        try commit()
    }

    func save(lift: LiftRecord) throws {
        guard lift.weight.isFinite, lift.weight > 0, lift.reps.isFinite, lift.reps > 0, lift.reps <= 100 else {
            throw StoreError.unreadableValue
        }
        let context = container.viewContext
        let object = existing("Lift", id: lift.id) ?? NSEntityDescription.insertNewObject(forEntityName: "Lift", into: context)
        object.setValue(lift.id, forKey: "id")
        object.setValue(lift.exerciseID, forKey: "exerciseID")
        object.setValue(lift.exerciseName, forKey: "exerciseName")
        object.setValue(lift.weight, forKey: "weight")
        object.setValue(lift.reps, forKey: "reps")
        object.setValue(lift.unit.rawValue, forKey: "unit")
        object.setValue(lift.performedAt, forKey: "performedAt")
        try commit()
    }

    func deleteLift(id: String) throws {
        if let object = existing("Lift", id: id) {
            container.viewContext.delete(object)
            try commit()
        }
    }

    func save(message: ChatMessage) throws {
        let context = container.viewContext
        let object = existing("ChatLine", id: message.id) ?? NSEntityDescription.insertNewObject(forEntityName: "ChatLine", into: context)
        object.setValue(message.id, forKey: "id")
        object.setValue(message.role.rawValue, forKey: "role")
        object.setValue(message.text, forKey: "text")
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
        return KnownExercise(id: id, name: name, aliases: aliases.filter { !$0.isEmpty })
    }

    private static func lift(_ object: NSManagedObject) -> LiftRecord? {
        guard
            let id = object.value(forKey: "id") as? String,
            let exerciseID = object.value(forKey: "exerciseID") as? String,
            let name = object.value(forKey: "exerciseName") as? String,
            let performedAt = object.value(forKey: "performedAt") as? Date
        else { return nil }
        let weight = object.value(forKey: "weight") as? Double ?? 0
        let reps = object.value(forKey: "reps") as? Double ?? 0
        let unit = WeightUnit(rawValue: object.value(forKey: "unit") as? String ?? "") ?? .lb
        return LiftRecord(
            id: id,
            exerciseID: exerciseID,
            exerciseName: name,
            weight: weight,
            reps: reps,
            unit: unit,
            performedAt: performedAt
        )
    }

    private static func message(_ object: NSManagedObject) -> ChatMessage? {
        guard
            let id = object.value(forKey: "id") as? String,
            let role = ChatMessage.Role(rawValue: object.value(forKey: "role") as? String ?? ""),
            let text = object.value(forKey: "text") as? String,
            let createdAt = object.value(forKey: "createdAt") as? Date
        else { return nil }
        return ChatMessage(id: id, role: role, text: text, createdAt: createdAt)
    }

    private static func storeDescriptions() -> [NSPersistentStoreDescription] {
        let folder = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("GainsChat", isDirectory: true)
        try? FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        let cloud = NSPersistentStoreDescription(url: folder.appendingPathComponent("Cloud.sqlite"))
        cloud.configuration = "Cloud"
        let options = NSPersistentCloudKitContainerOptions(containerIdentifier: cloudContainerIdentifier)
        options.databaseScope = .private
        cloud.cloudKitContainerOptions = options
        cloud.setOption(true as NSNumber, forKey: NSPersistentHistoryTrackingKey)
        cloud.setOption(true as NSNumber, forKey: NSPersistentStoreRemoteChangeNotificationPostOptionKey)
        cloud.shouldAddStoreAsynchronously = false
        let local = NSPersistentStoreDescription(url: folder.appendingPathComponent("Local.sqlite"))
        local.configuration = "Local"
        local.shouldAddStoreAsynchronously = false
        return [cloud, local]
    }

    private static func makeModel() -> NSManagedObjectModel {
        let exercise = entity("Exercise", attributes: [
            string("id"), string("name"), string("aliases"), date("updatedAt"),
        ])
        let lift = entity("Lift", attributes: [
            string("id"), string("exerciseID"), string("exerciseName"),
            double("weight"), double("reps"), string("unit", defaultValue: "lb"), date("performedAt"),
        ])
        let chat = entity("ChatLine", attributes: [
            string("id"), string("role"), string("text"), date("createdAt"),
        ])
        let model = NSManagedObjectModel()
        model.entities = [exercise, lift, chat]
        model.setEntities([exercise, lift], forConfigurationName: "Cloud")
        model.setEntities([chat], forConfigurationName: "Local")
        return model
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

    private static func date(_ name: String) -> NSAttributeDescription {
        let attribute = NSAttributeDescription()
        attribute.name = name
        attribute.attributeType = .dateAttributeType
        attribute.isOptional = true
        return attribute
    }
}
