import Foundation
import GainsCore

enum LogConfirmation {
    static func text(for command: LogCommand) -> String {
        let detail = LiftLoad.detail(
            weight: command.weight,
            reps: command.reps,
            unit: command.unit,
            snapshot: command.bodyweightSnapshot
        )
        return "\(command.name) · \(detail)"
    }
}
