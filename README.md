# Project Hub

This repository is a collection of games, tools, and other fun projects.

## How to Add a New Project

To keep our projects organized, please follow these simple steps when adding a new creation:

1.  **Create a New Folder:** Each new game or widget should be placed in its own dedicated folder in the root directory. The folder name should be descriptive and reflect the name of the project (e.g., "Xenophile", "PixelArtEditor").

2.  **Add a Project `index.html`:** Every project folder must contain an `index.html` file, which will serve as the main entry point for the application.

3.  **Add a Link to the Main Hub:** Add a link to your project in the main `index.html` file at the root of the repository. Please add a relevant emoji next to the link and place it under the appropriate category (Game, Tool, etc.).

4.  **Include a Project `README.md`:** It's essential to include a `README.md` file inside your project's folder. A good `README.md` makes it easier for others to understand and use your work. Please use the `Xenophile/README.md` as a template. Your `README.md` should include:
    *   A **Description** of what your project does.
    *   A list of **Future Ideas** with checkboxes to track progress.

---

## Changelog

**2025-10-02:**
- **Robust Location Storage:** Fixed a bug in both the `SunburnApp` and `PavementTemp` applications where the app would crash if it found an old, non-JSON location entry in the browser's local storage. The apps now correctly handle and updates the old data format, ensuring a smooth experience for returning users.

**2025-09-30:**
- **Full CRUD Functionality:** Added the ability to create, edit, and delete skills and faculties.
- **Sorting Views:** Implemented "Alphabetical" and "Tree" view sorting options to organize the skill tree.
- **Color-Coding:** Skills and Faculties are now visually distinguished by color.
- **New Item Type:** Added "Faculties" as a new type of base item that can be used as prerequisites.
- **Expanded Default Data:** Included two new skill trees ("Barrel Roll" and "Oral Dissertation") to showcase the new features.
