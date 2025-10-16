import os
import base64
from playwright.sync_api import sync_playwright, expect

def run_verification(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    # Dismiss alerts automatically
    page.on("dialog", lambda dialog: dialog.dismiss())

    try:
        file_path = os.path.abspath('ttrpg-map-easy/index.html')
        page.goto(f'file://{file_path}')
        page.wait_for_load_state('networkidle')

        page.screenshot(path="jules-scratch/verification/01_initial_state.png")

        fake_png_buffer = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/wcAAwAB/epv2AAAAABJRU5ErkJggg==")

        page.locator("#bg-image-input").set_input_files(
            files=[{"name": "background.png", "mimeType": "image/png", "buffer": fake_png_buffer}]
        )

        page.locator("#token-image-input").set_input_files(
            files=[{"name": "token.png", "mimeType": "image/png", "buffer": fake_png_buffer}]
        )

        page.locator("#add-token-btn").click()
        token_in_library = page.locator("#token-library .token-in-library")
        expect(token_in_library).to_be_visible()

        # --- Perform drag and drop with manual mouse actions ---
        source_box = token_in_library.bounding_box()
        target_box = page.locator("#map-container").bounding_box()

        if source_box and target_box:
            # Move mouse to the center of the source token
            page.mouse.move(source_box['x'] + source_box['width'] / 2, source_box['y'] + source_box['height'] / 2)
            page.mouse.down()
            # Move mouse to the target drop position within the map container
            page.mouse.move(target_box['x'] + 400, target_box['y'] + 300)
            page.mouse.up()

        page.wait_for_timeout(200) # Give app time to process the drop

        page.evaluate("document.querySelector('.main-container').style.pointerEvents = 'none'")
        page.evaluate("document.querySelector('.main-layout').style.pointerEvents = 'none'")
        page.evaluate("document.querySelector('.right-panel').style.pointerEvents = 'none'")
        page.locator("#grid-canvas").click(position={'x': 400, 'y': 300})
        page.evaluate("document.querySelector('.main-container').style.pointerEvents = 'auto'")
        page.evaluate("document.querySelector('.main-layout').style.pointerEvents = 'auto'")
        page.evaluate("document.querySelector('.right-panel').style.pointerEvents = 'auto'")

        expect(page.locator("#selected-token-controls")).to_be_visible()
        page.locator("#token-altitude").fill("50")

        # --- Skew the grid with manual mouse actions ---
        handle_tr = page.locator("#handle-tr")
        tr_box = handle_tr.bounding_box()
        map_box = page.locator("#map-container").bounding_box()
        if tr_box and map_box:
            page.mouse.move(tr_box['x'] + tr_box['width'] / 2, tr_box['y'] + tr_box['height'] / 2)
            page.mouse.down()
            page.mouse.move(map_box['x'] + 700, map_box['y'] + 50)
            page.mouse.up()

        page.locator("#session-name-input").fill("test-session")
        page.locator("#save-session-btn").click()

        expect(page.locator("#session-select > option")).to_have_text("test-session")

        page.screenshot(path="jules-scratch/verification/verification.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run_verification(playwright)