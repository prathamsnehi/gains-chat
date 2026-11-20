import Foundation

enum ChartRange: String, CaseIterable, Identifiable {
    case oneWeek
    case twoWeeks
    case oneMonth
    case threeMonths
    case sixMonths
    case oneYear
    case max

    var id: String { rawValue }

    var title: String {
        switch self {
        case .twoWeeks: "2W"
        case .oneMonth: "1M"
        case .oneWeek: "1W"
        case .threeMonths: "3M"
        case .sixMonths: "6M"
        case .oneYear: "1Y"
        case .max: "ALL"
        }
    }

    func contains(_ date: Date, now: Date = .now, calendar: Calendar = .current) -> Bool {
        guard let start = startDate(from: now, calendar: calendar) else { return true }
        return date >= start
    }

    private func startDate(from now: Date, calendar: Calendar) -> Date? {
        switch self {
        case .twoWeeks:
            calendar.date(byAdding: .day, value: -14, to: now)
        case .oneMonth:
            calendar.date(byAdding: .month, value: -1, to: now)
        case .oneWeek:
            calendar.date(byAdding: .day, value: -7, to: now)
        case .threeMonths:
            calendar.date(byAdding: .month, value: -3, to: now)
        case .sixMonths:
            calendar.date(byAdding: .month, value: -6, to: now)
        case .oneYear:
            calendar.date(byAdding: .year, value: -1, to: now)
        case .max:
            nil
        }
    }
}
