#!/usr/bin/env python3
"""Train the tiny log-vs-question classifier and write Swift weights plus a Core ML model."""

from pathlib import Path

import coremltools as ct
import numpy as np
from coremltools.models import datatypes
from coremltools.models.neural_network import NeuralNetworkBuilder
from sklearn.linear_model import LogisticRegression

ROOT = Path(__file__).resolve().parent
DIMENSION = 256


def featurize(text: str) -> np.ndarray:
    folded = " ".join(text.lower().split())
    padded = f" {folded} "
    features = np.zeros(DIMENSION, dtype=np.float32)
    raw = padded.encode("utf-8")
    if len(raw) < 3:
        return features
    for index in range(len(raw) - 2):
        features[hash_bytes(raw[index : index + 3])] = 1
    return features


def hash_bytes(gram: bytes) -> int:
    value = 2166136261
    for byte in gram:
        value ^= byte
        value = (value * 16777619) & 0xFFFFFFFF
    return value % DIMENSION


def samples():
    # The classifier only separates a log from a question. Exercise names are
    # examples of shape, including names nobody has logged yet. The phone creates
    # the exercise from the words; this model never chooses an exercise id.
    movements = [
        "bp", "bench", "bench press", "flat bench", "close grip bench",
        "close grip bench press", "cgbp", "incline bp", "incline bench",
        "incline db bp", "incline dumbbell press", "incline db press",
        "db bp", "dumbbell bench", "decline bench", "squat", "back squat",
        "front squat", "goblet squat", "dl", "deadlift", "rdl", "romanian deadlift",
        "sumo deadlift", "ohp", "overhead press", "shoulder press", "push press",
        "row", "barbell row", "batbell row", "db row", "pendlay row",
        "bicep curls", "biceps curl", "barbell curl", "hammer curl", "db curl",
        "tricep pushdowns", "triceps pushdown", "skull crushers",
        "lat pulldown", "pullup", "chinup", "dip", "lateral raise", "face pull",
        "mid back row", "mid back rows", "belt squat", "jm press", "hip thrust",
        "bulgarian split squat", "leg press", "leg curl", "calf raise",
        "kettlebell swing", "farmer carry", "reverse hyper", "good morning",
    ]
    questions = [
        "what was the last weight I did on the bench press",
        "what was the last weight I did on bp",
        "what did I last bench",
        "what did I last squat",
        "how should I progress",
        "how should I add weight",
        "did I deadlift this week",
        "what is my best ohp",
        "what was my best set of rows",
        "should I rest tomorrow",
        "can you look at my recent incline bench",
        "why did that set feel heavy",
        "give me a cue for squats",
        "what weight should I use next",
        "how many reps did I do last time",
        "tell me about my deadlift",
        "is 155 a good bench",
        "what was the last weight I did on the bench",
        "what did I last mid back row",
        "how should I progress on close grip bench",
        "what was the last weight I did on bicep curls",
    ]
    rows = [(phrase, 0) for phrase in questions]
    weights = [17.5, 32.5, 55, 95, 110, 135, 145, 155, 185, 225, 315]
    rep_counts = [3, 5, 6, 6.5, 7, 7.5, 8, 10, 12]
    for movement in movements:
        for weight in weights[::3]:
            for reps in (5, 8):
                rows.append((f"{movement} {weight} {reps}", 1))
                rows.append((f"{movement} {weight}x{reps}", 1))
                rows.append((f"{movement} {weight} for {reps}", 1))
                rows.append((f"{movement} {weight}lbs {reps} reps", 1))
                rows.append((f"{movement} {weight}s {reps} reps", 1))
        rows.append((f"what did I last {movement}", 0))
        rows.append((f"what was the last weight I did on {movement}", 0))
        rows.append((f"how should I progress on {movement}", 0))
    for weight in weights:
        for reps in rep_counts[::2]:
            rows.append((f"bp {weight} {reps}", 1))
            rows.append((f"squat {weight} x {reps}", 1))
    return rows


