import CoreData
import Foundation
import GainsCore

private final class LoadResult: @unchecked Sendable {
    var succeeded = true
}

enum LegacyCloudReader {
    static func records() -> [LegacyRecord] {
        let folder = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("GainsLocalStore", isDirectory: true)
        let url = folder.appendingPathComponent("Cloud.sqlite")
        guard FileManager.default.fileExists(atPath: url.path) else { return [] }
        let model = NSManagedObjectModel()
        let entity = NSEntityDescription()
        entity.name = "CloudRecord"
        entity.managedObjectClassName = NSStringFromClass(NSManagedObject.self)
        entity.properties = ["id", "kind", "payload", "updatedAt"].map { name in
            let attribute = NSAttributeDescription()
            attribute.name = name
            attribute.attributeType = .stringAttributeType
            attribute.isOptional = true
            return attribute
        }
        model.entities = [entity]
        let container = NSPersistentContainer(name: "GainsLocalStore", managedObjectModel: model)
        let description = NSPersistentStoreDescription(url: url)
        description.shouldAddStoreAsynchronously = false
        container.persistentStoreDescriptions = [description]
        let result = LoadResult()
        container.loadPersistentStores { _, error in
            if error != nil { result.succeeded = false }
        }
        guard result.succeeded else { return [] }
        let request = NSFetchRequest<NSManagedObject>(entityName: "CloudRecord")
        let rows = (try? container.viewContext.fetch(request)) ?? []
        return rows.compactMap { row in
            guard let id = row.value(forKey: "id") as? String, let kind = row.value(forKey: "kind") as? String else {
                return nil
            }
            return LegacyRecord(id: id, kind: kind, payload: row.value(forKey: "payload") as? String ?? "")
        }
    }
}
