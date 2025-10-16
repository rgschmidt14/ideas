import asyncio
from playwright.async_api import async_playwright, expect
import os
import re

# --- Verification Script ---
async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        try:
            # Navigate to the local file
            abs_path = os.path.abspath("ttrpg-map-easy/index.html")
            img_abs_path = os.path.abspath("ttrpg-map-easy/img/black.png")

            await page.goto(f"file://{abs_path}")

            # 1. Load background image and wait for canvas to resize
            await page.locator("#bg-image-input").set_input_files(img_abs_path)
            await expect(page.locator("#map-container")).to_have_attribute("style", re.compile(r"width: \d+(\.\d+)?px;"))
            await asyncio.sleep(1)

            # 2. Manually add a token to the map via script
            await page.evaluate(f"""
                () => {{
                    const newToken = {{
                        id: 'lib-token-0',
                        imgSrc: 'file://{img_abs_path}',
                        width: 1,
                        length: 1,
                        height: 2,
                        instanceId: 'map-token-0',
                        u: 0.4,
                        v: 0.6,
                        altitude: 20,
                        img: null,
                    }};
                    const img = new Image();
                    img.onload = () => {{
                        newToken.img = img;
                        window.state.tokensOnMap.push(newToken);
                        window.render();
                    }};
                    img.src = newToken.imgSrc;
                }}
            """)

            await asyncio.sleep(1)

            # 3. Adjust grid for perspective
            handle_tr = page.locator("#handle-tr")
            handle_tr_box = await handle_tr.bounding_box()
            canvas_box = await page.locator("#grid-canvas").bounding_box()

            await page.mouse.move(handle_tr_box['x'] + handle_tr_box['width'] / 2, handle_tr_box['y'] + handle_tr_box['height'] / 2)
            await page.mouse.down()
            await page.mouse.move(canvas_box['x'] + 600, canvas_box['y'] + 100, steps=5)
            await page.mouse.up()
            await asyncio.sleep(0.5)

            # 4. Take a final screenshot
            await page.screenshot(path="jules-scratch/verification/final_view.png")

        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(main())