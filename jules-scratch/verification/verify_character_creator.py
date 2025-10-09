from playwright.sync_api import sync_playwright, Page, expect

def run_verification(page: Page):
    """
    Verifies the character creator functionality.
    """
    # 1. Navigate to the application and set viewport.
    page.goto("http://localhost:8000/GandJ_Tracker/gandj_tracker.html")
    page.set_viewport_size({"width": 1280, "height": 720})

    # 2. Switch to the "Character Creator" tab.
    cc_tab = page.get_by_role("button", name="Character Creator")
    cc_tab.click()

    # 3. Create a new character named "Jules".
    page.get_by_placeholder("New character name...").fill("Jules")
    page.get_by_role("button", name="Create").click()

    # 4. Verify the character was created and is selected.
    new_char_option = page.locator("#char-select > option[value^='char_']")
    new_char_value = new_char_option.get_attribute("value")
    expect(page.get_by_role("combobox", name="Current Character:")).to_have_value(new_char_value)

    # 5. Switch back to the "Skills & Faculties DB" tab.
    db_tab = page.get_by_role("button", name="Skills & Faculties DB")
    db_tab.click()

    # 6. Find the "Move" skill and add it to the character.
    page.get_by_role("button", name="Move T0").click()

    add_to_char_btn = page.locator('.skill-card[data-id="skill_move_0"] .add-to-char-btn')
    expect(add_to_char_btn).to_be_visible()
    add_to_char_btn.click()

    # 7. Switch back to the "Character Creator" tab.
    cc_tab.click()

    # 8. Verify the skill "Move" has been added to the character sheet.
    expect(page.locator("#character-sheet-container")).to_contain_text("Move (Lvl 1)")

    # 9. Switch back to the DB tab and enable the "Show only acquirable" filter.
    db_tab.click()

    # Click the label associated with the checkbox, which is the visible element.
    page.locator("label.switch:has(#discovery-mode-toggle)").click()

    # 10. Take a screenshot for visual verification.
    page.screenshot(path="jules-scratch/verification/verification.png", full_page=True)


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        run_verification(page)
        browser.close()

if __name__ == "__main__":
    main()