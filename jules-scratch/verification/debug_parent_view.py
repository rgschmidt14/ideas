import re
from playwright.sync_api import Page, expect, sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # 1. Navigate to the app
    page.goto("http://localhost:8080/index.html")

    # 2. Select "Barrel Roll" and switch to V-Tree
    page.get_by_text("Barrel Roll").click()
    page.get_by_role("button", name="V-Tree").click()

    # 3. Click the "Parents" button on the focal card
    parents_btn = page.locator(".focal-item-container").get_by_role("button", name="Parents")
    expect(parents_btn).to_be_visible()
    parents_btn.click()

    # 4. Wait for a moment for rendering and take a screenshot for debugging
    page.wait_for_timeout(1000)
    page.screenshot(path="jules-scratch/verification/debug_screenshot.png", full_page=True)

    browser.close()

with sync_playwright() as playwright:
    run(playwright)