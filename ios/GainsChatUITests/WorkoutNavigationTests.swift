import XCTest

final class WorkoutNavigationTests: XCTestCase {
    @MainActor
    func testLoggedSetIsReachableFromLog() {
        let app = XCUIApplication()
        app.launchArguments = ["--workout-ui-test"]
        app.launch()
        let draft = app.descendants(matching: .any).matching(identifier: "chatDraft").firstMatch
        XCTAssertTrue(draft.waitForExistence(timeout: 10))
        draft.tap()
        draft.typeText("bp 155 5")
        app.buttons["Send"].tap()
        XCTAssertFalse(app.tabBars.firstMatch.exists)
        draft.tap()
        draft.typeText("draft to keep")
        let menu = app.buttons["Open navigation"]
        menu.tap()
        XCTAssertTrue(app.buttons["sidebar.chat"].isSelected)
        app.buttons["Close navigation"].tap()
        XCTAssertTrue(menu.waitForExistence(timeout: 5))
        menu.tap()
        app.buttons["sidebar.logs"].tap()
        let bench = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] %@", "Barbell Bench Press")).firstMatch
        XCTAssertTrue(bench.waitForExistence(timeout: 5))
        bench.tap()
        XCTAssertTrue(app.staticTexts["Estimated 1RM"].waitForExistence(timeout: 5))
        let exerciseBar = app.navigationBars["Barbell Bench Press"]
        exerciseBar.buttons["Edit"].tap()
        XCTAssertTrue(exerciseBar.buttons["Done"].exists)
        exerciseBar.buttons["Done"].tap()
        menu.tap()
        XCTAssertTrue(app.buttons["sidebar.logs"].isSelected)
        app.buttons["sidebar.settings"].tap()
        XCTAssertTrue(app.navigationBars["Settings"].exists)
        menu.tap()
        app.buttons["sidebar.chat"].tap()
        XCTAssertEqual(draft.value as? String, "draft to keep")
        menu.tap()
        app.buttons["sidebar.logs"].tap()
        XCTAssertTrue(app.staticTexts["Estimated 1RM"].waitForExistence(timeout: 5))
        exerciseBar.buttons["Log"].tap()
        XCTAssertTrue(app.searchFields["Search exercises"].waitForExistence(timeout: 5))
        menu.tap()
        app.buttons["sidebar.chat"].tap()
        XCTAssertTrue(app.staticTexts["bp 155 5"].firstMatch.exists)
    }
}
