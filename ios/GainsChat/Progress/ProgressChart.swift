import SwiftUI
import Charts
import GainsCore

struct ProgressChart: View {
    var points: [ChartPoint]

    var body: some View {
        Chart(points) { point in
            LineMark(
                x: .value("Date", point.performedAt),
                y: .value("Estimated 1RM", point.estimatedOneRepMax)
            )
            .foregroundStyle(.blue)
        }
        .chartYAxisLabel(Text(points.last?.unit.label ?? "lb"))
        .frame(height: AppMetrics.chartHeight)
    }
}
