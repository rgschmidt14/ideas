import re
from playwright.sync_api import Page, expect, sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # *** KEY CHANGE: Listen for and print console messages from the browser ***
    page.on("console", lambda msg: print(f"BROWSER CONSOLE: {msg.text}"))

    # 1. Navigate to the app
    page.goto("http://localhost:8080/index.html")

    # 2. Select "Barrel Roll" and switch to V-Tree
    page.get_by_text("Barrel Roll").click()
    page.get_by_role("button", name="V-Tree").click()

    # 3. Click the "Parents" button on the focal card
    parents_btn = page.locator(".focal-item-container").get_by_role("button", name="Parents")
    expect(parents_btn).to_be_visible()
    parents_btn.click()

    # 4. Wait for rendering
    page.wait_for_timeout(1000)

    # 5. Take a screenshot for visual confirmation
    page.screenshot(path="jules-scratch/verification/final_debug_screenshot.png", full_page=True)

    browser.close()

with sync_playwright() as playwright:
    run(playwright)