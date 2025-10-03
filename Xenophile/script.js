document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const addSkillBtn = document.getElementById('add-skill-btn');
    const modal = document.getElementById('add-edit-modal');
    const modalTitle = document.getElementById('modal-title');
    const closeBtn = document.querySelector('.close-btn');
    const addEditForm = document.getElementById('add-edit-form');
    const isTierZeroCheckbox = document.getElementById('is-tier-zero');
    const prerequisitesContainer = document.getElementById('prerequisites-container');
    const skillTreeContainer = document.getElementById('skill-tree-container');
    const prereq1Select = document.getElementById('prerequisite1');
    const prereq2Select = document.getElementById('prerequisite2');
    const editItemIdInput = document.getElementById('edit-item-id');
    const itemNameInput = document.getElementById('item-name');
    const itemDescriptionInput = document.getElementById('item-description');
    const itemTypeSelect = document.getElementById('item-type');
    const viewAlphaBtn = document.getElementById('view-alpha-btn');
    const viewVTreeBtn = document.getElementById('view-vtree-btn');
    const viewHTreeBtn = document.getElementById('view-htree-btn');
    const treeControls = document.querySelector('.tree-controls');
    const collapseAllBtn = document.getElementById('collapse-all-btn');
    const expandAllBtn = document.getElementById('expand-all-btn');
    const importBtn = document.getElementById('import-btn');
    const exportBtn = document.getElementById('export-btn');
    const importFileInput = document.getElementById('import-file-input');
    const discoveryModeToggle = document.getElementById('discovery-mode-toggle');


    // --- Game Data & Constants ---
    const STORAGE_KEY = 'Xenophile';
    const VIEW_MODE_KEY = 'XenophileViewMode';
    const DISCOVERY_MODE_KEY = 'XenophileDiscoveryMode';
    let gameData = {
        skills: [],
        faculties: [],
    };
    let currentView = 'alpha'; // 'alpha', 'v-tree', or 'h-tree'
    let discoveryModeEnabled = false;

    // --- Data Functions ---
    function saveData() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(gameData));
        localStorage.setItem(VIEW_MODE_KEY, currentView);
        localStorage.setItem(DISCOVERY_MODE_KEY, JSON.stringify(discoveryModeEnabled));
    }

    function loadData() {
        const savedData = localStorage.getItem(STORAGE_KEY);
        const savedView = localStorage.getItem(VIEW_MODE_KEY);
        const savedDiscovery = localStorage.getItem(DISCOVERY_MODE_KEY);

        if (savedView) {
            currentView = savedView;
        }
        if (savedDiscovery) {
            discoveryModeEnabled = JSON.parse(savedDiscovery);
            discoveryModeToggle.checked = discoveryModeEnabled;
        }

        if (savedData) {
             try {
                const parsedData = JSON.parse(savedData);
                if (parsedData.skills || parsedData.faculties) {
                    gameData = parsedData;
                    // --- Data Migration Logic ---
                    let needsSave = false;
                    const allItems = [...gameData.skills, ...gameData.faculties];
                    allItems.forEach(item => {
                        // 1. Add level and levelDescriptions if they don't exist
                        if (item.level === undefined) {
                            item.level = 0;
                            needsSave = true;
                        }
                        if (item.levelDescriptions === undefined) {
                            item.levelDescriptions = { '1': '', '2': '', '3': '', '4': '', '5': '' };
                            needsSave = true;
                        }
                        // 2. Migrate prerequisites from string[] to object[]
                        if (item.prerequisites && item.prerequisites.length > 0 && typeof item.prerequisites[0] === 'string') {
                            item.prerequisites = item.prerequisites.map(prereqId => ({ id: prereqId, requiredLevel: 1 }));
                            needsSave = true;
                        }
                    });

                    if (needsSave) {
                        console.log('Xenophile: Migrated data to new format.');
                        saveData();
                    }
                    return;
                }
            } catch (error) {
                console.error("Error parsing saved data, initializing with defaults.", error);
                initializeDefaultData();
                saveData();
                return;
            }
        }
        initializeDefaultData();
        saveData();
    }

    function initializeDefaultData() {
        gameData.skills = [
            // Tier 0
            { id: 'skill_move_0', name: 'Move', description: 'The ability to change location.', prerequisites: [], tier: 0, type: 'skill', level: 0, levelDescriptions: { '1': '', '2': '', '3': '', '4': '', '5': '' } },
            { id: 'skill_think_0', name: 'Think', description: 'The ability to process information and form ideas.', prerequisites: [], tier: 0, type: 'skill', level: 0, levelDescriptions: { '1': '', '2': '', '3': '', '4': '', '5': '' } },
            { id: 'skill_talk_0', name: 'Talk', description: 'The ability to communicate with sounds.', prerequisites: [], tier: 0, type: 'skill', level: 0, levelDescriptions: { '1': '', '2': '', '3': '', '4': '', '5': '' } },
            { id: 'skill_carry_1', name: 'Carry', description: 'Hold something in your hand.', prerequisites: [{id: 'skill_move_0', requiredLevel: 1}, {id: 'faculty_thumbs_0', requiredLevel: 1}], tier: 1, type: 'skill', level: 0, levelDescriptions: { '1': '', '2': '', '3': '', '4': '', '5': '' } },

            // Barrel Roll Tree
            { id: 'skill_fly_1', name: 'Fly', description: 'Gain altitude and move through the air.', prerequisites: [{id: 'faculty_wings_0', requiredLevel: 1}, {id: 'skill_move_0', requiredLevel: 1}], tier: 1, type: 'skill', level: 0, levelDescriptions: { '1': '', '2': '', '3': '', '4': '', '5': '' } },
            { id: 'skill_barrel_roll_2', name: 'Barrel Roll', description: 'Perform a full lateral roll while in flight.', prerequisites: [{id: 'skill_fly_1', requiredLevel: 2}, {id: 'skill_move_0', requiredLevel: 1}], tier: 2, type: 'skill', level: 0, levelDescriptions: { '1': '', '2': '', '3': '', '4': '', '5': '' } },

            // Oral Dissertation Tree
            { id: 'skill_formulate_argument_1', name: 'Formulate Argument', description: 'Create a structured and logical line of reasoning.', prerequisites: [{id: 'skill_think_0', requiredLevel: 1}, {id: 'skill_talk_0', requiredLevel: 1}], tier: 1, type: 'skill', level: 0, levelDescriptions: { '1': '', '2': '', '3': '', '4': '', '5': '' } },
            { id: 'skill_structure_narrative_2', name: 'Structure Narrative', description: 'Organize arguments into a compelling story.', prerequisites: [{id: 'skill_formulate_argument_1', requiredLevel: 2}, {id: 'skill_think_0', requiredLevel: 2}], tier: 2, type: 'skill', level: 0, levelDescriptions: { '1': '', '2': '', '3': '', '4': '', '5': '' } },
            { id: 'skill_public_speaking_3', name: 'Public Speaking', description: 'Clearly articulate a narrative to an audience.', prerequisites: [{id: 'skill_structure_narrative_2', requiredLevel: 3}, {id: 'skill_talk_0', requiredLevel: 2}], tier: 3, type: 'skill', level: 0, levelDescriptions: { '1': '', '2': '', '3': '', '4': '', '5': '' } },
            { id: 'skill_defend_thesis_4', name: 'Defend Thesis', description: 'Respond to challenges and questions about your arguments.', prerequisites: [{id: 'skill_public_speaking_3', requiredLevel: 3}, {id: 'skill_formulate_argument_1', requiredLevel: 3}], tier: 4, type: 'skill', level: 0, levelDescriptions: { '1': '', '2': '', '3': '', '4': '', '5': '' } },
            { id: 'skill_oral_dissertation_5', name: 'Oral Dissertation', description: 'Deliver a comprehensive academic presentation to a panel of experts.', prerequisites: [{id: 'skill_defend_thesis_4', requiredLevel: 4}, {id: 'skill_public_speaking_3', requiredLevel: 4}], tier: 5, type: 'skill', level: 0, levelDescriptions: { '1': '', '2': '', '3': '', '4': '', '5': '' } },
        ];
        gameData.faculties = [
            // Tier 0
            { id: 'faculty_wings_0', name: 'Wings', description: 'Appendages that allow for flight.', prerequisites: [], tier: 0, type: 'faculty', level: 0, levelDescriptions: { '1': '', '2': '', '3': '', '4': '', '5': '' } },
            { id: 'faculty_gills_0', name: 'Gills', description: 'Organs that allow for breathing underwater.', prerequisites: [], tier: 0, type: 'faculty', level: 0, levelDescriptions: { '1': '', '2': '', '3': '', '4': '', '5': '' } },
            { id: 'faculty_thumbs_0', name: 'Opposable Thumbs', description: 'Thumbs that can be moved to touch the other fingers, allowing for grasping.', prerequisites: [], tier: 0, type: 'faculty', level: 0, levelDescriptions: { '1': '', '2': '', '3': '', '4': '', '5': '' } },
        ];
        // We need to ensure all tiers are correct after initializing
        updateAllDependentTiers();
    }

    function getAllItems() {
        return [...gameData.skills, ...gameData.faculties];
    }

    function getItemById(id) {
        return getAllItems().find(item => item.id === id);
    }

    function populatePrerequisiteDropdowns(currentItemId = null) {
        const allPrereqs = getAllItems().sort((a, b) => a.name.localeCompare(b.name));

        prereq1Select.innerHTML = '<option value="">None</option>';
        prereq2Select.innerHTML = '<option value="">None</option>';

        allPrereqs.forEach(item => {
            if (item.id === currentItemId) return;

            const option1 = document.createElement('option');
            option1.value = item.id;
            option1.textContent = `${item.name} (T${item.tier}) [${item.type}]`;
            prereq1Select.appendChild(option1);

            const option2 = document.createElement('option');
            option2.value = item.id;
            option2.textContent = `${item.name} (T${item.tier}) [${item.type}]`;
            prereq2Select.appendChild(option2);
        });
    }

    function updateAllDependentTiers() {
        const allItems = getAllItems();
        let changed = true;
        while(changed) {
            changed = false;
            allItems.forEach(item => {
                let newTier;
                if(item.prerequisites.length > 0) {
                    const prereqTiers = item.prerequisites.map(prereqObj => {
                        const prereq = getItemById(prereqObj.id);
                        return prereq ? prereq.tier : -1;
                    });
                    newTier = Math.max(...prereqTiers) + 1;
                } else {
                    newTier = 0;
                }
                if(item.tier !== newTier) {
                    item.tier = newTier;
                    changed = true;
                }
            });
        }
    }


    // --- Modal Logic ---
    function setupLevelDescriptionTabs(item) {
        const tabsContainer = document.querySelector('.level-description-tabs');
        const contentContainer = document.getElementById('level-descriptions-content');
        contentContainer.innerHTML = ''; // Clear previous content

        // Create textareas for each level
        for (let i = 1; i <= 5; i++) {
            const textarea = document.createElement('textarea');
            textarea.id = `level-desc-${i}`;
            textarea.placeholder = `Description for Level ${i}...`;
            textarea.style.display = i === 1 ? 'block' : 'none'; // Show first tab by default
            if (item && item.levelDescriptions) {
                textarea.value = item.levelDescriptions[i] || '';
            }
            contentContainer.appendChild(textarea);
        }

        // Tab switching logic
        tabsContainer.addEventListener('click', (e) => {
            if (e.target.matches('.tab-btn')) {
                const targetTab = e.target.dataset.tab;

                // Update button active state
                tabsContainer.querySelectorAll('.tab-btn').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.tab === targetTab);
                });

                // Update textarea visibility
                contentContainer.querySelectorAll('textarea').forEach((area, index) => {
                    area.style.display = (index + 1).toString() === targetTab ? 'block' : 'none';
                });
            }
        });

         // Set the first tab as active by default
        tabsContainer.querySelector('.tab-btn[data-tab="1"]').classList.add('active');
    }

    function openModalForCreate() {
        modalTitle.textContent = 'Create New Item';
        addEditForm.reset();
        editItemIdInput.value = '';
        prerequisitesContainer.style.display = 'block';
        isTierZeroCheckbox.checked = false;
        itemTypeSelect.disabled = false;
        populatePrerequisiteDropdowns();
        setupLevelDescriptionTabs(null); // Setup for a new item
        document.getElementById('prereq1-level').value = 1;
        document.getElementById('prereq2-level').value = 1;
        modal.style.display = 'block';
    }

    function openModalForQuickAdd(prereqId) {
        openModalForCreate(); // Start with a fresh modal
        modalTitle.textContent = 'Create New Dependent Item';

        // Pre-select the prerequisite
        const prereqItem = getItemById(prereqId);
        if(prereqItem) {
            prereq1Select.value = prereqId;
            isTierZeroCheckbox.checked = false;
            prerequisitesContainer.style.display = 'block';
        }
    }

    function openModalForEdit(itemId) {
        const item = getItemById(itemId);
        if (!item) return;

        modalTitle.textContent = `Edit: ${item.name}`;
        addEditForm.reset();
        editItemIdInput.value = itemId;

        itemNameInput.value = item.name;
        itemDescriptionInput.value = item.description;
        itemTypeSelect.value = item.type;
        itemTypeSelect.disabled = true;

        populatePrerequisiteDropdowns(itemId);
        setupLevelDescriptionTabs(item); // Populate with existing data

        if (item.tier === 0 || item.prerequisites.length === 0) {
            isTierZeroCheckbox.checked = true;
            prerequisitesContainer.style.display = 'none';
        } else {
            isTierZeroCheckbox.checked = false;
            prerequisitesContainer.style.display = 'block';
            const prereq1 = item.prerequisites[0];
            const prereq2 = item.prerequisites[1];
            prereq1Select.value = prereq1 ? prereq1.id : '';
            document.getElementById('prereq1-level').value = prereq1 ? prereq1.requiredLevel : 1;
            prereq2Select.value = prereq2 ? prereq2.id : '';
            document.getElementById('prereq2-level').value = prereq2 ? prereq2.requiredLevel : 1;
        }

        modal.style.display = 'block';
    }

    function closeModal() {
        modal.style.display = 'none';
    }

    addSkillBtn.addEventListener('click', openModalForCreate);
    closeBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeModal();
        }
    });

    // --- Form Logic ---
    isTierZeroCheckbox.addEventListener('change', () => {
        prerequisitesContainer.style.display = isTierZeroCheckbox.checked ? 'none' : 'block';
    });

    addEditForm.addEventListener('submit', (event) => {
        event.preventDefault();

        const id = editItemIdInput.value;
        const name = itemNameInput.value.trim();
        const description = itemDescriptionInput.value.trim();
        const type = itemTypeSelect.value;
        const isTierZero = isTierZeroCheckbox.checked;

        if (!name || !description) {
            alert('Name and Description are required.');
            return;
        }

        let prerequisites = [];
        if (!isTierZero) {
            const prereq1Id = prereq1Select.value;
            const prereq2Id = prereq2Select.value;
            const prereq1Level = parseInt(document.getElementById('prereq1-level').value) || 1;
            const prereq2Level = parseInt(document.getElementById('prereq2-level').value) || 1;


             if (prereq1Id === id || prereq2Id === id) {
                alert('An item cannot be its own prerequisite.');
                return;
            }
            // Only add unique, non-empty prerequisites
            if(prereq1Id) prerequisites.push({ id: prereq1Id, requiredLevel: prereq1Level });
            if(prereq2Id && prereq1Id !== prereq2Id) prerequisites.push({ id: prereq2Id, requiredLevel: prereq2Level });

        }

        const levelDescriptions = {};
        for (let i = 1; i <= 5; i++) {
            levelDescriptions[i] = document.getElementById(`level-desc-${i}`).value.trim();
        }

        if (id) { // --- Editing Existing Item ---
            const itemToUpdate = type === 'skill'
                ? gameData.skills.find(i => i.id === id)
                : gameData.faculties.find(i => i.id === id);

            if (itemToUpdate) {
                itemToUpdate.name = name;
                itemToUpdate.description = description;
                itemToUpdate.prerequisites = prerequisites;
                itemToUpdate.levelDescriptions = levelDescriptions;
            }
        } else { // --- Creating New Item ---
            const newItem = {
                id: `${type}_${name.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}`,
                name,
                description,
                prerequisites,
                tier: 0, // Tier will be calculated by updateAllDependentTiers
                type,
                level: 0,
                levelDescriptions: { '1': '', '2': '', '3': '', '4': '', '5': '' }
            };
            gameData[type === 'skill' ? 'skills' : 'faculties'].push(newItem);
        }

        updateAllDependentTiers();
        saveData();
        setView(currentView);
        closeModal();
    });

    // --- Deletion Logic ---
    function deleteItem(itemId) {
        const allItems = getAllItems();
        // Update check to look inside prerequisite objects
        const isPrerequisite = allItems.some(item => item.prerequisites.some(p => p.id === itemId));

        if (isPrerequisite) {
            alert('Cannot delete this item as it is a prerequisite for another item. Please remove the dependency first.');
            return;
        }

        const itemToDelete = getItemById(itemId);
        if (!itemToDelete) return;

        if (itemToDelete.type === 'skill') {
            gameData.skills = gameData.skills.filter(item => item.id !== itemId);
        } else {
            gameData.faculties = gameData.faculties.filter(item => item.id !== itemId);
        }

        updateAllDependentTiers();
        saveData();
        setView(currentView);
    }

    // --- View and Sorting Logic ---
    function setView(view) {
        currentView = view;
        viewAlphaBtn.classList.toggle('active', view === 'alpha');
        viewVTreeBtn.classList.toggle('active', view === 'v-tree');
        viewHTreeBtn.classList.toggle('active', view === 'h-tree');

        const vTreeStylesheet = document.getElementById('v-tree-stylesheet');
        const hTreeStylesheet = document.getElementById('h-tree-stylesheet');

        // Reset styles and container properties
        skillTreeContainer.className = '';
        skillTreeContainer.style.position = '';


        if (view === 'v-tree') {
            treeControls.style.display = 'flex';
            vTreeStylesheet.disabled = false;
            hTreeStylesheet.disabled = true;
            renderGenealogyTree();
        } else if (view === 'h-tree') {
            treeControls.style.display = 'flex';
            vTreeStylesheet.disabled = true;
            hTreeStylesheet.disabled = false;
            renderHorizontalTree();
        } else { // 'alpha'
            treeControls.style.display = 'none';
            vTreeStylesheet.disabled = true;
            hTreeStylesheet.disabled = true;
            renderSkillTree();
        }

        saveData(); // Save the new view state
    }

    viewAlphaBtn.addEventListener('click', () => setView('alpha'));
    viewVTreeBtn.addEventListener('click', () => setView('v-tree'));
    viewHTreeBtn.addEventListener('click', () => setView('h-tree'));


    function setAllBranchesCollapsed(collapsed) {
        const isHorizontal = currentView === 'h-tree';
        const childrenSelector = isHorizontal ? '.h-tree-children' : '.tree-children';
        const toggleSelector = isHorizontal ? '.toggle-children-h' : '.toggle-children';

        const allChildrenContainers = skillTreeContainer.querySelectorAll(childrenSelector);
        const allToggleButtons = skillTreeContainer.querySelectorAll(toggleSelector);

        allChildrenContainers.forEach(container => container.classList.toggle('collapsed', collapsed));
        allToggleButtons.forEach(button => button.classList.toggle('collapsed', collapsed));

        // Redraw lines after a short delay
        setTimeout(() => {
            if (isHorizontal) {
                const svg = skillTreeContainer.querySelector('svg.h-connector-lines');
                if (svg) drawHorizontalConnectingLines(svg);
            } else {
                const svg = skillTreeContainer.querySelector('svg.connector-lines');
                if (svg) drawConnectingLines(svg);
            }
        }, 50);
    }


    collapseAllBtn.addEventListener('click', () => setAllBranchesCollapsed(true));
    expandAllBtn.addEventListener('click', () => setAllBranchesCollapsed(false));

    // --- Shared Rendering Logic ---
    function getTreeRoots() {
        const allItems = getAllItems();
        const prerequisiteIds = new Set();
        allItems.forEach(item => {
        item.prerequisites.forEach(prereqObj => {
            prerequisiteIds.add(prereqObj.id);
            });
        });
        return allItems.filter(item => !prerequisiteIds.has(item.id));
    }


    // --- Rendering ---
    function renderHorizontalTree() {
        skillTreeContainer.innerHTML = '';
        skillTreeContainer.style.position = 'relative';
        const allItems = getAllItems();
        if (allItems.length === 0) {
            skillTreeContainer.innerHTML = '<p>No items to display.</p>';
            return;
        }

        const roots = getTreeRoots();
        const treeContainer = document.createElement('div');
        treeContainer.className = 'h-tree-container';

        roots.forEach(rootItem => {
            const treeRootElement = document.createElement('div');
            treeRootElement.className = 'h-tree-root';
            renderHorizontalTreeBranch(rootItem, treeRootElement);
            treeContainer.appendChild(treeRootElement);
        });

        skillTreeContainer.appendChild(treeContainer);

        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.classList.add('h-connector-lines');
        skillTreeContainer.insertBefore(svg, skillTreeContainer.firstChild);
        setTimeout(() => drawHorizontalConnectingLines(svg), 100);
    }

    function renderHorizontalTreeBranch(item, parentElement) {
        if (!item) return;

        const nodeGroup = document.createElement('div');
        nodeGroup.className = 'h-tree-node-group';

        const card = createSkillCard(item);
        nodeGroup.appendChild(card);

        const hasPrerequisites = item.prerequisites && item.prerequisites.length > 0;
        if (hasPrerequisites) {
            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'h-tree-children';

        item.prerequisites.forEach(prereqObj => {
            const prereqItem = getItemById(prereqObj.id);
                renderHorizontalTreeBranch(prereqItem, childrenContainer);
            });
            nodeGroup.appendChild(childrenContainer);

            const toggleBtn = document.createElement('button');
            toggleBtn.className = 'toggle-children-h';
            card.appendChild(toggleBtn);

            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isCollapsed = childrenContainer.classList.toggle('collapsed');
                toggleBtn.classList.toggle('collapsed', isCollapsed);
                setTimeout(() => {
                    const svg = skillTreeContainer.querySelector('svg.h-connector-lines');
                    if (svg) drawHorizontalConnectingLines(svg);
                }, 200);
            });
        }
        parentElement.appendChild(nodeGroup);
    }


    function renderGenealogyTree() {
        skillTreeContainer.innerHTML = '';
        skillTreeContainer.style.position = 'relative';
        const allItems = getAllItems();
        if (allItems.length === 0) {
            skillTreeContainer.innerHTML = '<p>No items to display.</p>';
            return;
        }

        const roots = getTreeRoots();
        const treeContainer = document.createElement('div');
        treeContainer.className = 'tree-container';

        roots.forEach(rootItem => {
            const treeRootElement = document.createElement('div');
            treeRootElement.className = 'tree-root';
            renderVerticalTreeBranch(rootItem, treeRootElement);
            treeContainer.appendChild(treeRootElement);
        });

        skillTreeContainer.appendChild(treeContainer);

        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.classList.add('connector-lines');
        skillTreeContainer.insertBefore(svg, skillTreeContainer.firstChild);
        setTimeout(() => drawConnectingLines(svg), 100);
    }

    function renderVerticalTreeBranch(item, parentElement) {
        if (!item) return;

        const nodeGroup = document.createElement('div');
        nodeGroup.className = 'tree-node-group';

        const card = createSkillCard(item);
        nodeGroup.appendChild(card);

        const hasPrerequisites = item.prerequisites && item.prerequisites.length > 0;
        if (hasPrerequisites) {
            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'tree-children';

        item.prerequisites.forEach(prereqObj => {
            const prereqItem = getItemById(prereqObj.id);
                renderVerticalTreeBranch(prereqItem, childrenContainer);
            });
            nodeGroup.appendChild(childrenContainer);

            // Add toggle button
            const toggleBtn = document.createElement('button');
            toggleBtn.className = 'toggle-children'; // Default to expanded
            card.appendChild(toggleBtn);

            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isCollapsed = childrenContainer.classList.toggle('collapsed');
                toggleBtn.classList.toggle('collapsed', isCollapsed);
                // Redraw lines after animation
                setTimeout(() => {
                    const svg = skillTreeContainer.querySelector('svg.connector-lines');
                    if (svg) drawConnectingLines(svg);
                }, 200);
            });
        }
        parentElement.appendChild(nodeGroup);
    }


