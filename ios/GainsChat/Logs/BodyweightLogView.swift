import SwiftUI
import GainsCore

struct BodyweightLogView: View {
    @ObservedObject var training: TrainingStore
    @State private var range = ChartRange.threeMonths
    @State private var selection: String?
    @State private var draft = ""
    @State private var failure: String?

    var body: some View {
        let points = chartPoints
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                if let latest = training.bodyweightSamples.last ?? syntheticCurrent {
                    let summary = SeriesSummary.make(values: points.map {
                        SeriesValue(date: $0.performedAt, value: $0.estimatedOneRepMax)
                    })
                    SeriesReadout(
                        label: "Bodyweight",
                        valueText: formatted(summary?.latest ?? latest.value(in: training.unit), unit: training.unit.label),
                        sentence: sentence(for: summary),
                        summary: summary ?? SeriesSummary(
                            count: 1,
                            latest: latest.value(in: training.unit),
                            average: latest.value(in: training.unit),
                            difference: 0,
                            earliest: latest.recordedAt,
                            latestDate: latest.recordedAt
                        ),
                        unitLabel: training.unit.label
                    )
                    if points.count > 1 {
                        ProgressChart(points: points, selection: $selection)
                        if let point = points.first(where: { $0.id == selection }) {
                            Text(callout(point))
                                .font(.subheadline)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 8)
                                .background(AppPalette.surface, in: Capsule())
                        }
                    } else if training.bodyweightSamples.count < 2 {
                        Text("One reading so far. Save another to see the change.")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    } else {
                        Text("No readings in this period.")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    ChartRangePicker(selection: $range)
                    Text("Readings")
                        .font(.title2)
                        .bold()
                    readingsList(points)
                } else {
                    EmptyStateView(
                        title: "Bodyweight",
                        systemImage: "scalemass",
                        message: "Save a reading. Exercises that factor bodyweight use the latest one."
                    )
                    .frame(maxWidth: .infinity)
                }
            }
            .padding()
        }
        .background(AppPalette.canvas)
        .navigationTitle("Bodyweight")
        .navigationBarTitleDisplayMode(.inline)
        .safeAreaInset(edge: .bottom) { entry }
        .alert("Save failed", isPresented: Binding(get: { failure != nil }, set: { if !$0 { failure = nil } })) {
            Button("OK") { failure = nil }
        } message: { Text(failure ?? "") }
        .onChange(of: range) { _ in selection = nil }
    }

    private var entry: some View {
        HStack(spacing: 8) {
            TextField("Bodyweight", text: $draft)
                .keyboardType(.decimalPad)
                .font(.body)
            Text(training.unit.label)
                .foregroundStyle(.secondary)
            Button("Save", action: save)
                .buttonStyle(.borderedProminent)
                .frame(minHeight: AppMetrics.minimumTap)
                .disabled(draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
        }
        .padding(12)
        .background(AppPalette.surface)
    }

    private var chartPoints: [ChartPoint] {
        training.bodyweightSamples
            .filter { range.contains($0.recordedAt) }
            .map { sample in
                ChartPoint(
                    id: sample.id,
                    performedAt: sample.recordedAt,
                    estimatedOneRepMax: sample.value(in: training.unit),
                    unit: training.unit
                )
            }
    }

    /// A current reading saved before samples existed, shown until the next save.
    private var syntheticCurrent: BodyweightSample? {
        guard training.bodyweightSamples.isEmpty, let reading = training.bodyweight else { return nil }
        return BodyweightSample(id: "current", weight: reading.weight, unit: reading.unit, recordedAt: .now)
    }

    private func sentence(for summary: SeriesSummary?) -> String {
        guard let summary else { return "Factored lifts use this reading." }
        if summary.count == 1 { return "Factored lifts use this reading." }
        return summary.changeSentence(unitLabel: training.unit.label, comparedWith: "the first reading in this range")
            ?? "Factored lifts use this reading."
    }

    private func readingsList(_ points: [ChartPoint]) -> some View {
        VStack(spacing: 0) {
            if points.isEmpty {
                Text("No readings in this period")
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.vertical, 8)
            }
            ForEach(points.reversed()) { point in
                HStack {
                    Text(point.performedAt.formatted(.dateTime.month(.abbreviated).day().year()))
                        .foregroundStyle(.secondary)
                    Spacer()
                    Text(formatted(point.estimatedOneRepMax, unit: point.unit.label))
                        .monospacedDigit()
                }
                .frame(minHeight: AppMetrics.minimumTap)
                Divider()
            }
        }
        .padding(.horizontal, 12)
        .background(AppPalette.surface, in: RoundedRectangle(cornerRadius: 16))
    }

    private func callout(_ point: ChartPoint) -> String {
        let when = point.performedAt.formatted(.dateTime.month(.abbreviated).day())
        return "\(when) · \(formatted(point.estimatedOneRepMax, unit: point.unit.label))"
    }

    private func formatted(_ value: Double, unit: String) -> String {
        value.formatted(.number.precision(.fractionLength(0...1))) + " " + unit
    }

    private func save() {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        let trimmed = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let number = formatter.number(from: trimmed), number.doubleValue > 0 else {
            failure = "Enter a bodyweight above zero."
            return
        }
        do {
            try training.save(bodyweight: BodyweightReading(weight: number.doubleValue, unit: training.unit))
            draft = ""
        } catch {
            failure = "Bodyweight could not be saved."
        }
    }
}
