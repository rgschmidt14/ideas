import re
from playwright.sync_api import Page, expect, sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # 1. Start Application
    page.goto("http://localhost:8080/index.html")

    # 2. Verify new controls in the left pane
    expect(page.get_by_label("Skills")).to_be_visible()
    expect(page.get_by_label("Faculties")).to_be_visible()
    expect(page.get_by_label("Factors")).to_be_visible()
    expect(page.get_by_label("Sort by:")).to_be_visible()

    # 3. Click on "Barrel Roll"
    barrel_roll_item = page.get_by_text("Barrel Roll")
    expect(barrel_roll_item).to_be_visible()
    barrel_roll_item.click()

    # 4. Verify Explorer View
    # Check for the focal item's card title
    focal_card_heading = page.locator('.explorer-focal .skill-card h3')
    expect(focal_card_heading).to_have_text("Barrel Roll")
    # Check for parents and children sections
    expect(page.get_by_role("heading", name="Parents")).to_be_visible()
    expect(page.get_by_role("heading", name="Children")).not_to_be_visible() # Barrel roll has no children in default data

    # 5. Switch to V-Tree View and verify
    page.get_by_role("button", name="V-Tree").click()
    v_tree_focal_item = page.locator('.tree-container .skill-card h3').first
    expect(v_tree_focal_item).to_have_text("Barrel Roll")

    # 6. Switch to H-Tree View and verify
    page.get_by_role("button", name="H-Tree").click()
    h_tree_focal_item = page.locator('.h-tree-container .skill-card h3').first
    expect(h_tree_focal_item).to_have_text("Barrel Roll")

    # 7. Switch to Global View and verify
    page.get_by_role("button", name="Global").click()
    expect(page.get_by_text("Global View: Coming Soon!")).to_be_visible()

    # 8. Take Screenshot
    page.screenshot(path="jules-scratch/verification/verification.png", full_page=True)

    browser.close()

with sync_playwright() as playwright:
    run(playwright)