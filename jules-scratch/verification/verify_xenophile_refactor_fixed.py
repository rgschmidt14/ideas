import re
from playwright.sync_api import Page, expect, sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # 1. Start Application
    page.goto("http://localhost:8080/index.html")

    # 2. Select "Barrel Roll" to test parent expansion
    page.get_by_text("Barrel Roll").click()

    # 3. Switch to V-Tree view
    page.get_by_role("button", name="V-Tree").click()

    # 4. Verify focal item and click "Parents"
    focal_card_barrel_roll = page.locator(".focal-item-container").get_by_text("Barrel Roll").first
    expect(focal_card_barrel_roll).to_be_visible()

    parents_btn_barrel_roll = page.locator(".focal-item-container").get_by_role("button", name="Parents")
    expect(parents_btn_barrel_roll).to_be_visible()
    parents_btn_barrel_roll.click()

    # 5. Verify parents are visible
    parents_container = page.locator("#focal-parents-container")
    expect(parents_container.get_by_text("Fly")).to_be_visible()
    expect(parents_container.get_by_text("Move")).to_be_visible()

    # 6. Select "Fly" to test child expansion
    page.get_by_text("Fly").first.click() # Click it in the left pane

    # 7. Verify focal item is now "Fly" and click "Children"
    # The view should re-render because we clicked a new item. setView is called.
    focal_card_fly = page.locator(".focal-item-container").get_by_text("Fly").first
    expect(focal_card_fly).to_be_visible()

    children_btn_fly = page.locator(".focal-item-container").get_by_role("button", name="Children")
    expect(children_btn_fly).to_be_visible()
    children_btn_fly.click()

    # 8. Verify child is visible
    children_container = page.locator("#focal-children-container")
    expect(children_container.get_by_text("Barrel Roll")).to_be_visible()

    # 9. Take Screenshot
    page.screenshot(path="jules-scratch/verification/verification_fixed.png", full_page=True)

    browser.close()

with sync_playwright() as playwright:
    run(playwright)