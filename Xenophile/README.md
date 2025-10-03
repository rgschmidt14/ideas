# Xenophile

A game of skill creation and combination.

## Project Vision

Xenophile aims to be a comprehensive tool for personal growth and skill acquisition, capable of guiding a user from learning the most basic actions (like walking) to mastering highly complex and specialized skills (like performing a trick dunk in basketball or delivering a flawless academic dissertation). The core idea is to map out the entire "skill tree" of life, showing how abilities build upon one another.

The system is built on two fundamental concepts:
- **Skills:** The actions and abilities a person can learn and perform. Each skill will have its own leveling system (from 0 for complete inability to 5 for world-class mastery) to track progress.
- **Faculties:** The tools, innate talents, or external resources required to perform a skill. A faculty could be a physical object (a basketball, a magic wand), a biological trait (wings, opposable thumbs), or even an abstract concept (priesthood authority, a gift for a friend).

Ultimately, this skill tree will serve as the foundation for a real-world, interactive Tabletop RPG, where players can track their character's development and even apply it to their own lives.

## Description

Xenophile is a tool that allows you to create skills and link them together in a skill tree. New skills are formed by combining two prerequisite skills or "faculties". The goal is to create a complex and interconnected web of abilities from a set of basic building blocks.

## Future Ideas (To-Do List)

- [x] Advanced graphical visualization of the skill tree.
- [x] **Skill Leveling System:** Implement a 0-5 leveling system for each skill and faculty to track user proficiency. (Done 2025-10-02)
- [x] **Prerequisite Levels:** Allow specifying the required level of a prerequisite to unlock Level 1 of a new skill (e.g., "Palm Basketball (Level 3)" is needed for "Dunk (Level 1)"). (Done 2025-10-02)
- [x] **Detailed Level Descriptions:** Add fields in the creation/edit modal for descriptions for each of the 5 proficiency levels. (Done 2025-10-02)
- [ ] **"Quick Add" Prerequisite:** Add a '+' button next to items in the tree view to open the creation modal with that item pre-populated as a prerequisite.
- [x] **Embedded Links:** Create an easy way to add and display hyperlinks (e.g., to YouTube tutorials or articles) within skill descriptions. (Done 2025-10-02)
- [ ] **Skill "Pass-Off" System:** Develop a mechanism or checklist to test if a user has learned a skill to a certain level.
- [ ] Ability to export/import skill trees.
- [ ] A "discovery" mode where you can only see skills you have the prerequisites for.
- [ ] More complex prerequisite rules (e.g., more than 2, OR conditions).
- [ ] Sharing skill trees with others.

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