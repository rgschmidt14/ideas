# Xenophile

Map your life's skill tree.

## Project Vision

Xenophile is envisioned as a universal, comprehensive map for personal growth and skill acquisition. The ultimate goal is to create a tool so thorough that it can guide a user from learning the most basic human actions (like walking or thinking) to mastering highly complex, specialized, and even esoteric abilities (like performing a trick dunk in basketball, delivering a flawless academic dissertation, or mastering a niche craft).

We aim to build a "skill tree for life," where any skill or faculty a person might want to learn is documented with step-by-step learning paths, integrated testing or "pass-off" systems, and curated links to external resources. This will show how all abilities are interconnected, building upon one another in a clear, visual hierarchy.

The system is built on two fundamental concepts:
- **Skills:** The actions and abilities a person can learn and perform. Each skill has its own leveling system (from 0 for complete inability to 5 for world-class mastery) to track progress.
- **Faculties:** The tools, innate talents, or external resources required to perform a skill. A faculty could be a physical object (a basketball, a magic wand), a biological trait (wings, opposable thumbs), or even an abstract concept (priesthood authority, a gift for a friend).

Ultimately, this living skill tree will serve as the foundation for a real-world, interactive Tabletop RPG, where players can track their character's development and even apply it to their own lives.

## How It Works

Xenophile is currently a client-side web application, meaning all data is stored locally in your browser and no internet connection is required to use it.

- **Data Storage:** The entire skill tree, including all your custom skills and faculties, is stored in the browser's `localStorage`. The data is a single JSON object containing two main arrays: `skills` and `faculties`. This makes the application fast and private, but it also means you should use the **Export** feature regularly to back up your data.
- **Core Concepts & Data Integrity:**
    - **Tier System:** Each item has a `tier`. Tier 0 items have no prerequisites. The tier of any other item is automatically calculated to be one higher than its highest-tier prerequisite. This logic is handled by the `updateAllDependentTiers()` function, which runs after any change to ensure the tree's structure remains sound.
    - **Prerequisites:** Items can require up to two prerequisites. When creating a new item, you can specify not just *which* item is required, but also what *level* of mastery is needed in that prerequisite.
    - **Data Migration:** The application includes a migration function in `loadData()` that automatically updates older data structures to the latest format, ensuring backward compatibility if the data model changes in future updates.
- **Rendering:** The application uses pure JavaScript to render the skill tree dynamically based on the stored data.
    - **`createSkillCard()`:** This is the core rendering function. It generates the HTML for each individual item card, including its title, description, prerequisites, and controls.
    - **View Modes:** There are three ways to view the tree:
        1.  **Alphabetical:** A simple, multi-column layout that groups items by Tier and then sorts them alphabetically.
        2.  **V-Tree (Vertical):** A top-down genealogical tree that visualizes dependencies.
        3.  **H-Tree (Horizontal):** A left-to-right version of the tree view.
    - **SVG Connectors:** In the tree views, SVG lines are drawn dynamically between parent and child nodes to make the relationships clear.

## Future Ideas (To-Do List)

- [ ] **Centralized Search & Navigation:** Overhaul the UX to be search-first, allowing users to find an item and then explore its dependency tree in a focused view.
- [ ] **Skill "Pass-Off" System:** Develop a mechanism or checklist to test if a user has learned a skill to a certain level.
- [ ] **More complex prerequisite rules** (e.g., more than 2, OR conditions).
- [ ] **Sharing skill trees** with others.
- [x] Advanced graphical visualization of the skill tree.
- [x] **Skill Leveling System:** Implement a 0-5 leveling system for each skill and faculty to track user proficiency. (Done 2025-10-02)
- [x] **Prerequisite Levels:** Allow specifying the required level of a prerequisite to unlock Level 1 of a new skill (e.g., "Palm Basketball (Level 3)" is needed for "Dunk (Level 1)"). (Done 2025-10-02)
- [x] **Detailed Level Descriptions:** Add fields in the creation/edit modal for descriptions for each of the 5 proficiency levels. (Done 2025-10-02)
- [x] **"Quick Add" Prerequisite:** Add a '+' button next to items in the tree view to open the creation modal with that item pre-populated as a prerequisite. (Done 2025-10-02)
- [x] **Embedded Links:** Create an easy way to add and display hyperlinks (e.g., to YouTube tutorials or articles) within skill descriptions. (Done 2025-10-02)
- [x] **Ability to export/import skill trees.** (Done 2025-10-02)
- [x] **A "discovery" mode** where you can only see skills you have the prerequisites for. (Done 2025-10-02)


## AI Suggestions

Here are a few technical suggestions to help bring the vision to life:

