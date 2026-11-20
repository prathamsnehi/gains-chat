import Foundation

public enum NGramFeaturizer {
    public static let dimension = 256

    public static func vector(for text: String) -> [Double] {
        let folded = text.lowercased().split(whereSeparator: \.isWhitespace).joined(separator: " ")
        let padded = " \(folded) "
        var features = Array(repeating: 0.0, count: dimension)
        let bytes = Array(padded.utf8)
        guard bytes.count >= 3 else { return features }
        for index in 0...(bytes.count - 3) {
            let bucket = hash([bytes[index], bytes[index + 1], bytes[index + 2]])
            features[bucket] = 1
        }
        return features
    }

    static func hash(_ bytes: [UInt8]) -> Int {
        var value: UInt32 = 2_166_136_261
        for byte in bytes {
            value ^= UInt32(byte)
            value = value &* 16_777_619
        }
        return Int(value % UInt32(dimension))
    }
}
