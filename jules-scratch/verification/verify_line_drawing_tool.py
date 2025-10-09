from playwright.sync_api import sync_playwright, Page, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # Navigate to the local server
        page.goto("http://localhost:8000", wait_until="networkidle")

        # Add some points, waiting for each to appear
        for i in range(4):
            current_rows = page.locator(".points-table tbody tr").count()
            page.click("#add-point")
            expect(page.locator(".points-table tbody tr")).to_have_count(current_rows + 1)

        # Edit the points to create a curve
        page.fill('input[data-index="0"].x-coordinate', "1")
        page.fill('input[data-index="0"].y-coordinate', "2")
        page.fill('input[data-index="1"].x-coordinate', "2")
        page.fill('input[data-index="1"].y-coordinate', "4")
        page.fill('input[data-index="2"].x-coordinate', "3")
        page.fill('input[data-index="2"].y-coordinate', "8")
        page.fill('input[data-index="3"].x-coordinate', "4")
        page.fill('input[data-index="3"].y-coordinate', "16")

        # Auto-select the best fit
        page.click("#auto-select-best-fit")
        # Wait for the line to be redrawn by checking the equation
        expect(page.locator(".equation span")).not_to_be_empty(timeout=10000)

        # Add more points to make the table scrollable
        for i in range(10):
            current_rows = page.locator(".points-table tbody tr").count()
            page.click("#add-point")
            expect(page.locator(".points-table tbody tr")).to_have_count(current_rows + 1)

        # Take a screenshot
        page.screenshot(path="jules-scratch/verification/verification.png", full_page=True)

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)