- **Data Model for Levels:** To handle skill levels and prerequisite levels, consider expanding the data structure for an item. For example:
  ```json
  "prerequisites": [
      { "id": "skill_a", "requiredLevel": 3 },
      { "id": "faculty_b", "requiredLevel": 2 }
  ],
  "levelDescriptions": {
      "1": "Basic understanding...",
      "2": "Consistent application...",
      "3": "Considered proficient...",
      "4": "Impressive ability...",
      "5": "World-class mastery..."
  }
  ```
- **UI for Level Descriptions:** In the edit modal, a tabbed interface or a set of five collapsible text areas could be a clean way to manage the descriptions for each skill level.
- **Simple Link Parsing:** For embedding links, you could implement a simple parser that finds URLs in the description text and automatically turns them into clickable `<a>` tags when rendered. A more advanced approach could use a simple syntax like `[Google](https://www.google.com)`.
- **Backend and Data Persistence:** As the project grows, `localStorage` will become limiting. For features like sharing, user accounts, and the TTRPG, consider moving to a backend service like Firebase or Supabase. They offer simple databases, authentication, and hosting that can scale with your project.

---

## Changelog

**2025-10-08:**
- **UI Cleanup (Card Header):** Reworked the header on each item card. Removed the `[+] Lvl [-]` controls and replaced them with a static display of the item's type and tier (e.g., "Skill (3)" or "Faculty (0)"). This provides a cleaner look and emphasizes the item's classification over its current level.
- **UI Feature (Expandable Descriptions):** Added a "Show/Hide Details" link to each card. This toggles a new section that displays all five level descriptions for the item, providing deep information on demand without cluttering the primary interface.

**2025-10-02 (Evening):**
- **UI Overhaul:** The application now features a full-width layout to better accommodate large skill trees and has a more modern, consistent design. The subtitle has also been updated to better reflect the project's vision.
- **"Quick Add" Prerequisite:** A new '+' button has been added to each item card, allowing users to quickly open the creation modal with that item pre-populated as a prerequisite, streamlining the tree-building process.
- **Import/Export Functionality:** Users can now export their entire skill tree to a JSON file as a backup and import it back into the application, ensuring data persistence and portability.
- **Discovery Mode:** A new "Discovery Mode" has been added. When enabled, any skill whose prerequisites have not been met to the required level will be "locked," showing only "???" This adds a gamified element of progression and exploration to the skill tree.

**2025-10-02:**
- **Horizontal & Vertical Tree Views:** The tree view has been split into two distinct modes: a classic top-down "V-Tree" and a new left-to-right "H-Tree" for alternative visualization.
- **Skill Leveling System:** A comprehensive 0-5 leveling system has been implemented. Users can now track their proficiency for each skill and faculty directly on the item card.
- **Prerequisite Levels:** When creating or editing a skill, users can now specify the required level (1-5) of a prerequisite needed to unlock the new skill.
- **Detailed Level Descriptions:** The "Add/Edit" modal now features a tabbed interface allowing for unique descriptions to be added for each of the 5 proficiency levels. The relevant description is displayed on the skill card based on its current level.
- **Embedded Links:** URLs included in any description field are now automatically converted into clickable hyperlinks, opening in a new tab.
- **Data Migration:** The underlying data structure has been upgraded to support the new features. A migration process is in place to automatically and seamlessly update existing data stored in the browser's local storage to the new format.

**2025-10-02 (Previous):**
- **Vertical Tree View:** The tree view layout is now top-down and vertical for a more intuitive genealogical feel.
- **Prerequisite Instancing:** Prerequisites are now properly "instanced," meaning they appear correctly under every skill that requires them.
- **Default Expanded View:** The skill tree now loads with all branches expanded by default for a complete overview.
- **Expand/Collapse All:** Added "Collapse All" and "Expand All" buttons for easy navigation of large trees.

**2025-09-30 (Afternoon):**
- **Interactive Tree View:** Implemented a new genealogical tree view that visually represents skill dependencies with connecting lines.
- **Expand/Collapse:** Added the ability to expand and collapse branches of the skill tree for easier navigation.
- **Separated Trees:** Each skill tree is now displayed as a separate, centered entity.

**2025-09-30 (Morning):**
- **Full CRUD Functionality:** Added the ability to create, edit, and delete skills and faculties.
- **Sorting Views:** Implemented "Alphabetical" and "Tree" view sorting options to organize the skill tree.
- **Color-Coding:** Skills and Faculties are now visually distinguished by color.
- **New Item Type:** Added "Faculties" as a new type of base item that can be used as prerequisites.
- **Expanded Default Data:** Included two new skill trees ("Barrel Roll" and "Oral Dissertation") to showcase the new features.