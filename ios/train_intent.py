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
    logs = [
        "bp 155 5",
        "bp 135 8",
        "bp 185 3",
        "bp 225 x 5",
        "bp 60 kg 5",
        "bench 185 5",
        "bench press 195 for 5",
        "incline bp 135 6",
        "incline db bp 55 7 reps",
        "incline db bp 50 8",
        "db bp 50 10",
        "db bp 40 12",
        "decline bp 185 6",
        "squat 225 5",
        "squat 315 x 3",
        "sq 185 5",
        "front squat 155 5",
        "dl 315 3",
        "dl 405 1",
        "deadlift 275 5",
        "rdl 185 8",
        "rdl 135 10",
        "ohp 95 5",
        "ohp 115 x 5",
        "overhead press 105 6",
        "row 135 8",
        "barbell row 155 6",
        "db row 70 10",
        "db curl 30 12",
        "curl 25 12",
        "hammer curl 35 10",
        "pullup 10 8",
        "lat pulldown 120 10",
        "prowler 90 4",
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
    ]
    rows = [(phrase, 1) for phrase in logs] + [(phrase, 0) for phrase in questions]
    extra_logs = []
    for movement in ["bp", "squat", "dl", "ohp", "row", "rdl", "incline db bp"]:
        for weight in [45, 65, 95, 135, 185, 225]:
            for reps in [3, 5, 8, 10]:
                extra_logs.append(f"{movement} {weight} {reps}")
    extra_questions = []
    for opener in ["what was", "how is", "did I do", "should I repeat"]:
        for target in ["bench", "squat", "deadlift", "press", "my last session", "that workout"]:
            extra_questions.append(f"{opener} {target}")
    rows.extend((phrase, 1) for phrase in extra_logs)
    rows.extend((phrase, 0) for phrase in extra_questions)
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
        "what was the last weight I did on the bench press": 0,
        "how should I progress": 0,
        "what did I last squat": 0,
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
