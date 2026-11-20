import SwiftUI

struct ChartRangePicker: View {
    @Environment(\.dynamicTypeSize) private var size
    @Binding var selection: ChartRange

    var body: some View {
        if size.isAccessibilitySize {
            ScrollView(.horizontal) { controls }.scrollIndicators(.hidden)
        } else { controls }
    }

    private var controls: some View {
        HStack(spacing: 2) {
            ForEach(ChartRange.allCases) { range in
                Button { selection = range } label: {
                    Text(range.title).font(.subheadline.weight(.semibold))
                        .frame(maxWidth: .infinity, minHeight: 36)
                        .padding(.horizontal, 3)
                        .background(selection == range ? AppPalette.accent.opacity(0.14) : .clear, in: Capsule())
                        .frame(minHeight: 44)
                }
                .buttonStyle(.plain)
                .foregroundStyle(selection == range ? AppPalette.accent : .secondary)
                .accessibilityAddTraits(selection == range ? .isSelected : [])
            }
        }
    }
}
