import ExpoModulesCore
import CoreData
import CloudKit

public class GainsLocalStoreModule: Module {
  private let store = GainsStore()

  public func definition() -> ModuleDefinition {
    Name("GainsLocalStore")

    AsyncFunction("initialize") { () throws in
      try self.store.initialize()
    }

    AsyncFunction("list") { (kind: String) throws -> [[String: String]] in
      try self.store.list(kind: kind)
    }

    AsyncFunction("upsert") { (kind: String, id: String, payload: String, updatedAt: String) throws in
      try self.store.upsert(kind: kind, id: id, payload: payload, updatedAt: updatedAt)
    }

    AsyncFunction("remove") { (kind: String, id: String) throws in
      try self.store.remove(kind: kind, id: id)
    }

    AsyncFunction("clearAll") { () throws in
      try self.store.clearAll()
    }

    AsyncFunction("getSyncStatus") { (promise: Promise) in
      CKContainer(identifier: GainsStore.cloudContainerIdentifier).accountStatus { status, error in
        let account: String
        switch status {
        case .available: account = "available"
        case .noAccount: account = "noAccount"
        case .restricted: account = "restricted"
        default: account = "couldNotDetermine"
        }
        promise.resolve([
          "icloudAccount": account,
          "cloudEnabled": status == .available && self.store.cloudEnabled && error == nil,
          "phase": self.store.syncPhase
        ])
      }
    }
  }
}

private final class GainsStore {
  static let cloudContainerIdentifier = "iCloud.com.blackmaskexe.gainschat"
  private let cloudKinds: Set<String> = ["lift", "exercise", "alias", "goal"]
  private let localKinds: Set<String> = ["chat", "pending"]
  private var container: NSPersistentCloudKitContainer?
  private var syncObserver: NSObjectProtocol?
  private let lock = NSLock()
  private(set) var cloudEnabled = false
  private var currentSyncPhase = "idle"

  var syncPhase: String {
    lock.lock()
    defer { lock.unlock() }
    return currentSyncPhase
  }

  func initialize() throws {
    lock.lock()
    defer { lock.unlock() }
    if container != nil { return }

    let model = NSManagedObjectModel()
    let cloudEntity = Self.makeEntity("CloudRecord")
    let localEntity = Self.makeEntity("LocalRecord")
    model.entities = [cloudEntity, localEntity]
    model.setEntities([cloudEntity], forConfigurationName: "Cloud")
    model.setEntities([localEntity], forConfigurationName: "Local")

    let folder = try FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
      .appendingPathComponent("GainsLocalStore", isDirectory: true)
    try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)

    let persistent = NSPersistentCloudKitContainer(name: "GainsLocalStore", managedObjectModel: model)
    let cloud = NSPersistentStoreDescription(url: folder.appendingPathComponent("Cloud.sqlite"))
    cloud.configuration = "Cloud"
    let cloudOptions = NSPersistentCloudKitContainerOptions(containerIdentifier: Self.cloudContainerIdentifier)
    cloudOptions.databaseScope = .private
    cloud.cloudKitContainerOptions = cloudOptions
    cloud.setOption(true as NSNumber, forKey: NSPersistentHistoryTrackingKey)
    cloud.setOption(true as NSNumber, forKey: NSPersistentStoreRemoteChangeNotificationPostOptionKey)
    let local = NSPersistentStoreDescription(url: folder.appendingPathComponent("Local.sqlite"))
    local.configuration = "Local"
    persistent.persistentStoreDescriptions = [cloud, local]