function arePrerequisitesMet(item) {
    if (!item.prerequisites || item.prerequisites.length === 0) {
        return true; // No prerequisites, always considered met.
    }
    return item.prerequisites.every(prereqObj => {
        const prereqItem = getItemById(prereqObj.id);
        // If a prerequisite item doesn't exist for some reason, fail open (treat as met)
        if (!prereqItem) return true;
        // Check if the user's level for the prerequisite item meets or exceeds the required level
        return (prereqItem.level || 0) >= prereqObj.requiredLevel;
    });
}

function changeItemLevel(itemId, delta) {
    const item = getItemById(itemId);
    if (!item) return;

    let newLevel = (item.level || 0) + delta;
    if (newLevel < 0) newLevel = 0;
    if (newLevel > 5) newLevel = 5;

    item.level = newLevel;
    saveData();
    setView(currentView); // Re-render to show updated level description and state
}

    function createSkillCard(item) {
        const card = document.createElement('div');
        card.className = 'skill-card';
        card.dataset.id = item.id;
        card.dataset.type = item.type;

        // --- Discovery Mode Logic ---
        const isDiscovered = arePrerequisitesMet(item);
        if (discoveryModeEnabled && !isDiscovered) {
            card.classList.add('locked');
            const cardTitle = document.createElement('h3');
            cardTitle.textContent = '???';
            card.appendChild(cardTitle);
            return card; // Return the locked card
        }


    const titleContainer = document.createElement('div');
    titleContainer.className = 'card-title-container';

    const cardTitle = document.createElement('h3');
    cardTitle.textContent = item.name;

    // --- Level Display and Controls ---
    const levelContainer = document.createElement('div');
    levelContainer.className = 'level-container';

    const levelDownBtn = document.createElement('button');
    levelDownBtn.className = 'level-btn';
    levelDownBtn.textContent = '−';
    levelDownBtn.onclick = () => changeItemLevel(item.id, -1);

    const levelDisplay = document.createElement('span');
    levelDisplay.className = 'level-display';
    levelDisplay.textContent = `Lvl ${item.level || 0}`;

    const levelUpBtn = document.createElement('button');
    levelUpBtn.className = 'level-btn';
    levelUpBtn.textContent = '+';
    levelUpBtn.onclick = () => changeItemLevel(item.id, 1);

    levelContainer.appendChild(levelDownBtn);
    levelContainer.appendChild(levelDisplay);
    levelContainer.appendChild(levelUpBtn);

    titleContainer.appendChild(cardTitle);
    titleContainer.appendChild(levelContainer);

        const cardType = document.createElement('p');
        cardType.className = 'skill-type';
        cardType.textContent = `Type: ${item.type.charAt(0).toUpperCase() + item.type.slice(1)}`;

        const cardDescription = document.createElement('p');
    const descriptionText = item.level > 0 && item.levelDescriptions[item.level]
        ? `<strong>Lvl ${item.level} Desc:</strong> ${item.levelDescriptions[item.level]}`
        : item.description;

    // Simple URL finder and replacer
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    cardDescription.innerHTML = descriptionText.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');


        const cardControls = document.createElement('div');
        cardControls.className = 'card-controls';

        const quickAddBtn = document.createElement('button');
        quickAddBtn.textContent = '+';
        quickAddBtn.title = 'Create a new item with this as a prerequisite';
        quickAddBtn.className = 'quick-add-btn';
        quickAddBtn.onclick = () => openModalForQuickAdd(item.id);

        const editBtn = document.createElement('button');
        editBtn.textContent = 'Edit';
        editBtn.className = 'edit-btn';
        editBtn.onclick = () => openModalForEdit(item.id);

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.className = 'delete-btn';
        deleteBtn.onclick = () => {
            if (confirm(`Are you sure you want to delete "${item.name}"?`)) {
                deleteItem(item.id);
            }
        };

        cardControls.appendChild(quickAddBtn);
        cardControls.appendChild(editBtn);
        cardControls.appendChild(deleteBtn);

    card.appendChild(titleContainer);
        card.appendChild(cardType);
        card.appendChild(cardDescription);

        if (item.prerequisites && item.prerequisites.length > 0) {
            const prereqList = document.createElement('div');
            prereqList.className = 'prerequisites-list';
            const prereqTitle = document.createElement('strong');
            prereqTitle.textContent = 'Prerequisites:';
            prereqList.appendChild(prereqTitle);

            const ul = document.createElement('ul');
        item.prerequisites.forEach(prereqObj => {
            const prereqItem = getItemById(prereqObj.id);
                const li = document.createElement('li');
            li.textContent = prereqItem ? `${prereqItem.name} (Lvl ${prereqObj.requiredLevel} Req.)` : 'Unknown';
                ul.appendChild(li);
            });
            prereqList.appendChild(ul);
            card.appendChild(prereqList);
        }

        card.appendChild(cardControls);
        return card;
    }

    function drawHorizontalConnectingLines(svg) {
        svg.innerHTML = '';
        const containerRect = skillTreeContainer.getBoundingClientRect();

        const childCards = Array.from(skillTreeContainer.querySelectorAll('.h-tree-children .skill-card'));

        childCards.forEach(childCard => {
            const childrenContainer = childCard.closest('.h-tree-children');
            if (!childrenContainer || childrenContainer.classList.contains('collapsed')) {
                return;
            }

            const parentCard = childrenContainer.parentElement.querySelector(':scope > .skill-card');

            if (parentCard) {
                const parentRect = parentCard.getBoundingClientRect();
                const childRect = childCard.getBoundingClientRect();

                // From right-center of parent
                const startX = parentRect.right - containerRect.left;
                const startY = parentRect.top - containerRect.top + parentRect.height / 2;

                // To left-center of child
                const endX = childRect.left - containerRect.left;
                const endY = childRect.top - containerRect.top + childRect.height / 2;

                if (startX === endX && startY === endY) return;

                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                // Use a bezier curve for a smoother horizontal look
                path.setAttribute('d', `M ${startX} ${startY} C ${startX + 50} ${startY}, ${endX - 50} ${endY}, ${endX} ${endY}`);
                path.setAttribute('stroke', '#ccc');
                path.setAttribute('stroke-width', '2');
                path.setAttribute('fill', 'none');
                svg.appendChild(path);
            }
        });
    }

    function drawConnectingLines(svg) {
        svg.innerHTML = '';
        const containerRect = skillTreeContainer.getBoundingClientRect();

        // Find all cards that are children (i.e., inside a .tree-children container)
        const childCards = Array.from(skillTreeContainer.querySelectorAll('.tree-children .skill-card'));

        childCards.forEach(childCard => {
            const childrenContainer = childCard.closest('.tree-children');

            // Don't draw lines if the container is hidden
            if (!childrenContainer || childrenContainer.classList.contains('collapsed')) {
                return;
            }

            // The parent card is the .skill-card within the same .tree-node-group as the .tree-children container
            const parentCard = childrenContainer.parentElement.querySelector(':scope > .skill-card');

            if (parentCard) {
                const parentRect = parentCard.getBoundingClientRect();
                const childRect = childCard.getBoundingClientRect();

                // From bottom-center of parent
                const startX = parentRect.left - containerRect.left + parentRect.width / 2;
                const startY = parentRect.bottom - containerRect.top;

                // To top-center of child
                const endX = childRect.left - containerRect.left + childRect.width / 2;
                const endY = childRect.top - containerRect.top;

                // Make sure we don't draw line to itself in some weird edge case.
                if (startX === endX && startY === endY) return;

                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                // Use a bezier curve for a smoother vertical look
                path.setAttribute('d', `M ${startX} ${startY} C ${startX} ${startY + 50}, ${endX} ${endY - 50}, ${endX} ${endY}`);
                path.setAttribute('stroke', '#ccc');
                path.setAttribute('stroke-width', '2');
                path.setAttribute('fill', 'none');
                svg.appendChild(path);
            }
        });
    }


    function renderSkillTree() {
        skillTreeContainer.innerHTML = '';
        const allItems = getAllItems();

        if (allItems.length === 0) {
            skillTreeContainer.innerHTML = '<p>No skills or faculties yet. Add one to get started!</p>';
            return;
        }

        let tiers = allItems.reduce((acc, item) => {
            const tier = item.tier;
            if (!acc[tier]) acc[tier] = [];
            acc[tier].push(item);
            return acc;
        }, {});

        const maxTier = Object.keys(tiers).length > 0 ? Math.max(...Object.keys(tiers).map(Number)) : 0;

        // --- Sorting Logic ---
        if (currentView === 'tree') {
            // The new tree view handles its own layout
        } else { // Alphabetical sort
             for (let i = 0; i <= maxTier; i++) {
                if (tiers[i]) {
                    tiers[i].sort((a,b) => a.name.localeCompare(b.name));
                }
            }
        }


        for (let i = 0; i <= maxTier; i++) {
            if (!tiers[i] || tiers[i].length === 0) continue;

            const tierColumn = document.createElement('div');
            tierColumn.className = 'tier-column';

            const tierTitle = document.createElement('h2');
            tierTitle.className = 'tier-title';
            tierTitle.textContent = `Tier ${i}`;
            tierColumn.appendChild(tierTitle);

            tiers[i].forEach(item => {
                const card = createSkillCard(item);
                tierColumn.appendChild(card);
            });

            skillTreeContainer.appendChild(tierColumn);
        }
    }

    // --- Import/Export Logic ---
    function exportData() {
        const dataStr = JSON.stringify(gameData, null, 2); // Pretty print JSON
        const dataBlob = new Blob([dataStr], {type: "application/json"});
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        link.download = `xenophile_backup_${timestamp}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    function importData(event) {
        const file = event.target.files[0];
        if (!file) {
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            if (confirm('Are you sure you want to import this file? This will overwrite all your current data.')) {
                try {
                    const importedData = JSON.parse(e.target.result);
                    // Basic validation
                    if (importedData && importedData.skills !== undefined && importedData.faculties !== undefined) {
                        gameData = importedData;
                        // Run migration logic on imported data just in case it's an old format
                        const allItems = [...gameData.skills, ...gameData.faculties];
                        allItems.forEach(item => {
                            if (item.level === undefined) item.level = 0;
                            if (item.levelDescriptions === undefined) item.levelDescriptions = { '1': '', '2': '', '3': '', '4': '', '5': '' };
                            if (item.prerequisites && item.prerequisites.length > 0 && typeof item.prerequisites[0] === 'string') {
                                item.prerequisites = item.prerequisites.map(prereqId => ({ id: prereqId, requiredLevel: 1 }));
                            }
                        });
                        updateAllDependentTiers();
                        saveData();
                        setView(currentView);
                        alert('Data imported successfully!');
                    } else {
                        alert('Invalid data file. Make sure it is a valid Xenophile export.');
                    }
                } catch (error) {
                    alert('Error reading or parsing the file. Please ensure it is a valid JSON file.');
                    console.error("Import error:", error);
                }
            }
            // Reset file input so the same file can be loaded again
            importFileInput.value = '';
        };
        reader.readAsText(file);
    }

    exportBtn.addEventListener('click', exportData);
    importBtn.addEventListener('click', () => importFileInput.click());
    importFileInput.addEventListener('change', importData);

    discoveryModeToggle.addEventListener('change', () => {
        discoveryModeEnabled = discoveryModeToggle.checked;
        saveData();
        setView(currentView); // Re-render the view with the new mode
    });


    // --- Initialization ---
    function init() {
        loadData();
        setView(currentView); // Set initial view from loaded data
    }

    init();
});