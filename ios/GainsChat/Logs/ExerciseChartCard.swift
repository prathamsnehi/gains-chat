import SwiftUI
import GainsCore

struct ExerciseChartCard: View {
    @Binding var range: ChartRange
    var points: [ChartPoint]
    var showsRanges = true
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Estimated 1RM").font(.subheadline.weight(.medium)).foregroundStyle(.secondary)
            if let latest = points.last {
                Text("\(latest.estimatedOneRepMax.formatted(.number.precision(.fractionLength(0...1)))) \(latest.unit.label)")
                    .font(.largeTitle.bold()).monospacedDigit()
                if points.count > 1, let first = points.first {
                    let delta = latest.estimatedOneRepMax - first.estimatedOneRepMax
                    Text("\(delta < 0 ? "↓" : delta > 0 ? "↑" : "→") \(abs(delta).formatted(.number.precision(.fractionLength(0...1)))) \(latest.unit.label) (\((delta / first.estimatedOneRepMax).formatted(.percent.precision(.fractionLength(1)))))")
                        .font(.subheadline.bold()).foregroundStyle(.secondary)
                }
                ProgressChart(points: points).padding(.vertical, 10)
            } else {
                Text("No top sets in this period").foregroundStyle(.secondary).frame(maxWidth: .infinity, minHeight: 140)
            }
            if showsRanges { ChartRangePicker(selection: $range) }
        }
    }
}