    var loadError: Error?
    let group = DispatchGroup()
    group.enter()
    group.enter()
    persistent.loadPersistentStores { description, error in
      if let error = error { loadError = error }
      group.leave()
    }
    group.wait()
    if let error = loadError { throw error }
    #if DEBUG
    // Populate all Core Data record types and fields in the development environment.
    // Deploy that schema in CloudKit Console before a TestFlight/App Store build.
    // Failure (including an unsigned simulator or no iCloud account) must not prevent local use.
    do {
      try persistent.initializeCloudKitSchema(options: [])
    } catch {
      let schemaError = error as NSError
      NSLog("Gains Chat development CloudKit schema initialization failed (%@:%ld).", schemaError.domain, schemaError.code)
    }
    #endif
    persistent.viewContext.automaticallyMergesChangesFromParent = true
    persistent.viewContext.mergePolicy = NSMergeByPropertyObjectTrumpMergePolicy
    syncObserver = NotificationCenter.default.addObserver(
      forName: NSPersistentCloudKitContainer.eventChangedNotification,
      object: persistent,
      queue: nil
    ) { [weak self] notification in
      guard let event = notification.userInfo?[NSPersistentCloudKitContainer.eventNotificationUserInfoKey]
        as? NSPersistentCloudKitContainer.Event else { return }
      let phase: String
      if event.endDate != nil { phase = event.succeeded ? "idle" : "failed" }
      else {
        switch event.type {
        case .setup: phase = "setup"
        case .import: phase = "importing"
        case .export: phase = "exporting"
        @unknown default: phase = "idle"
        }
      }
      guard let self = self else { return }
      self.lock.lock()
      self.currentSyncPhase = phase
      self.lock.unlock()
    }
    container = persistent
    cloudEnabled = true
  }

  private static func makeEntity(_ name: String) -> NSEntityDescription {
    let entity = NSEntityDescription()
    entity.name = name
    entity.managedObjectClassName = NSStringFromClass(NSManagedObject.self)
    entity.properties = ["id", "kind", "payload", "updatedAt"].map { property in
      let attribute = NSAttributeDescription()
      attribute.name = property
      attribute.attributeType = .stringAttributeType
      attribute.isOptional = true // CloudKit requires optional fields or defaults.
      return attribute
    }
    return entity
  }

  private func entityName(_ kind: String) throws -> String {
    if cloudKinds.contains(kind) { return "CloudRecord" }
    if localKinds.contains(kind) { return "LocalRecord" }
    throw StoreError.invalidKind(kind)
  }

  private func context() throws -> NSManagedObjectContext {
    try initialize()
    guard let context = container?.viewContext else { throw StoreError.unavailable }
    return context
  }

  func list(kind: String) throws -> [[String: String]] {
    let entity = try entityName(kind)
    let context = try context()
    var result: [[String: String]] = []
    var caught: Error?
    context.performAndWait {
      do {
        let request = NSFetchRequest<NSManagedObject>(entityName: entity)
        request.predicate = NSPredicate(format: "kind == %@", kind)
        let objects = try context.fetch(request)
        let records: [[String: String]] = objects.compactMap { object in
          guard let id = object.value(forKey: "id") as? String,
                let payload = object.value(forKey: "payload") as? String else { return nil }
          return ["id": id, "kind": kind, "payload": payload, "updatedAt": object.value(forKey: "updatedAt") as? String ?? ""]
        }
        // CloudKit may import the same stable ID from two devices before either sees the other.
        // Prefer the newest value while retaining the stable ID as the application identity.
        result = Array(Dictionary(records.map { ($0["id"]!, $0) }, uniquingKeysWith: { first, second in
          (first["updatedAt"] ?? "") >= (second["updatedAt"] ?? "") ? first : second
        }).values)
      } catch { caught = error }
    }
    if let caught = caught { throw caught }
    return result
  }

  func upsert(kind: String, id: String, payload: String, updatedAt: String) throws {
    guard !id.isEmpty, !payload.isEmpty else { throw StoreError.invalidRecord }
    let entity = try entityName(kind)
    let context = try context()
    var caught: Error?
    context.performAndWait {
      do {
        let matches = try self.matches(context, entity: entity, kind: kind, id: id)
        let object = matches.first ?? NSEntityDescription.insertNewObject(forEntityName: entity, into: context)
        for duplicate in matches.dropFirst() { context.delete(duplicate) }
        object.setValue(id, forKey: "id")
        object.setValue(kind, forKey: "kind")
        object.setValue(payload, forKey: "payload")
        object.setValue(updatedAt, forKey: "updatedAt")
        try context.save()
      } catch { caught = error }
    }
    if let caught = caught { throw caught }
  }

  func remove(kind: String, id: String) throws {
    let entity = try entityName(kind)
    let context = try context()
    var caught: Error?
    context.performAndWait {
      do {
        let matches = try self.matches(context, entity: entity, kind: kind, id: id)
        for object in matches { context.delete(object) }
        if !matches.isEmpty {
          try context.save()
        }
      } catch { caught = error }
    }
    if let caught = caught { throw caught }
  }

  func clearAll() throws {
    let context = try context()
    var caught: Error?
    context.performAndWait {
      do {
        for entity in ["CloudRecord", "LocalRecord"] {
          let objects = try context.fetch(NSFetchRequest<NSManagedObject>(entityName: entity))
          for object in objects { context.delete(object) }
        }
        try context.save()
      } catch { caught = error }
    }
    if let caught = caught { throw caught }
  }

  private func existing(_ context: NSManagedObjectContext, entity: String, kind: String, id: String) throws -> NSManagedObject? {
    return try matches(context, entity: entity, kind: kind, id: id).first
  }

  private func matches(_ context: NSManagedObjectContext, entity: String, kind: String, id: String) throws -> [NSManagedObject] {
    let request = NSFetchRequest<NSManagedObject>(entityName: entity)
    request.predicate = NSPredicate(format: "kind == %@ AND id == %@", kind, id)
    return try context.fetch(request)
  }

  private enum StoreError: LocalizedError {
    case invalidKind(String)
    case invalidRecord
    case unavailable

    var errorDescription: String? {
      switch self {
      case .invalidKind(let kind): return "Unsupported record kind: \(kind)"
      case .invalidRecord: return "Record needs a stable id and JSON payload"
      case .unavailable: return "Local store is unavailable"
      }
    }
  }
}
