import os
from playwright.sync_api import sync_playwright, expect

def run_verification(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    # Get the absolute path to the index.html file
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(current_dir, '..', '..'))
    index_path = os.path.join(project_root, 'Xenophile', 'index.html')

    if not os.path.exists(index_path):
        raise FileNotFoundError(f"Could not find index.html at {index_path}")

    page.goto(f'file://{index_path}')

    # 1. Click the "Tree" view button
    tree_view_btn = page.get_by_role("button", name="Tree")
    expect(tree_view_btn).to_be_visible()
    tree_view_btn.click()

    # Wait for the tree to render and take a screenshot of the initial collapsed view
    expect(page.locator('.tree-container')).to_be_visible()
    page.screenshot(path="jules-scratch/verification/tree_view_initial.png")

    # 2. Find the parent node ("Think") and expand it
    think_card = page.locator('.skill-card[data-id="skill_think_0"]')
    expect(think_card).to_be_visible()

    # Click the toggle button on the "Think" card
    think_toggle_btn = think_card.locator('.toggle-children')
    expect(think_toggle_btn).to_be_visible()
    think_toggle_btn.click()

    # 3. Now, "Formulate Argument" should be visible.
    formulate_argument_card = page.locator('.skill-card[data-id*="skill_formulate_argument"]')
    expect(formulate_argument_card).to_be_visible()

    # 4. Now let's expand "Formulate Argument" itself
    formulate_argument_toggle_btn = formulate_argument_card.locator('.toggle-children')
    expect(formulate_argument_toggle_btn).to_be_visible()
    formulate_argument_toggle_btn.click()

    # 5. Wait for its children to become visible and take the final screenshot
    structure_narrative_card = page.locator('.skill-card[data-id*="skill_structure_narrative"]')
    expect(structure_narrative_card).to_be_visible()

    # Give a moment for the lines to draw
    page.wait_for_timeout(500)

    page.screenshot(path="jules-scratch/verification/verification.png")

    browser.close()

with sync_playwright() as playwright:
    run_verification(playwright)

print("Verification script finished and screenshot 'verification.png' created.")