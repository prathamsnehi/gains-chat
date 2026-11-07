public struct ImportedLibrary: Equatable, Sendable {
    public var exercises: [KnownExercise]
    public var lifts: [LiftRecord]

    public init(exercises: [KnownExercise], lifts: [LiftRecord]) {
        self.exercises = exercises
        self.lifts = lifts
    }
}
