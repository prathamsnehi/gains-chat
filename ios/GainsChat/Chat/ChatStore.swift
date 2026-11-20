import Foundation
import GainsCore

@MainActor
final class ChatStore: ObservableObject {
    @Published private(set) var messages: [ChatMessage]
    @Published private(set) var activity: String?
    @Published var consent: Bool {
        didSet { training.defaults.set(consent, forKey: "onlineAssistant") }
    }
    @Published var requestingConsent = false
    @Published var error: String?
    private let training: TrainingStore
    private let scorer: CoreMLIntentScorer
    private let client: ChatClient
    private let appCheck: AppCheckController
    private var pendingTurn: String?
    private var started = ContinuousClock.now
    private func mark(_ event: String) {
        #if DEBUG
        let elapsed = started.duration(to: .now)
        print("GainsChat latency", event, elapsed)
        #endif
    }
    private var task: Task<Void, Never>?
    private var waitingFormID: String?
    private var formReply: CheckedContinuation<String, Never>?

    init(training: TrainingStore, scorer: CoreMLIntentScorer = CoreMLIntentScorer(),
         client: ChatClient = .live(), appCheck: AppCheckController = .shared) {
        self.consent = training.defaults.bool(forKey: "onlineAssistant")
        self.training = training
        self.scorer = scorer
        self.client = client
        self.appCheck = appCheck
        messages = training.persistence.loadMessages()
        if let last = messages.last, last.role == .user {
            if let saved = training.lifts.first(where: { $0.id == last.id }) {
                append(.assistant, "", .record(saved.id, before: nil), operation: last.id)
            } else { append(.assistant, "This message was interrupted.", .retry(last.id)) }
        }
    }

    func erase() async throws {
        task?.cancel()
        finishForm("Cancelled")
        try training.deleteAll()
        messages = []
        pendingTurn = nil
        await training.persistence.deleteCloudZone()
    }

    @discardableResult
    private func append(_ role: ChatMessage.Role, _ text: String, _ attachment: ChatMessage.Attachment? = nil, operation: String? = nil) -> String {
        let message = ChatMessage(id: UUID().uuidString, role: role, text: text, createdAt: .now, attachment: attachment, operationTurn: operation)
        messages.append(message)
        persist(message)
        return message.id
    }

    private func persist(_ message: ChatMessage) {
        do { try training.persistence.save(message: message) }
        catch { self.error = "Conversation could not be saved." }
    }

    private func change(_ id: String, _ body: (inout ChatMessage) -> Void) {
        guard let i = messages.firstIndex(where: { $0.id == id }) else { return }
        body(&messages[i])
        persist(messages[i])
    }

    func openForm() {
        guard activity == nil else { return }
        append(.assistant, "", .form("", false))
    }

    private func finishForm(_ result: String) {
        formReply?.resume(returning: result)
        formReply = nil
        waitingFormID = nil
    }

    func completeForm(id: String, name: String?, bodyweight: Bool) {
        guard let name else {
            change(id) { $0.attachment = nil; $0.text = "Exercise creation cancelled." }
            if waitingFormID == id { finishForm("User cancelled.") }
            return
        }
        do {
            let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !trimmed.isEmpty else { return }
            if !training.exercises.contains(where: { $0.name.caseInsensitiveCompare(trimmed) == .orderedSame }) {
                try training.addExercise(name: trimmed, factorsBodyweight: bodyweight)
            }
            guard let exercise = training.exercises.first(where: { $0.name.caseInsensitiveCompare(trimmed) == .orderedSame }) else { return }
            change(id) { $0.attachment = .exercise(exercise.id); $0.text = exercise.name }
            if waitingFormID == id { finishForm("Available exercise: \(exercise.name), id \(exercise.id)") }
        } catch { self.error = "Couldn’t save this exercise." }
    }

    func undo(_ message: ChatMessage) {
        do {
            switch message.attachment {
            case .deleted(let old):
                guard training.exercises.contains(where: { $0.id == old.exerciseID }) else { throw StoreError.unreadableValue }
                try training.update(old)
            case .record(let id, let before):
                guard let set = training.lifts.first(where: { $0.id == id }) else { return }
                if let before { try training.update(before) } else { try training.delete(set) }
            default: return
            }
            change(message.id) { $0.text = "Change undone."; $0.attachment = nil }
        } catch { self.error = "Couldn’t undo this change." }
    }

