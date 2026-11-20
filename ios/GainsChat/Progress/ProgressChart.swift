import SwiftUI
import Charts
import GainsCore

struct ProgressChart: View {
    var points: [ChartPoint]

    var body: some View {
        Chart(points) { point in
            if points.count == 1 {
                PointMark(x: .value("Date", point.performedAt), y: .value("Estimated 1RM", point.estimatedOneRepMax))
                    .foregroundStyle(AppPalette.accent)
            }
            AreaMark(
                x: .value("Date", point.performedAt),
                y: .value("Estimated 1RM", point.estimatedOneRepMax)
            )
            .foregroundStyle(AppPalette.accent.opacity(0.22))
            LineMark(
                x: .value("Date", point.performedAt),
                y: .value("Estimated 1RM", point.estimatedOneRepMax)
            )
            .foregroundStyle(AppPalette.accent)
            .lineStyle(StrokeStyle(lineWidth: 3, lineCap: .round))
        }
        .chartYAxisLabel(points.last?.unit.label ?? "lb")
        .frame(height: AppMetrics.chartHeight)
    }
}
