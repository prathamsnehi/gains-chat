import Foundation
import GainsCore

struct HistorySection: Identifiable {
    var id: Date
    var title: String
    var lifts: [LiftRecord]
}
