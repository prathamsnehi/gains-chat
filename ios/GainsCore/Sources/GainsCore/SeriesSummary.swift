import Foundation

/// A date and a value, ordered later by `SeriesSummary`.
public struct SeriesValue: Equatable, Sendable {
    public var date: Date
    public var value: Double

    public init(date: Date, value: Double) {
        self.date = date
        self.value = value
    }
}

/// Average and change across one chart range.
public struct SeriesSummary: Equatable, Sendable {
    public var count: Int
    public var latest: Double
    public var average: Double
    public var difference: Double
    public var earliest: Date
    public var latestDate: Date

    public init(count: Int, latest: Double, average: Double, difference: Double, earliest: Date, latestDate: Date) {
        self.count = count
        self.latest = latest
        self.average = average
        self.difference = difference
        self.earliest = earliest
        self.latestDate = latestDate
    }

    public static func make(values: [SeriesValue]) -> SeriesSummary? {
        let ordered = values.sorted { $0.date < $1.date }
        guard let first = ordered.first, let last = ordered.last else { return nil }
        let total = ordered.reduce(0) { $0 + $1.value }
        return SeriesSummary(
            count: ordered.count,
            latest: last.value,
            average: total / Double(ordered.count),
            difference: last.value - first.value,
            earliest: first.date,
            latestDate: last.date
        )
    }

    /// Change from the first value in the range. A single value has no comparison.
    public func changeSentence(unitLabel: String, comparedWith: String) -> String? {
        guard count > 1 else { return nil }
        let amount = abs(difference).formatted(.number.precision(.fractionLength(0...1)))
        if difference > 0.05 {
            return "Up \(amount) \(unitLabel) from \(comparedWith)."
        }
        if difference < -0.05 {
            return "Down \(amount) \(unitLabel) from \(comparedWith)."
        }
        return "Unchanged from \(comparedWith)."
    }
}

public enum RecordComparison {
    /// Estimated 1RM against the previous top set, when one exists.
    public static func sentence(estimate: Double?, previous: Double?, unitLabel: String) -> String? {
        guard let estimate else { return nil }
        let current = estimate.formatted(.number.precision(.fractionLength(0...1)))
        let headline = "Estimated 1RM \(current) \(unitLabel)"
        guard let previous else { return headline + "." }
        let delta = estimate - previous
        let amount = abs(delta).formatted(.number.precision(.fractionLength(0...1)))
        if abs(delta) <= 0.05 {
            return "\(headline), same as the previous top set."
        }
        let direction = delta > 0 ? "up" : "down"
        return "\(headline), \(direction) \(amount) \(unitLabel) from the previous top set."
    }
}
