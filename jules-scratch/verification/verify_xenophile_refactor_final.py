import re
from playwright.sync_api import Page, expect, sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # 1. Start Application
    page.goto("http://localhost:8080/index.html")

    # 2. Select "Barrel Roll" to test parent expansion
    page.locator(".search-result-item").filter(has_text="Barrel Roll").click()

    # 3. Switch to V-Tree view
    page.get_by_role("button", name="V-Tree").click()

    # 4. Verify focal item and click "Parents"
    focal_card_barrel_roll = page.locator(".focal-item-container").get_by_role("heading", name="Barrel Roll")
    expect(focal_card_barrel_roll).to_be_visible()

    parents_btn_barrel_roll = page.locator(".focal-item-container").get_by_role("button", name="Parents")
    expect(parents_btn_barrel_roll).to_be_visible()
    parents_btn_barrel_roll.click()

    # 5. Verify parents are visible using specific locators
    parents_container = page.locator("#focal-parents-container")
    expect(parents_container.get_by_role("heading", name="Fly")).to_be_visible()
    expect(parents_container.get_by_role("heading", name="Move")).to_be_visible()

    # 6. Select "Fly" from the side panel to make it the new focal item
    page.locator(".search-result-item").filter(has_text="Fly").click()

    # 7. Verify focal item is now "Fly" and click "Children"
    focal_card_fly = page.locator(".focal-item-container").get_by_role("heading", name="Fly")
    expect(focal_card_fly).to_be_visible()

    children_btn_fly = page.locator(".focal-item-container").get_by_role("button", name="Children")
    expect(children_btn_fly).to_be_visible()
    children_btn_fly.click()

    # 8. Verify child is visible using a specific locator
    children_container = page.locator("#focal-children-container")
    expect(children_container.get_by_role("heading", name="Barrel Roll")).to_be_visible()

    # 9. Take Screenshot
    page.screenshot(path="jules-scratch/verification/verification_final.png", full_page=True)

    browser.close()

with sync_playwright() as playwright:
    run(playwright)