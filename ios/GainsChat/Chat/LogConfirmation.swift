import Foundation
import GainsCore

enum LogConfirmation {
    static func text(for command: LogCommand) -> String {
        let weight = command.weight.formatted(.number.precision(.fractionLength(0...1)))
        let reps = command.reps.formatted(.number.precision(.fractionLength(0...1)))
        return "\(command.name) · \(weight) \(command.unit.label) × \(reps)"
    }
}
