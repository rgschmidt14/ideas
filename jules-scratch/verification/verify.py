from playwright.sync_api import sync_playwright, expect
import os

def run_verification(playwright):
    browser = playwright.chromium.launch()
    page = browser.new_page()

    # Get the absolute path to the HTML file
    html_file_path = os.path.abspath('Xenophile/index.html')

    # Navigate to the local HTML file
    page.goto(f'file://{html_file_path}')

    # 1. Screenshot of the initial view
    page.screenshot(path="jules-scratch/verification/01_initial_view.png")

    # 2. Enable Discovery Mode and take a screenshot
    discovery_toggle_input = page.locator('#discovery-mode-toggle')
    discovery_toggle_label = page.locator('label.switch') # The visible element to click

    discovery_toggle_label.click()
    expect(discovery_toggle_input).to_be_checked()
    page.screenshot(path="jules-scratch/verification/02_discovery_mode.png")

    # 3. Click H-Tree view and take a screenshot
    page.locator('#view-htree-btn').click()
    page.wait_for_timeout(500) # Wait for animations
    page.screenshot(path="jules-scratch/verification/03_h-tree_view.png")

    # 4. Click V-Tree view and take a screenshot
    page.locator('#view-vtree-btn').click()
    page.wait_for_timeout(500) # Wait for animations
    page.screenshot(path="jules-scratch/verification/04_v-tree_view.png")

    # 5. Click a "Quick Add" button and screenshot the modal
    page.locator('.quick-add-btn').first.click()
    expect(page.locator('#add-edit-modal')).to_be_visible()
    page.screenshot(path="jules-scratch/verification/05_quick_add_modal.png")

    # 5a. Close the modal
    page.locator('.close-btn').click()
    expect(page.locator('#add-edit-modal')).not_to_be_visible()

    # 6. Test the export button
    with page.expect_download() as download_info:
        page.get_by_text("Export").click()
    download = download_info.value
    print(f"Downloaded file to: {download.path()}")


    # 7. Close browser
    browser.close()

with sync_playwright() as p:
    run_verification(p)

print("Verification script finished.")