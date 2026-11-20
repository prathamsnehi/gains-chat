import XCTest
import GainsCore
@testable import GainsChat

@MainActor
final class WorkoutFlowTests: XCTestCase {
    private func library() -> TrainingStore {
        TrainingStore(persistence: PersistenceController(inMemory: true),
                      defaults: UserDefaults(suiteName: UUID().uuidString)!)
    }

    func testOfflineCardPersistsAndResolvesTheSameRecordAfterReload() throws {
        let training = library()
        let chat = ChatStore(training: training)
        chat.send("bp 155 5")
        let set = try XCTUnwrap(training.lifts.first)
        XCTAssertEqual(training.history(set.exerciseID).count, 1)
        let restored = ChatStore(training: training)
        guard case .record(let id, _) = restored.messages.last?.attachment else { return XCTFail("Card missing") }
        XCTAssertEqual(id, set.id)
        training.unit = .kg
        XCTAssertEqual(training.points(set.exerciseID, range: .max).first?.unit, .kg)
        training.formula = .brzycki
        XCTAssertEqual(training.points(set.exerciseID, range: .max).first?.estimatedOneRepMax,
                       set.estimate(unit: .kg, formula: .brzycki))
        restored.undo(try XCTUnwrap(restored.messages.last))
        XCTAssertTrue(training.lifts.isEmpty)
    }

    func testMultipleCandidatesAndInlineBodyweightExercise() throws {
        let training = library()
        let chat = ChatStore(training: training)
        chat.send("Benched 185 for 8, 7, then 6.")
        guard case .choices(let choices) = chat.messages.last?.attachment else { return XCTFail("Expected choices") }
        XCTAssertEqual(choices.count, 3)
        XCTAssertTrue(training.lifts.isEmpty)
        chat.send(choices[1])
        XCTAssertEqual(training.lifts.first?.reps, 7)
        chat.openForm()
        chat.completeForm(id: try XCTUnwrap(chat.messages.last).id, name: "Weighted Dips", bodyweight: true)
        XCTAssertEqual(training.exercises.first { $0.name == "Weighted Dips" }?.factorsBodyweight, true)
    }

    func testRangeEditsAndBodyweightSnapshots() throws {
        let training = library()
        let chat = ChatStore(training: training)
        try training.addExercise(name: "Pull Up", factorsBodyweight: true)
        try training.save(bodyweight: BodyweightReading(weight: 80, unit: .kg))
        let id = try XCTUnwrap(training.exercises.first?.id)
        for amount in ["0", "10", "-10"] { chat.send("Pull Up " + amount + " kg × 5") }
        XCTAssertEqual(training.history(id).count, 3)
        XCTAssertEqual(training.history(id).map(\.bodyweightSnapshot), [80, 80, 80])
        try training.save(bodyweight: BodyweightReading(weight: 90, unit: .kg))
        var oldest = try XCTUnwrap(training.history(id).last)
        oldest.performedAt = try XCTUnwrap(Calendar.current.date(byAdding: .month, value: -2, to: Date()))
        try training.update(oldest)
        XCTAssertEqual(training.points(id, range: .oneMonth).count, 2)
        XCTAssertEqual(training.points(id, range: .max).first?.id, oldest.id)
        training.unit = .kg
        XCTAssertEqual(training.suggested.map(\.id), [id])
        training.formula = .brzycki
        oldest.reps = 40
        try training.update(oldest)
        XCTAssertEqual(training.points(id, range: .max).count, 2)
        XCTAssertEqual(training.history(id).count, 3)
        XCTAssertEqual(training.history(id).last?.bodyweightSnapshot, 80)
    }

    func testBodyweightReadingsAccumulateAndReload() throws {
        let training = library()
        let earlier = Date(timeIntervalSince1970: 1_700_000_000)
        let later = Date(timeIntervalSince1970: 1_700_086_400)
        try training.save(bodyweight: BodyweightReading(weight: 180, unit: .lb), at: earlier)
        try training.save(bodyweight: BodyweightReading(weight: 182, unit: .lb), at: later)
        XCTAssertEqual(training.bodyweight?.weight, 182)
        XCTAssertEqual(training.bodyweightSamples.map(\.weight), [180, 182])
        let restored = TrainingStore(persistence: training.persistence, defaults: training.defaults)
        XCTAssertEqual(restored.bodyweightSamples.map(\.id), training.bodyweightSamples.map(\.id))
        try restored.deleteAll()
        XCTAssertTrue(restored.bodyweightSamples.isEmpty)
        XCTAssertNil(restored.bodyweight)
    }

    func testAskingAboutALiftDoesNotSaveASet() {
        let training = library()
        let chat = ChatStore(training: training)
        XCTAssertTrue(chat.ask("Barbell Bench Press: 155 5"))
        XCTAssertTrue(training.lifts.isEmpty)
        XCTAssertTrue(chat.requestingConsent)
        XCTAssertFalse(chat.ask("another question"))
    }

    func testDecliningConsentLeavesTheQuestionOnDevice() {
        let training = library()
        let chat = ChatStore(training: training)
        XCTAssertFalse(chat.consent)
        chat.send("what is my bench progress?")
        XCTAssertTrue(chat.requestingConsent)
        XCTAssertTrue(training.lifts.isEmpty)
        chat.declineConsent()
        XCTAssertFalse(chat.requestingConsent)
        XCTAssertTrue(chat.messages.contains { $0.text.contains("this phone") })
    }

