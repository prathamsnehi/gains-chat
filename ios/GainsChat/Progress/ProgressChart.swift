import SwiftUI
import Charts
import GainsCore

struct ProgressChart: View {
    var points: [ChartPoint]
    @Binding var selection: String?
    @State private var selectedDate: Date?

    var body: some View {
        plotted
            .frame(height: AppMetrics.chartHeight)
            .accessibilityElement(children: .ignore)
            .accessibilityLabel("Progress chart")
            .accessibilityValue(accessibilityValue)
            .accessibilityAdjustableAction(step)
            .accessibilityHint("Adjust to move between points. History lists every value.")
    }

    private var marks: some View {
        Chart(points) { point in
            if points.count == 1 || point.id == selection {
                PointMark(
                    x: .value("Date", point.performedAt),
                    y: .value("Value", point.estimatedOneRepMax)
                )
                .foregroundStyle(AppPalette.accent)
                .symbolSize(CGFloat(point.id == selection ? 140 : 70))
            }
            if point.id == selection {
                RuleMark(x: .value("Selected", point.performedAt))
                    .foregroundStyle(.secondary)
            }
            AreaMark(
                x: .value("Date", point.performedAt),
                y: .value("Value", point.estimatedOneRepMax)
            )
            .foregroundStyle(AppPalette.accent.opacity(0.22))
            LineMark(
                x: .value("Date", point.performedAt),
                y: .value("Value", point.estimatedOneRepMax)
            )
            .foregroundStyle(AppPalette.accent)
            .lineStyle(StrokeStyle(lineWidth: 3, lineCap: .round))
        }
        .chartYAxisLabel(points.last?.unit.label ?? "")
    }

    @ViewBuilder
    private var plotted: some View {
        if #available(iOS 17, *) {
            marks
                .chartXSelection(value: $selectedDate)
                .onChange(of: selectedDate) { _, date in
                    selection = date.flatMap { nearest(to: $0)?.id }
                }
        } else {
            marks.chartOverlay { proxy in
                GeometryReader { _ in
                    Color.clear
                        .contentShape(Rectangle())
                        .accessibilityHidden(true)
                        .gesture(
                            DragGesture(minimumDistance: 12).onChanged { value in
                                guard abs(value.translation.width) > abs(value.translation.height) else { return }
                                let x = value.location.x - proxy.plotAreaFrame.origin.x
                                if let date: Date = proxy.value(atX: x, as: Date.self) {
                                    selection = nearest(to: date)?.id
                                }
                            }
                        )
                }
            }
        }
    }

    private var accessibilityValue: String {
        let point = points.first { $0.id == selection } ?? points.last
        guard let point else { return "No values" }
        let amount = point.estimatedOneRepMax.formatted(.number.precision(.fractionLength(0...1)))
        let when = point.performedAt.formatted(.dateTime.month(.abbreviated).day().year())
        return "\(when), \(amount) \(point.unit.label)"
    }

    private func nearest(to date: Date) -> ChartPoint? {
        points.min {
            abs($0.performedAt.timeIntervalSince(date)) < abs($1.performedAt.timeIntervalSince(date))
        }
    }

    private func step(_ direction: AccessibilityAdjustmentDirection) {
        guard !points.isEmpty else { return }
        let current = points.firstIndex { $0.id == selection }
        let next: Int
        switch direction {
        case .increment:
            next = min(points.count - 1, (current ?? -1) + 1)
        case .decrement:
            next = max(0, (current ?? points.count) - 1)
        @unknown default:
            return
        }
        selection = points[next].id
    }
}
