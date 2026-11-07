import SwiftUI
import GainsCore

struct ProgressView: View {
    @ObservedObject var training: TrainingStore
    @State private var selectedID: String?

    var body: some View {
        NavigationStack {
            Group {
                if training.exercises.isEmpty {
                    EmptyStateView(
                        title: "No progress yet",
                        systemImage: "chart.line.uptrend.xyaxis",
                        message: "Log a set and its estimated one-rep max will be charted here."
                    )
                } else {
                    VStack(alignment: .leading) {
                        Picker("Exercise", selection: selection) {
                            ForEach(training.exercises) { exercise in
                                Text(exercise.name).tag(Optional(exercise.id))
                            }
                        }
                        .pickerStyle(.menu)
                        if let latest {
                            Text(latest.figure)
                                .font(.largeTitle)
                                .bold()
                            Text(latest.caption)
                                .foregroundStyle(.secondary)
                        }
                        ProgressChart(points: points)
                        Spacer()
                    }
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
            .navigationTitle("Progress")
        }
    }

    private var selection: Binding<String?> {
        Binding(
            get: { selectedID ?? training.exercises.first?.id },
            set: { selectedID = $0 }
        )
    }

    private var points: [ChartPoint] {
        guard let id = selection.wrappedValue else { return [] }
        return ChartSeries.points(for: id, lifts: training.lifts)
    }

    private var latest: (figure: String, caption: String)? {
        guard let point = points.last else { return nil }
        let figure = point.estimatedOneRepMax.formatted(.number.precision(.fractionLength(0...1)))
        return (figure, "Estimated one-rep max, \(point.unit.label)")
    }
}
