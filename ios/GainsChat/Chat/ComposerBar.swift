import SwiftUI
@preconcurrency import Speech
@preconcurrency import AVFoundation

struct ComposerBar: View {
    @Binding var text: String
    let busy: Bool
    var add: () -> Void
    var send: () -> Void
    @StateObject private var speech = DraftDictation()

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            TextField("Log a set or ask…", text: $text, axis: .vertical)
                .accessibilityIdentifier("chatDraft")
                .lineLimit(1...5).padding(.horizontal, 8).padding(.top, 6)
            if let status = speech.status {
                Text(status).font(.caption).foregroundStyle(.secondary).padding(.leading, 8)
            }
            HStack(spacing: 4) {
                Menu { Button("Add a new exercise", systemImage: "plus", action: add) } label: {
                    Image(systemName: "plus").frame(width: 44, height: 44)
                }.disabled(busy).accessibilityLabel("More actions")
                Spacer()
                Button {
                    if speech.active { speech.stop() }
                    else { speech.start(prefix: text) { text = $0 } }
                } label: {
                    Image(systemName: speech.active ? "stop.fill" : "mic").frame(width: 44, height: 44)
                }.accessibilityLabel(speech.active ? "Stop dictation" : "Dictate message")
                Button { speech.stop(); send() } label: {
                    Image(systemName: "arrow.up.circle.fill").font(.title).frame(width: 44, height: 44)
                }.disabled(busy || text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty).accessibilityLabel("Send")
            }
        }.padding(8).background(AppPalette.surface, in: RoundedRectangle(cornerRadius: 23))
            .shadow(color: .black.opacity(0.07), radius: 7, y: 2)
            .onDisappear { speech.stop() }
    }
}

@MainActor
private final class DraftDictation: ObservableObject {
    @Published var active = false
    @Published var status: String?
    private let engine = AVAudioEngine()
    private var recognition: SFSpeechRecognitionTask?
    private var installed = false
    private var generation = UUID()

    func start(prefix: String, update: @escaping @MainActor (String) -> Void) {
        stop()
        let id = generation
        active = true
        status = "Preparing microphone…"
        Task {
            let auth = await withCheckedContinuation { cont in
                SFSpeechRecognizer.requestAuthorization { @Sendable result in cont.resume(returning: result) }
            }
            let permission = await withCheckedContinuation { cont in
                AVAudioSession.sharedInstance().requestRecordPermission { @Sendable result in cont.resume(returning: result) }
            }
            guard generation == id else { return }
            guard auth == .authorized, permission, let recognizer = SFSpeechRecognizer(), recognizer.isAvailable else {
                stop(); status = "Dictation unavailable. You can still type."; return
            }
            do {
                let audio = AVAudioSession.sharedInstance()
                try audio.setCategory(.record, mode: .measurement, options: .duckOthers)
                try audio.setActive(true)
                let request = SFSpeechAudioBufferRecognitionRequest()
                request.shouldReportPartialResults = true
                let node = engine.inputNode
                let format = node.outputFormat(forBus: 0)
                guard format.sampleRate > 0, format.channelCount > 0 else { throw URLError(.resourceUnavailable) }
                node.installTap(onBus: 0, bufferSize: 1024, format: format, block: Self.tap(request))
                installed = true
                recognition = recognizer.recognitionTask(with: request) { @Sendable result, error in
                    let transcript = result?.bestTranscription.formattedString
                    let finished = result?.isFinal == true || error != nil
                    Task { @MainActor in
                        guard self.generation == id else { return }
                        if let transcript { update(prefix.isEmpty ? transcript : prefix + " " + transcript) }
                        if finished { self.stop() }
                    }
                }
                engine.prepare()
                try engine.start()
                status = "Listening…"
            } catch { stop(); status = "Microphone unavailable. You can still type." }
        }
    }

    nonisolated private static func tap(_ request: SFSpeechAudioBufferRecognitionRequest) -> AVAudioNodeTapBlock {
        { buffer, _ in request.append(buffer) }
    }

    func stop() {
        generation = UUID()
        if installed { engine.stop(); engine.inputNode.removeTap(onBus: 0); installed = false }
        recognition?.cancel()
        recognition = nil
        if active { try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation) }
        active = false
        status = nil
    }
}