    func testExplicitMultipleSetsAskBeforeSaving() {
        let training = library()
        let chat = ChatStore(training: training)
        chat.send("bench 185 lb, 3 sets of 8")
        XCTAssertTrue(training.lifts.isEmpty)
        XCTAssertTrue(chat.messages.last?.text.contains("Which top set") == true)
    }

    func testInterruptedStreamCanRetryWithoutDuplicatingASet() async throws {
        let training = library()
        try training.addExercise(name: "Bench", factorsBodyweight: false)
        let exerciseID = try XCTUnwrap(training.exercises.first?.id)
        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [InterruptedStream.self]
        let client = ChatClient(endpoint: URL(string: "https://simulator.invalid/chat")!,
                                token: { exerciseID }, session: URLSession(configuration: configuration))
        let chat = ChatStore(training: training, client: client)
        chat.consent = true
        chat.send("Please add a bench top set of 155 lb for five reps")
        func waitForReply() async throws {
            let start = ContinuousClock.now
            while chat.activity != nil && start.duration(to: .now) < .seconds(5) {
                try await Task.sleep(for: .milliseconds(10))
            }
            XCTAssertNil(chat.activity)
        }
        try await waitForReply()
        XCTAssertTrue(training.lifts.isEmpty)
        guard case .retry(let turn) = chat.messages.last?.attachment else { return XCTFail("Expected retry") }
        chat.retry(turn)
        try await waitForReply()
        XCTAssertEqual(training.history(exerciseID).map(\.id), [turn])
        guard case .retry = chat.messages.last?.attachment else { return XCTFail("Expected interrupted continuation") }
        chat.retry(turn)
        try await waitForReply()
        XCTAssertEqual(training.history(exerciseID).map(\.id), [turn])
    }

    func testProductionStreamingWithSyntheticRecords() async throws {
        guard ProcessInfo.processInfo.environment["GAINS_LIVE_TEST"] == "1" else {
            throw XCTSkip("Opt-in live Firebase benchmark")
        }
        let training = library()
        let chat = ChatStore(training: training)
        chat.consent = true
        chat.send("bp 155 5")
        let set = try XCTUnwrap(training.lifts.first)
        let corrected = ChatStore(training: training)
        for (prompt, expected) in [("Actually, that bench top set was 165 lb. Please correct it.", "correction"),
                                   ("Show my bench history.", "history"),
                                   ("How is my bench progressing over the last month?", "progress")] {
            let start = ContinuousClock.now
            corrected.send(prompt)
            while corrected.activity != nil && start.duration(to: .now) < .seconds(90) {
                try await Task.sleep(for: .milliseconds(50))
            }
            XCTAssertNil(corrected.activity)
            let duration = start.duration(to: .now)
            print("GainsChat live benchmark", expected, duration)
            let messages = corrected.messages
            if case .retry = messages.last?.attachment { return XCTFail("Live request failed: "+(messages.last?.text ?? "")) }
            switch expected {
            case "correction":
                XCTAssertEqual(training.lifts.count, 1)
                XCTAssertEqual(training.lifts.first?.id, set.id)
                XCTAssertEqual(training.lifts.first?.weight, 165)
            case "history":
                XCTAssertTrue(messages.contains { if case .history(_, let ids) = $0.attachment { return ids == [set.id] }; return false })
            default:
                XCTAssertTrue(messages.contains { if case .progress(let id, _) = $0.attachment { return id == set.exerciseID }; return false })
            }
        }
    }
}

// Each test exercise has its own sequence of responses. The first stream closes
// before a tool request, the second commits, and the continuation closes early.
private final class InterruptedStream: URLProtocol, @unchecked Sendable {
    private static let lock = NSLock()
    nonisolated(unsafe) private static var requests: [String: Int] = [:]

    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func stopLoading() {}

    override func startLoading() {
        let exercise = request.value(forHTTPHeaderField: "X-Firebase-AppCheck") ?? ""
        let count = Self.lock.withLock {
            Self.requests[exercise, default: 0] += 1
            return Self.requests[exercise]!
        }
        let response = HTTPURLResponse(url: request.url!, statusCode: 200, httpVersion: nil,
                                       headerFields: ["Content-Type": "text/event-stream"])!
        client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
        var output: [[String: Any]] = []
        if count == 2 {
            let args: [String: Any] = ["exercise_id": exercise, "weight": 155, "reps": 5, "unit": "lb"]
            let arguments = String(decoding: try! JSONSerialization.data(withJSONObject: args), as: UTF8.self)
            output = [["type": "function_call", "name": "log_set", "arguments": arguments, "call_id": "test"]]
        }
        if count == 2 || count > 3 {
            let event: [String: Any] = ["type": "response.completed", "response": ["output": output]]
            let json = String(decoding: try! JSONSerialization.data(withJSONObject: event), as: UTF8.self)
            client?.urlProtocol(self, didLoad: Data(("data: " + json + "\n\n").utf8))
        }
        client?.urlProtocolDidFinishLoading(self)
    }
}