    func send(_ raw: String) {
        guard activity == nil, !raw.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        started = .now
        let turn = append(.user, raw)
        // A short numeric sequence is the offline shorthand. Edits, questions and
        // follow-ups belong to the contextual assistant even if they contain numbers.
        let conversational = raw.range(of: #"(?i)\b(actually|instead|change|correct|wrong|update|edit|delete|don['’]t|not|never|if|should|would|could|can|why|when|did|example|last time|last set|second one|how|what|show|weigh|add|history|progress|yesterday|last week)\b|\?"#, options: .regularExpression) != nil
        if !conversational {
            if raw.range(of: #"(?i)\b(?:[2-9]|[1-9]\d+)\s*sets?\b"#, options: .regularExpression) != nil {
                append(.assistant, "Which top set should I keep? Send the exercise, weight, and reps for that one set.")
                return
            }
            if case .lift = ShorthandParser.parse(raw, defaultUnit: training.unit) {
                let route = MessageRouter.decide(text: raw, exercises: training.exercises, lifts: training.lifts,
                                                 bodyweight: training.bodyweight, defaultUnit: training.unit, scores: scorer.scores(for:))
                switch route {
                case .log(let command):
                    do {
                        let set = try training.apply(command, operationID: turn)
                        mark("committed")
                        append(.assistant, "", .record(set.id, before: nil), operation: turn)
                    } catch { append(.assistant, "Couldn’t save that top set.") }
                    return
                case .clarify(let question):
                    if question.hasPrefix("Which exercise did you mean: "),
                       case .lift(let draft) = ShorthandParser.parse(raw, defaultUnit: training.unit) {
                        let names = question.dropFirst("Which exercise did you mean: ".count).dropLast().components(separatedBy: ", ")
                        append(.assistant, "Which exercise did you mean?", .choices(names.map {
                            "\($0) \(draft.weight.formatted()) \(draft.unit.label) × \(draft.reps.formatted())"
                        }))
                    } else { append(.assistant, question) }
                    return
                default: break
                }
            }
            if case .incomplete = ShorthandParser.parse(raw),
               let options = Self.topSetChoices(raw), !options.isEmpty {
                append(.assistant, "Which top set should I keep?", .choices(options))
                return
            }
        }
        pendingTurn = turn
        if consent { startOnline() } else { requestingConsent = true }
    }

    private static func topSetChoices(_ text: String) -> [String]? {
        let pattern = #"(?i)^(.+?)\s+(-?\d+(?:\.\d+)?\s*(?:kg|kgs|lb|lbs)?)\s+(?:for\s+)?(\d+(?:\.\d+)?(?:[ ,]+(?:and |then )*\d+(?:\.\d+)?)+)\s*(?:reps)?[.!]?$"#
        guard let regex = try? NSRegularExpression(pattern: pattern),
              let match = regex.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)) else { return nil }
        let parts = (1...3).compactMap { Range(match.range(at: $0), in: text).map { String(text[$0]) } }
        guard parts.count == 3 else { return nil }
        return parts[2].split(whereSeparator: { !$0.isNumber && $0 != "." }).map { "\(parts[0]) \(parts[1]) × \($0)" }
    }

    func retry(_ turn: String) {
        guard activity == nil, messages.contains(where: { $0.id == turn && $0.role == .user }) else { return }
        pendingTurn = turn
        if consent { startOnline() } else { requestingConsent = true }
    }

    func startOnline() {
        requestingConsent = false
        guard consent, let turn = pendingTurn else { return }
        pendingTurn = nil
        guard appCheck.prepare() else {
            append(.assistant, "Online chat needs Firebase configuration. You can still log a top set here.")
            return
        }
        started = .now
        activity = "Working…"
        mark("pending")
        task = Task {
            defer { activity = nil }
            do { try await run(turn) }
            catch {
                if !Task.isCancelled {
                    let text = error is StoreError ? "That change could not be completed. Check the exercise and values." : "The assistant connection was interrupted. Confirmed changes are saved."
                    append(.assistant, text, .retry(turn))
                }
            }
        }
    }

    private func context() -> [ChatClient.Item] {
        var items: [ChatClient.Item] = []
        var budget = 65000
        for message in messages.reversed() {
            if case .retry = message.attachment { continue }
            var text = message.text
            switch message.attachment {
            case .record(let id, _): if let set = training.lifts.first(where: { $0.id == id }) {
                text += " Saved set \(set.id) exercise_id \(set.exerciseID) \(set.exerciseName) \(set.weight) \(set.unit.label) × \(set.reps)"
            }
            case .history(let exercise, let recorded):
                let displayed = Set(recorded)
                let ids = training.history(exercise).map(\.id).filter(displayed.contains)
                text += " Exercise \(exercise); displayed set IDs in order: \(ids.joined(separator: ", "))"
            case .progress(let exercise, let range): text += " Progress exercise_id \(exercise) range \(range)"
            case .choices(let choices): text += " Choices: \(choices.joined(separator: ", "))"
            case .exercise(let id): text += " Exercise ID \(id)"
            default: break
            }
            guard !text.isEmpty else { continue }
            if text.utf8.count > budget { break }
            budget -= text.utf8.count
            items.append(["role":message.role.rawValue,"content":text])
        }
        let retained = items.count
        if retained < messages.count {
            let earlier = messages.dropLast(retained)
            let related = earlier.compactMap { message -> String? in
                switch message.attachment {
                case .record(let id, _):
                    guard let set = training.lifts.first(where: { $0.id == id }) else { return nil }
                    return "Discussed \(set.exerciseName), exercise_id \(set.exerciseID), set_id \(id)."
                case .exercise(let id): return "Created exercise_id \(id)."
                case .history(let id, _), .progress(let id, _): return "Reviewed exercise_id \(id)."
                default: return nil
                }
            }
            if !related.isEmpty {
                items.append(["role": "assistant", "content": "Earlier conversation summary: " + related.suffix(18).joined(separator: " ")])
            }
        }
        return items.reversed()
    }

    private func run(_ turn: String) async throws {
        var input = context()
        var mutated = messages.contains(where: { $0.operationTurn == turn }) || training.lifts.contains(where: { $0.id == turn })
        if mutated {
            input.append(["role":"assistant", "content":"The write for this turn already succeeded. Deliver the confirmation using the committed record in context."])
        }
        var sawText = false
        for _ in 0..<8 {
            try Task.checkCancellation()
            guard consent else { return }
            var replyID: String?
            let output = try await client.stream(input: input, unit: training.unit.rawValue) { type, item in
                if type == "response.output_item.added",
                   let call = item["item"] as? ChatClient.Item,
                   call["type"] as? String == "function_call",
                   let name = call["name"] as? String {
                    let labels = ["find_exercises": "Looking up exercises…", "create_exercise": "Preparing an exercise form…",
                                  "get_exercise_history": "Checking exercise history…", "get_exercise_progress": "Checking exercise progress…",
                                  "log_set": "Preparing your top set…", "update_set": "Preparing your correction…",
                                  "delete_set": "Looking up the top set…", "set_bodyweight": "Preparing your bodyweight entry…"]
                    self.activity = labels[name] ?? "Working…"
                }
                if type == "response.output_text.delta", let delta = item["delta"] as? String {
                    if !sawText { self.mark("first-text"); sawText = true }
                    if replyID == nil { replyID = self.append(.assistant, "") }
                    if let i = self.messages.firstIndex(where: { $0.id == replyID }) {
                        self.messages[i].text += delta
                    }
                }
            }
            if let replyID {
                change(replyID) { msg in
                    let lines = msg.text.components(separatedBy: "\n")
                    let choices = lines.filter { $0.hasPrefix("Choice: ") }.map { String($0.dropFirst(8)) }
                    if !choices.isEmpty {
                        msg.text = lines.filter { !$0.hasPrefix("Choice: ") }.joined(separator: "\n").trimmingCharacters(in: .whitespacesAndNewlines)
                        msg.attachment = .choices(choices)
                    }
                }
            }
            let calls = output.filter { $0["type"] as? String == "function_call" }
            guard !calls.isEmpty else { mark("complete"); return }
            guard calls.count == 1, let call = calls.first, let name = call["name"] as? String,
                  let callID = call["call_id"] as? String, let args = call["arguments"] as? String,
                  let fields = try JSONSerialization.jsonObject(with: Data(args.utf8)) as? ChatClient.Item else { throw StoreError.unreadableValue }
            let writes = ["log_set","delete_set","update_set","set_bodyweight","create_exercise"].contains(name)
            guard !writes || !mutated else { throw StoreError.unreadableValue }
            mark("tool-ready")
            let result = try await execute(name, fields, turn)
            if writes { mark("tool-finished") }
            mutated = mutated || writes
            input += output
            input.append(["type":"function_call_output","call_id":callID,"output":result])
            activity = "Finishing reply…"
        }
        throw StoreError.unreadableValue
    }

    private func execute(_ name: String, _ a: ChatClient.Item, _ turn: String) async throws -> String {
        let id = a["exercise_id"] as? String
        let exercise = training.exercises.first { $0.id == id }
        let set = training.lifts.first { $0.id == a["set_id"] as? String }
        let unit = (a["unit"] as? String).flatMap(WeightUnit.init(rawValue:)) ?? training.unit
        var date: Date?
        if let dateString = a["performed_at"] as? String {
            guard let parsed = ISO8601DateFormatter().date(from: dateString) else { throw StoreError.unreadableValue }
            date = parsed
        }
        switch name {
        case "find_exercises":
            activity = "Looking up exercises…"
            let q = a["query"] as? String ?? ""
            return training.exercises.filter { e in q.isEmpty || ([e.name] + e.aliases).contains { $0.localizedCaseInsensitiveContains(q) } }
                .prefix(100).map { "\($0.id) \($0.name)" }.joined(separator: "\n")
        case "create_exercise":
            activity = "Waiting for exercise details…"
            return await withCheckedContinuation { continuation in
                formReply = continuation
                waitingFormID = append(.assistant, "", .form(a["name"] as? String ?? "", a["factors_bodyweight"] as? Bool ?? false))
            }
        case "get_exercise_history", "get_exercise_progress":
            guard let exercise else { return "Unknown exercise. Look up its ID." }
            activity = "Checking \(exercise.name) history…"
            if name == "get_exercise_progress" {
                let range = ChartRange.allCases.first { $0.title == a["range"] as? String } ?? .oneMonth
                let points = training.points(exercise.id, range: range)
                append(.assistant, "", .progress(exercise.id, range.title))
                guard let first = points.first, let last = points.last else { return "No top sets in this period." }
                return "\(exercise.name), \(range.title): \(points.count) points, first estimated 1RM \(first.estimatedOneRepMax), latest \(last.estimatedOneRepMax) \(training.unit.label)."
            }
            let rows = training.history(exercise.id)
            if a["presentation"] as? String == "table" { append(.assistant, "", .history(exercise.id, rows.map(\.id))) }
            return rows.prefix(100).map { "\($0.id) \($0.performedAt.ISO8601Format()) \($0.weightText(in: training.unit)) × \($0.reps)" }.joined(separator: "\n")
        case "log_set":
            activity = "Saving your top set…"
            guard let exercise, let weight = a["weight"] as? Double, let reps = a["reps"] as? Double else { throw StoreError.unreadableValue }
            let snapshot = exercise.factorsBodyweight ? training.bodyweight.map { OneRepMax.convert($0.weight, from: $0.unit, to: unit) } : nil
            if exercise.factorsBodyweight && snapshot == nil { return "Bodyweight is required. Ask the user for it first." }
            let command = LogCommand(exerciseID: exercise.id, name: exercise.name, aliases: exercise.aliases, weight: weight, reps: reps, unit: unit, bodyweightSnapshot: snapshot)
            let saved = try training.apply(command, operationID: turn, date: date ?? .now)
            append(.assistant, "", .record(saved.id, before: nil), operation: turn)
            return "Saved set \(saved.id)"
        case "update_set":
            activity = "Updating the weight or reps…"
            guard let set else { return "Unknown set. Ask which record." }
            var updated = set
            if let weight = a["weight"] as? Double { updated = set.converted(to: unit); updated.weight = weight }
            if let reps = a["reps"] as? Double { updated.reps = reps }
            if let date { updated.performedAt = date }
            try training.update(updated)
            append(.assistant, "", .record(set.id, before: set), operation: turn)
            return "Updated \(updated.id): \(updated.weightText(in: training.unit)) × \(updated.reps)"
        case "delete_set":
            activity = "Removing the top set…"
            guard let set else { return "Unknown set. Ask which record." }
            try training.delete(set)
            append(.assistant, "Top set removed.", .deleted(set), operation: turn)
            return "Deleted set \(set.id)"
        case "set_bodyweight":
            activity = "Saving bodyweight…"
            guard let weight = a["weight"] as? Double else { throw StoreError.unreadableValue }
            try training.save(bodyweight: BodyweightReading(weight: weight, unit: unit))
            let value = OneRepMax.convert(weight, from: unit, to: training.unit).formatted(.number.precision(.fractionLength(0...1)))
            let confirmation = "Bodyweight saved · \(value) \(training.unit.label)"
            append(.assistant, confirmation, operation: turn)
            return confirmation
        default: throw StoreError.unreadableValue
        }
    }
}