def write_swift(log_weights, question_weights, log_bias, question_bias):
    def array(values):
        return ", ".join(f"{value:.8f}" for value in values)

    contents = f"""enum IntentWeights {{
    static let logBias = {log_bias:.8f}
    static let questionBias = {question_bias:.8f}
    static let log: [Double] = [{array(log_weights)}]
    static let question: [Double] = [{array(question_weights)}]
}}
"""
    destination = ROOT / "GainsCore" / "Sources" / "GainsCore" / "IntentWeights.swift"
    destination.write_text(contents)


def write_model(log_weights, question_weights, log_bias, question_bias):
    weights = np.stack([log_weights, question_weights]).astype(np.float32)
    bias = np.array([log_bias, question_bias], dtype=np.float32)
    builder = NeuralNetworkBuilder(
        input_features=[("features", datatypes.Array(DIMENSION))],
        output_features=[("scores", datatypes.Array(2))],
        disable_rank5_shape_mapping=True,
    )
    builder.add_inner_product(
        name="intent",
        W=weights,
        b=bias,
        input_channels=DIMENSION,
        output_channels=2,
        has_bias=True,
        input_name="features",
        output_name="scores",
    )
    builder.spec.description.metadata.shortDescription = "Log versus question intent for Gains Chat."
    spec = builder.spec
    output = ROOT / "GainsChat" / "IntentRouter.mlmodel"
    output.parent.mkdir(parents=True, exist_ok=True)
    ct.models.MLModel(spec).save(str(output))
    saved = ct.models.MLModel(str(output))
    layers = list(saved.get_spec().neuralNetwork.layers)
    if not layers or layers[0].innerProduct.outputChannels != 2:
        raise SystemExit("Core ML model is missing the intent inner product")


def main():
    rows = samples()
    matrix = np.stack([featurize(text) for text, _ in rows])
    labels = np.array([label for _, label in rows])
    classifier = LogisticRegression(max_iter=500)
    classifier.fit(matrix, labels)
    # coef_[0] is the weight for the positive class when there are two classes.
    # classes_ are sorted, so class 1 is log and class 0 is question.
    log_weights = classifier.coef_[0]
    log_bias = float(classifier.intercept_[0])
    question_weights = -log_weights
    question_bias = -log_bias
    holdout = {
        "bp 155 5": 1,
        "incline db bp 55 7 reps": 1,
        "squat 225 x 5": 1,
        "rdl 185 8": 1,
        "Close grip bench 135 7 reps": 1,
        "Bicep curls 32.5s 6.5 reps": 1,
        "Tricep pushdowns 17.5 7.5 reps": 1,
        "Batbell row 110x7": 1,
        "Mid back rows 110 8 reps": 1,
        "Incline dumbbell press 55s 6 reps": 1,
        "Close grip bench press, 145lbs 6 reps": 1,
        "Mid back row 110lbs 7 reps": 1,
        "Bench 225 for 5": 1,
        "belt squat 180 6": 1,
        "what was the last weight I did on the bench press": 0,
        "how should I progress": 0,
        "what did I last squat": 0,
        "what did I last mid back row": 0,
        "how should I progress on close grip bench": 0,
        "what was the last weight I did on bicep curls": 0,
    }
    for phrase, label in holdout.items():
        probability = classifier.predict_proba(featurize(phrase).reshape(1, -1))[0, list(classifier.classes_).index(1)]
        predicted = 1 if probability >= 0.5 else 0
        if predicted != label:
            raise SystemExit(f"{phrase!r} predicted {predicted}, expected {label} ({probability:.3f})")
    write_swift(log_weights, question_weights, log_bias, question_bias)
    write_model(log_weights, question_weights, log_bias, question_bias)
    print(f"trained on {len(rows)} phrases")


if __name__ == "__main__":
    main()
