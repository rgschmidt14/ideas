document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const addSkillBtn = document.getElementById('add-skill-btn');
    const modal = document.getElementById('add-edit-modal');
    const modalTitle = document.getElementById('modal-title');
    const closeBtn = document.querySelector('.close-btn');
    const addEditForm = document.getElementById('add-edit-form');
    const isTierZeroCheckbox = document.getElementById('is-tier-zero');
    const parentsContainer = document.getElementById('parents-container');
    const skillTreeContainer = document.getElementById('skill-tree-container');
    const parent1Select = document.getElementById('parent1');
    const parent2Select = document.getElementById('parent2');
    const editItemIdInput = document.getElementById('edit-item-id');
    const itemNameInput = document.getElementById('item-name');
    const itemDescriptionInput = document.getElementById('item-description');
    const itemTypeSelect = document.getElementById('item-type');
    const viewVTreeBtn = document.getElementById('view-vtree-btn');
    const viewHTreeBtn = document.getElementById('view-htree-btn');
    const viewExplorerBtn = document.getElementById('view-explorer-btn');
    const viewGlobalBtn = document.getElementById('view-global-btn');
    const treeControls = document.querySelector('.tree-controls');
    const collapseAllBtn = document.getElementById('collapse-all-btn');
    const expandAllBtn = document.getElementById('expand-all-btn');
    const importBtn = document.getElementById('import-btn');
    const exportBtn = document.getElementById('export-btn');
    const importFileInput = document.getElementById('import-file-input');
    const discoveryModeToggle = document.getElementById('discovery-mode-toggle');

    // Panes and Search
    const leftPane = document.getElementById('left-pane');
    const rightPane = document.getElementById('right-pane');
    const leftPaneToggle = document.getElementById('left-pane-toggle');
    const rightPaneToggle = document.getElementById('right-pane-toggle');
    const searchBar = document.getElementById('search-bar');
    const searchResultsContainer = document.getElementById('search-results-container');
    const filterCheckboxes = document.querySelectorAll('.filter-checkbox');
    const sortSelect = document.getElementById('sort-select');

    // Character Creator Elements
    const newCharNameInput = document.getElementById('new-char-name');
    const createCharBtn = document.getElementById('create-char-btn');
    const charSelect = document.getElementById('char-select');
    const characterSheetContainer = document.getElementById('character-sheet-container');


    // --- Game Data & Constants ---
    const STORAGE_KEY = 'Xenophile';
    const VIEW_MODE_KEY = 'XenophileViewMode';
    const DISCOVERY_MODE_KEY = 'XenophileDiscoveryMode';
    const CURRENT_CHAR_KEY = 'XenophileCurrentChar';
    let gameData = {
        skills: [],
        faculties: [],
        factors: [],
        characters: [],
    };
    let currentView = 'explorer'; // 'explorer', 'v-tree', 'h-tree', or 'global'
    let discoveryModeEnabled = false;
    let activeExplorerItem = null; // ID of the item in the explorer view
    let currentCharacterId = null;

    // --- Pane Management ---
    function togglePane(pane, isCollapsing) {
        pane.classList.toggle('collapsed', isCollapsing);
        const isMobile = window.innerWidth <= 768;

        if (pane.id === 'left-pane') {
            rightPaneToggle.style.display = isCollapsing ? 'flex' : 'none';
            if (isCollapsing && isMobile) {
                leftPaneToggle.textContent = 'v';
            } else if (!isCollapsing && isMobile) {
                leftPaneToggle.textContent = '^';
            } else if (isCollapsing && !isMobile) {
                leftPaneToggle.textContent = '>';
            } else {
                 leftPaneToggle.textContent = '<';
            }
        }
    }

    leftPaneToggle.addEventListener('click', () => togglePane(leftPane, !leftPane.classList.contains('collapsed')));
    rightPaneToggle.addEventListener('click', () => togglePane(leftPane, false));


    // --- Search, Filter, and Sort Functionality ---
    function renderLeftPane() {
        const allItems = getAllItems();
        const searchTerm = searchBar.value.toLowerCase();
        const sortBy = sortSelect.value;

        const activeFilters = new Set();
        filterCheckboxes.forEach(cb => {
            if (cb.checked) {
                activeFilters.add(cb.value);
            }
        });

        // 1. Filter
        let filteredItems = allItems.filter(item => {
            const nameMatch = item.name.toLowerCase().includes(searchTerm);
            const typeMatch = activeFilters.has(item.type);

            // Discovery Mode Filter
            if (discoveryModeEnabled && currentCharacterId) {
                const isAcquirable = canCharacterAcquire(item);
                const char = gameData.characters.find(c => c.id === currentCharacterId);
                const hasItem = char.skills.some(s => s.id === item.id) || char.faculties.includes(item.id) || char.factors.includes(item.id);
                // Show only items that are acquirable and not already owned.
                if (!isAcquirable || hasItem) {
                    return false;
                }
            }

            return nameMatch && typeMatch;
        });

        // 2. Sort
        filteredItems.sort((a, b) => {
            if (sortBy === 'tier') {
                if (a.tier !== b.tier) {
                    return a.tier - b.tier;
                }
            }
            return a.name.localeCompare(b.name); // Default/secondary sort is by name
        });

        // 3. Render
        searchResultsContainer.innerHTML = ''; // Clear previous results

        if (filteredItems.length === 0) {
            searchResultsContainer.innerHTML = '<p class="no-results">No items found.</p>';
            return;
        }

        filteredItems.forEach(item => {
            const resultItem = document.createElement('button');
            resultItem.className = 'search-result-item';
            resultItem.dataset.id = item.id;
            resultItem.dataset.itemType = item.type;

            const itemName = document.createElement('span');
            itemName.className = 'item-name';
            itemName.textContent = item.name;

            const itemTier = document.createElement('span');
            itemTier.className = `item-tier ${item.type}`; // e.g., "item-tier skill"
            itemTier.textContent = `T${item.tier}`;

            resultItem.appendChild(itemName);
            resultItem.appendChild(itemTier);

            // Highlight if it's the active item
            if (item.id === activeExplorerItem) {
                resultItem.classList.add('selected');
            }

            resultItem.addEventListener('click', () => {
                activeExplorerItem = item.id;
                // Visually update selection immediately
                document.querySelectorAll('.search-result-item').forEach(el => el.classList.remove('selected'));
                resultItem.classList.add('selected');
                // Re-render the current view with the new focal item
                setView(currentView);
            });
            searchResultsContainer.appendChild(resultItem);
        });
    }

    searchBar.addEventListener('input', renderLeftPane);
    sortSelect.addEventListener('change', renderLeftPane);
    filterCheckboxes.forEach(cb => cb.addEventListener('change', renderLeftPane));


    // --- Data Functions ---
    function saveData() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(gameData));
        localStorage.setItem(VIEW_MODE_KEY, currentView);
        localStorage.setItem(DISCOVERY_MODE_KEY, JSON.stringify(discoveryModeEnabled));
        if (currentCharacterId) {
            localStorage.setItem(CURRENT_CHAR_KEY, currentCharacterId);
        } else {
            localStorage.removeItem(CURRENT_CHAR_KEY);
        }
    }

    function loadData() {
        const savedData = localStorage.getItem(STORAGE_KEY);
        const savedView = localStorage.getItem(VIEW_MODE_KEY);
        const savedDiscovery = localStorage.getItem(DISCOVERY_MODE_KEY);
        const savedCharId = localStorage.getItem(CURRENT_CHAR_KEY);


        if (savedView) {
            currentView = savedView;
        }
        if (savedDiscovery) {
            discoveryModeEnabled = JSON.parse(savedDiscovery);
            discoveryModeToggle.checked = discoveryModeEnabled;
        }
        if (savedCharId) {
            currentCharacterId = savedCharId;
        }


        if (savedData) {
             try {
                const parsedData = JSON.parse(savedData);
                if (parsedData.skills || parsedData.faculties) {
                    gameData = parsedData;
                     // --- Data Migration Logic ---
                    let needsSave = false;
                    // Add factors array if it doesn't exist
                    if (!gameData.factors) {
                        gameData.factors = [];
                        needsSave = true;
                    }
                    // Add characters array if it doesn't exist
                    if (!gameData.characters) {
                        gameData.characters = [];
                        needsSave = true;
                    }
                    // Add factors array to each character if it doesn't exist
                    gameData.characters.forEach(char => {
                        if (!char.factors) {
                            char.factors = [];
                            needsSave = true;
                        }
                    });

                    const allItems = [...gameData.skills, ...gameData.faculties, ...gameData.factors];
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
                        // 2. Migrate 'prerequisites' property to 'parents'
                        if (item.prerequisites) {
                            item.parents = item.prerequisites;
                            delete item.prerequisites;
                            needsSave = true;
                        }
                        // Ensure parents array exists
                        if (!item.parents) {
                            item.parents = [];
                            needsSave = true;
                        }
                        // 3. Migrate parents from string[] to object[] for backward compatibility
                        if (item.parents && item.parents.length > 0 && typeof item.parents[0] === 'string') {
                            item.parents = item.parents.map(parentId => ({ id: parentId, requiredLevel: 1 }));
                            needsSave = true;
                        }
                    });

                    if (needsSave) {
                        console.log('G&J Tracker: Migrated data to new format.');
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
            { id: 'skill_move_0', name: 'Move', description: 'The ability to change location.', parents: [], tier: 0, type: 'skill', level: 0, levelDescriptions: { '1': '', '2': '', '3': '', '4': '', '5': '' } },
            { id: 'skill_think_0', name: 'Think', description: 'The ability to process information and form ideas.', parents: [], tier: 0, type: 'skill', level: 0, levelDescriptions: { '1': '', '2': '', '3': '', '4': '', '5': '' } },
            { id: 'skill_talk_0', name: 'Talk', description: 'The ability to communicate with sounds.', parents: [], tier: 0, type: 'skill', level: 0, levelDescriptions: { '1': '', '2': '', '3': '', '4': '', '5': '' } },
            { id: 'skill_carry_1', name: 'Carry', description: 'Hold something in your hand.', parents: [{id: 'skill_move_0', requiredLevel: 1}, {id: 'faculty_thumbs_0', requiredLevel: 1}], tier: 1, type: 'skill', level: 0, levelDescriptions: { '1': '', '2': '', '3': '', '4': '', '5': '' } },

            // Barrel Roll Tree
            { id: 'skill_fly_1', name: 'Fly', description: 'Gain altitude and move through the air.', parents: [{id: 'faculty_wings_0', requiredLevel: 1}, {id: 'skill_move_0', requiredLevel: 1}], tier: 1, type: 'skill', level: 0, levelDescriptions: { '1': '', '2': '', '3': '', '4': '', '5': '' } },
            { id: 'skill_barrel_roll_2', name: 'Barrel Roll', description: 'Perform a full lateral roll while in flight.', parents: [{id: 'skill_fly_1', requiredLevel: 2}, {id: 'skill_move_0', requiredLevel: 1}], tier: 2, type: 'skill', level: 0, levelDescriptions: { '1': '', '2': '', '3': '', '4': '', '5': '' } },

            // Oral Dissertation Tree
            { id: 'skill_formulate_argument_1', name: 'Formulate Argument', description: 'Create a structured and logical line of reasoning.', parents: [{id: 'skill_think_0', requiredLevel: 1}, {id: 'skill_talk_0', requiredLevel: 1}], tier: 1, type: 'skill', level: 0, levelDescriptions: { '1': '', '2': '', '3': '', '4': '', '5': '' } },
            { id: 'skill_structure_narrative_2', name: 'Structure Narrative', description: 'Organize arguments into a compelling story.', parents: [{id: 'skill_formulate_argument_1', requiredLevel: 2}, {id: 'skill_think_0', requiredLevel: 2}], tier: 2, type: 'skill', level: 0, levelDescriptions: { '1': '', '2': '', '3': '', '4': '', '5': '' } },
            { id: 'skill_public_speaking_3', name: 'Public Speaking', description: 'Clearly articulate a narrative to an audience.', parents: [{id: 'skill_structure_narrative_2', requiredLevel: 3}, {id: 'skill_talk_0', requiredLevel: 2}], tier: 3, type: 'skill', level: 0, levelDescriptions: { '1': '', '2': '', '3': '', '4': '', '5': '' } },
            { id: 'skill_defend_thesis_4', name: 'Defend Thesis', description: 'Respond to challenges and questions about your arguments.', parents: [{id: 'skill_public_speaking_3', requiredLevel: 3}, {id: 'skill_formulate_argument_1', requiredLevel: 3}], tier: 4, type: 'skill', level: 0, levelDescriptions: { '1': '', '2': '', '3': '', '4': '', '5': '' } },
            { id: 'skill_oral_dissertation_5', name: 'Oral Dissertation', description: 'Deliver a comprehensive academic presentation to a panel of experts.', parents: [{id: 'skill_defend_thesis_4', requiredLevel: 4}, {id: 'skill_public_speaking_3', requiredLevel: 4}], tier: 5, type: 'skill', level: 0, levelDescriptions: { '1': '', '2': '', '3': '', '4': '', '5': '' } },
        ];
        gameData.faculties = [
            // Tier 0
            { id: 'faculty_wings_0', name: 'Wings', description: 'Appendages that allow for flight.', parents: [], tier: 0, type: 'faculty', level: 0, levelDescriptions: { '1': '', '2': '', '3': '', '4': '', '5': '' } },
            { id: 'faculty_gills_0', name: 'Gills', description: 'Organs that allow for breathing underwater.', parents: [], tier: 0, type: 'faculty', level: 0, levelDescriptions: { '1': '', '2': '', '3': '', '4': '', '5': '' } },
            { id: 'faculty_thumbs_0', name: 'Opposable Thumbs', description: 'Thumbs that can be moved to touch the other fingers, allowing for grasping.', parents: [], tier: 0, type: 'faculty', level: 0, levelDescriptions: { '1': '', '2': '', '3': '', '4': '', '5': '' } },
        ];
        gameData.factors = [
            // Tier 0
            { id: 'factor_dexterity_0', name: 'Manual Dexterity', description: 'The ability to make coordinated hand and finger movements to grasp and manipulate objects.', parents: [], tier: 0, type: 'factor', level: 0, levelDescriptions: { '1': '', '2': '', '3': '', '4': '', '5': '' } },
            { id: 'factor_endurance_0', name: 'Physical Endurance', description: 'The ability of an organism to exert itself and remain active for a long period of time.', parents: [], tier: 0, type: 'factor', level: 0, levelDescriptions: { '1': '', '2': '', '3': '', '4': '', '5': '' } },
        ];
        // We need to ensure all tiers are correct after initializing
        updateAllDependentTiers();
    }

    function getAllItems() {
        return [...gameData.skills, ...gameData.faculties, ...gameData.factors];
    }

    function getItemById(id) {
        return getAllItems().find(item => item.id === id);
    }

    function populateParentDropdowns(currentItemId = null) {
        const allPotentialParents = getAllItems().sort((a, b) => a.name.localeCompare(b.name));

        parent1Select.innerHTML = '<option value="">None</option>';
        parent2Select.innerHTML = '<option value="">None</option>';

        allPotentialParents.forEach(item => {
            if (item.id === currentItemId) return;

            const option1 = document.createElement('option');
            option1.value = item.id;
            option1.textContent = `${item.name} (T${item.tier}) [${item.type}]`;
            parent1Select.appendChild(option1);

            const option2 = document.createElement('option');
            option2.value = item.id;
            option2.textContent = `${item.name} (T${item.tier}) [${item.type}]`;
            parent2Select.appendChild(option2);
        });
    }

    function updateAllDependentTiers() {
        const allItems = getAllItems();
        let changed = true;
        while(changed) {
            changed = false;
            allItems.forEach(item => {
                let newTier;
                if(item.parents.length > 0) {
                    const parentTiers = item.parents.map(parentObj => {
                        const parent = getItemById(parentObj.id);
                        return parent ? parent.tier : -1;
                    });
                    newTier = Math.max(...parentTiers) + 1;
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
        parentsContainer.style.display = 'block';
        isTierZeroCheckbox.checked = false;
        itemTypeSelect.disabled = false;
        populateParentDropdowns();
        setupLevelDescriptionTabs(null); // Setup for a new item
        document.getElementById('parent1-level').value = 1;
        document.getElementById('parent2-level').value = 1;
        modal.style.display = 'block';
    }

    function openModalForQuickAdd(parentId) {
        openModalForCreate(); // Start with a fresh modal
        modalTitle.textContent = 'Create New Child Item';

        // Pre-select the parent
        const parentItem = getItemById(parentId);
        if(parentItem) {
            parent1Select.value = parentId;
            isTierZeroCheckbox.checked = false;
            parentsContainer.style.display = 'block';
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
        itemTypeSelect.disabled = false; // Allow changing the type

        populateParentDropdowns(itemId);
        setupLevelDescriptionTabs(item); // Populate with existing data

        if (item.tier === 0 || item.parents.length === 0) {
            isTierZeroCheckbox.checked = true;
            parentsContainer.style.display = 'none';
        } else {
            isTierZeroCheckbox.checked = false;
            parentsContainer.style.display = 'block';
            const parent1 = item.parents[0];
            const parent2 = item.parents[1];
            parent1Select.value = parent1 ? parent1.id : '';
            document.getElementById('parent1-level').value = parent1 ? parent1.requiredLevel : 1;
            parent2Select.value = parent2 ? parent2.id : '';
            document.getElementById('parent2-level').value = parent2 ? parent2.requiredLevel : 1;
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
        parentsContainer.style.display = isTierZeroCheckbox.checked ? 'none' : 'block';
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

        let parents = [];
        if (!isTierZero) {
            const parent1Id = parent1Select.value;
            const parent2Id = parent2Select.value;
            const parent1Level = parseInt(document.getElementById('parent1-level').value) || 1;
            const parent2Level = parseInt(document.getElementById('parent2-level').value) || 1;


             if (parent1Id === id || parent2Id === id) {
                alert('An item cannot be its own parent.');
                return;
            }
            // Only add unique, non-empty parents
            if(parent1Id) parents.push({ id: parent1Id, requiredLevel: parent1Level });
            if(parent2Id && parent1Id !== parent2Id) parents.push({ id: parent2Id, requiredLevel: parent2Level });

        }

        const levelDescriptions = {};
        for (let i = 1; i <= 5; i++) {
            levelDescriptions[i] = document.getElementById(`level-desc-${i}`).value.trim();
        }

        if (id) { // --- Editing Existing Item ---
            let itemToUpdate = getItemById(id);
            if (!itemToUpdate) return;

            const oldType = itemToUpdate.type;
            const newType = type;

            // Update properties
            itemToUpdate.name = name;
            itemToUpdate.description = description;
            itemToUpdate.parents = parents;
            itemToUpdate.levelDescriptions = levelDescriptions;
            itemToUpdate.type = newType;

            // If the type has changed, move the item to the correct array
            if (oldType !== newType) {
                // Remove from the old array
                const oldArrayName = `${oldType}s`;
                gameData[oldArrayName] = gameData[oldArrayName].filter(item => item.id !== id);

                // Add to the new array
                const newArrayName = `${newType}s`;
                gameData[newArrayName].push(itemToUpdate);
            }

        } else { // --- Creating New Item ---
            const newItem = {
                id: `${type}_${name.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}`,
                name,
                description,
                parents,
                tier: 0, // Tier will be calculated by updateAllDependentTiers
                type,
                level: 0,
                levelDescriptions
            };
            gameData[`${type}s`].push(newItem);
        }

        updateAllDependentTiers();
        saveData();
        setView(currentView);
        closeModal();
    });

    // --- Deletion Logic ---
    function deleteItem(itemId) {
        const allItems = getAllItems();
        // An item is a "parent" if any other item lists it as a parent.
        const isParent = allItems.some(item => item.parents.some(p => p.id === itemId));

        if (isParent) {
            alert('Cannot delete this item as it is a parent to another item. Please remove the child dependency first.');
            return;
        }

        const itemToDelete = getItemById(itemId);
        if (!itemToDelete) return;

        const typeArrayName = `${itemToDelete.type}s`;
        if (gameData[typeArrayName]) {
            gameData[typeArrayName] = gameData[typeArrayName].filter(item => item.id !== itemId);
        }

        updateAllDependentTiers();
        saveData();
        setView(currentView);
    }

    // --- View and Sorting Logic ---
    function setView(view) {
        currentView = view;
        viewExplorerBtn.classList.toggle('active', view === 'explorer');
        viewVTreeBtn.classList.toggle('active', view === 'v-tree');
        viewHTreeBtn.classList.toggle('active', view === 'h-tree');
        viewGlobalBtn.classList.toggle('active', view === 'global');


        const vTreeStylesheet = document.getElementById('v-tree-stylesheet');
        const hTreeStylesheet = document.getElementById('h-tree-stylesheet');

        // Reset styles and container properties
        skillTreeContainer.innerHTML = ''; // Clear content for all views initially
        skillTreeContainer.className = '';
        skillTreeContainer.style.position = '';

        if (view === 'explorer') {
            treeControls.style.display = 'none';
            vTreeStylesheet.disabled = true;
            hTreeStylesheet.disabled = true;
            renderExplorerView();
        } else if (view === 'v-tree') {
            treeControls.style.display = 'flex';
            vTreeStylesheet.disabled = false;
            hTreeStylesheet.disabled = true;
            renderFocalTree();
        } else if (view === 'h-tree') {
            treeControls.style.display = 'flex';
            vTreeStylesheet.disabled = true;
            hTreeStylesheet.disabled = false;
            renderFocalTree();
        } else if (view === 'global') {
            treeControls.style.display = 'none';
            vTreeStylesheet.disabled = true;
            hTreeStylesheet.disabled = true;
            skillTreeContainer.innerHTML = '<p style="padding: 2rem; text-align: center; font-size: 1.2rem;">Global View: Coming Soon!</p>';
        }

        saveData(); // Save the new view state
    }

    viewExplorerBtn.addEventListener('click', () => setView('explorer'));
    viewVTreeBtn.addEventListener('click', () => setView('v-tree'));
    viewHTreeBtn.addEventListener('click', () => setView('h-tree'));
    viewGlobalBtn.addEventListener('click', () => setView('global'));


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

    // --- Rendering ---
    function renderFocalTree() {
        skillTreeContainer.className = 'focal-tree-view'; // New class for styling
        skillTreeContainer.style.position = 'relative';

        if (!activeExplorerItem) {
            skillTreeContainer.innerHTML = `<p style="padding: 2rem; text-align: center;">Select an item from the left panel to view its family tree.</p>`;
            return;
        }

        const focalItem = getItemById(activeExplorerItem);
        if (!focalItem) {
            skillTreeContainer.innerHTML = `<p class="error">Error: Could not find the selected item.</p>`;
            return;
        }

        // Main container for the focal view
        const focalContainer = document.createElement('div');
        focalContainer.className = 'focal-item-container';

        const parentsContainer = document.createElement('div');
        parentsContainer.id = 'focal-parents-container';
        parentsContainer.className = 'focal-lineage-container';

        const childrenContainer = document.createElement('div');
        childrenContainer.id = 'focal-children-container';
        childrenContainer.className = 'focal-lineage-container';

        const focalCard = createSkillCard(focalItem);
        focalContainer.appendChild(focalCard);

        skillTreeContainer.appendChild(parentsContainer);
        skillTreeContainer.appendChild(focalContainer);
        skillTreeContainer.appendChild(childrenContainer);

        // Attach event listeners to the new buttons
        const showParentsBtn = focalCard.querySelector('.show-parents-btn');
        if (showParentsBtn) {
            showParentsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                // Toggle based on the container being empty, which is more reliable
                const isEmpty = parentsContainer.innerHTML.trim() === '';
                showParentsBtn.classList.toggle('active', isEmpty);
                if (isEmpty) {
                    renderParentTree(focalItem, parentsContainer);
                    parentsContainer.style.display = 'flex';
                } else {
                    parentsContainer.innerHTML = '';
                    parentsContainer.style.display = 'none';
                }
            });
        }

        const showChildrenBtn = focalCard.querySelector('.show-children-btn');
        if (showChildrenBtn) {
            showChildrenBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isEmpty = childrenContainer.innerHTML.trim() === '';
                showChildrenBtn.classList.toggle('active', isEmpty);
                 if (isEmpty) {
                    renderChildrenTree(focalItem, childrenContainer);
                    childrenContainer.style.display = 'flex';
                } else {
                    childrenContainer.innerHTML = '';
                    childrenContainer.style.display = 'none';
                }
            });
        }
    }

    function renderParentTree(item, container) {
        container.innerHTML = ''; // Clear previous
        const isHorizontal = currentView === 'h-tree';
        const treeContainer = document.createElement('div');
        treeContainer.className = isHorizontal ? 'h-tree-container' : 'tree-container';

        item.parents.forEach(parentObj => {
            const parentItem = getItemById(parentObj.id);
            if(parentItem) {
                const card = createSkillCard(parentItem);
                // Attach listeners to the new cards to allow recursive exploration
                const showParentsBtn = card.querySelector('.show-parents-btn');
                if (showParentsBtn) {
                    const newParentsContainer = document.createElement('div');
                    newParentsContainer.className = 'focal-lineage-container';
                    newParentsContainer.style.display = 'none';
                    card.before(newParentsContainer); // Show parents above the card

                    showParentsBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const isEmpty = newParentsContainer.innerHTML.trim() === '';
                        showParentsBtn.classList.toggle('active', isEmpty);
                        if(isEmpty) {
                            renderParentTree(parentItem, newParentsContainer);
                            newParentsContainer.style.display = 'flex';
                        } else {
                            newParentsContainer.innerHTML = '';
                            newParentsContainer.style.display = 'none';
                        }
                    });
                }
                treeContainer.appendChild(card);
            }
        });
        container.appendChild(treeContainer);
    }

    function renderChildrenTree(item, container) {
        container.innerHTML = ''; // Clear previous
        const children = getAllItems().filter(child => child.parents.some(p => p.id === item.id));
        const isHorizontal = currentView === 'h-tree';
        const treeContainer = document.createElement('div');
        treeContainer.className = isHorizontal ? 'h-tree-container' : 'tree-container';

        children.forEach(childItem => {
             const card = createSkillCard(childItem);
             // Allow further expansion
            const showChildrenBtn = card.querySelector('.show-children-btn');
            if (showChildrenBtn) {
                const newChildrenContainer = document.createElement('div');
                newChildrenContainer.className = 'focal-lineage-container';
                newChildrenContainer.style.display = 'none';
                card.after(newChildrenContainer);

                showChildrenBtn.addEventListener('click', (e) => {
                     e.stopPropagation();
                    const isHidden = newChildrenContainer.style.display === 'none';
                    if (isHidden) {
                        renderChildrenTree(childItem, newChildrenContainer);
                        newChildrenContainer.style.display = 'flex';
                         showChildrenBtn.classList.add('active');
                    } else {
                        newChildrenContainer.innerHTML = '';
                        newChildrenContainer.style.display = 'none';
                         showChildrenBtn.classList.remove('active');
                    }
                });
            }
            treeContainer.appendChild(card);
        });
        container.appendChild(treeContainer);
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

function renderFormattedText(text) {
    if (!text) return '';

    // Custom parsing for [factor:...] tags
    const factorTagRegex = /\[factor:([^\]]+)\]/g;
    let processedText = text.replace(factorTagRegex, '<span class="factor-tag">$1</span>');

    // Convert Markdown to HTML using the 'marked' library
    // It will handle checkboxes, bold, italics, links, etc.
    // GFM task lists ` - [ ] ` and ` - [x] ` are rendered as disabled checkboxes.
    return marked.parse(processedText, { gfm: true, breaks: true });
}

    function createSkillCard(item) {
        const card = document.createElement('div');
        card.className = 'skill-card';
        card.dataset.id = item.id;
        card.dataset.type = item.type;


    const titleContainer = document.createElement('div');
    titleContainer.className = 'card-title-container';

    const cardTitle = document.createElement('h3');
    cardTitle.textContent = item.name;

    // --- New Type and Tier Display ---
    const cardTierDisplay = document.createElement('div');
    cardTierDisplay.className = `card-tier-display tier-${item.type}`;
    cardTierDisplay.textContent = `T${item.tier}`;

    titleContainer.appendChild(cardTitle);
    titleContainer.appendChild(cardTierDisplay);

    const cardDescription = document.createElement('div'); // Use a div to host the rendered markdown
    cardDescription.innerHTML = renderFormattedText(item.description);


        const cardControls = document.createElement('div');
        cardControls.className = 'card-controls';

        // Add specific controls for tree views
        if (currentView === 'v-tree' || currentView === 'h-tree') {
            if (item.parents.length > 0) {
                const showParentsBtn = document.createElement('button');
                showParentsBtn.textContent = 'Parents';
                showParentsBtn.className = 'show-parents-btn';
                cardControls.appendChild(showParentsBtn);
            }
            const children = getAllItems().filter(child => child.parents.some(p => p.id === item.id));
            if (children.length > 0) {
                const showChildrenBtn = document.createElement('button');
                showChildrenBtn.textContent = 'Children';
                showChildrenBtn.className = 'show-children-btn';
                cardControls.appendChild(showChildrenBtn);
            }
        }

        const quickAddBtn = document.createElement('button');
        quickAddBtn.textContent = '+';
        quickAddBtn.title = 'Create a new child item with this as a parent';
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

        // --- Character Progression Controls ---
        if (currentCharacterId && item.type !== 'factor') {
            const char = gameData.characters.find(c => c.id === currentCharacterId);
            if (char) {
                const hasItem = char.skills.some(s => s.id === item.id) || char.faculties.includes(item.id);
                const charControl = document.createElement('div');
                charControl.className = 'char-control';

                if (hasItem) {
                    charControl.innerHTML = '<span class="acquired-tag">Acquired</span>';
                } else {
                    const addBtn = document.createElement('button');
                    addBtn.textContent = 'Add to Character';
                    addBtn.className = 'add-to-char-btn';
                    addBtn.disabled = !canCharacterAcquire(item);
                    addBtn.onclick = () => addItemToCharacter(item.id);
                    charControl.appendChild(addBtn);
                }
                cardControls.appendChild(charControl);
            }
        }


    card.appendChild(titleContainer);
        card.appendChild(cardDescription);

        if (item.parents && item.parents.length > 0) {
            const parentList = document.createElement('div');
            parentList.className = 'parents-list';
            const parentTitle = document.createElement('strong');
            parentTitle.textContent = 'Parents:';
            parentList.appendChild(parentTitle);

            const ul = document.createElement('ul');
            item.parents.forEach(parentObj => {
                const parentItem = getItemById(parentObj.id);
                const li = document.createElement('li');
                li.textContent = parentItem ? `${parentItem.name} (Lvl ${parentObj.requiredLevel} Req.)` : 'Unknown';
                ul.appendChild(li);
            });
            parentList.appendChild(ul);
            card.appendChild(parentList);
        }

        // --- Expandable Level Descriptions ---
        const detailsContainer = document.createElement('div');
        detailsContainer.className = 'details-container';
        detailsContainer.style.display = 'none'; // Initially hidden

        const levelList = document.createElement('ul');
        levelList.className = 'level-descriptions-list';
        for (let i = 1; i <= 5; i++) {
            const li = document.createElement('li');
            const desc = item.levelDescriptions[i];
            li.innerHTML = `<strong>Lvl ${i}:</strong> ${desc ? renderFormattedText(desc) : '<em>No description.</em>'}`;
            levelList.appendChild(li);
        }
        detailsContainer.appendChild(levelList);

        const showDetailsLink = document.createElement('a');
        showDetailsLink.href = '#';
        showDetailsLink.className = 'show-details-link';
        showDetailsLink.textContent = 'Show Details...';
        showDetailsLink.onclick = (e) => {
            e.preventDefault();
            const isHidden = detailsContainer.style.display === 'none';
            detailsContainer.style.display = isHidden ? 'block' : 'none';
            showDetailsLink.textContent = isHidden ? 'Hide Details' : 'Show Details...';
        };

        card.appendChild(detailsContainer);
        card.appendChild(showDetailsLink);
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


    function renderExplorerView() {
        skillTreeContainer.innerHTML = '';
        skillTreeContainer.className = 'explorer-view-container';

        if (!activeExplorerItem) {
            skillTreeContainer.innerHTML = `<p style="padding: 2rem; text-align: center;">Select an item from the search panel to explore its connections.</p>`;
            return;
        }

        const focalItem = getItemById(activeExplorerItem);
        if (!focalItem) {
            skillTreeContainer.innerHTML = `<p class="error">Error: Could not find the selected item.</p>`;
            return;
        }

        const allItems = getAllItems();
        const parents = focalItem.parents.map(p => getItemById(p.id)).filter(Boolean);
        const children = allItems.filter(item => item.parents.some(p => p.id === focalItem.id));

        // --- Render Parents ---
        if (parents.length > 0) {
            const parentSection = document.createElement('div');
            parentSection.className = 'explorer-section';
            parentSection.innerHTML = '<h4 class="explorer-section-title">Parents</h4>';
            const parentContainer = document.createElement('div');
            parentContainer.className = 'explorer-items-container';
            parents.forEach(item => {
                parentContainer.appendChild(createExplorerCard(item));
            });
            parentSection.appendChild(parentContainer);
            skillTreeContainer.appendChild(parentSection);
        }

        // --- Render Focal Item ---
        const focalSection = document.createElement('div');
        focalSection.className = 'explorer-section explorer-focal';
        focalSection.appendChild(createSkillCard(focalItem));
        skillTreeContainer.appendChild(focalSection);


        // --- Render Children (Dependents) ---
        if (children.length > 0) {
            const childSection = document.createElement('div');
            childSection.className = 'explorer-section';
            childSection.innerHTML = '<h4 class="explorer-section-title">Children</h4>';
            const childContainer = document.createElement('div');
            childContainer.className = 'explorer-items-container';
            children.forEach(item => {
                childContainer.appendChild(createExplorerCard(item));
            });
            childSection.appendChild(childContainer);
            skillTreeContainer.appendChild(childSection);
        }
    }

    function createExplorerCard(item) {
        const card = document.createElement('div');
        card.className = 'explorer-card';
        card.dataset.id = item.id;
        card.innerHTML = `
            <p class="name">${item.name}</p>
            <p class="type">${item.type}</p>
        `;
        card.addEventListener('click', () => {
            activeExplorerItem = item.id;
            setView('explorer');
        });
        return card;
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
                        const allItems = [...gameData.skills, ...gameData.faculties, ...(gameData.factors || [])];
                        allItems.forEach(item => {
                            if (item.level === undefined) item.level = 0;
                            if (item.levelDescriptions === undefined) item.levelDescriptions = { '1': '', '2': '', '3': '', '4': '', '5': '' };
                            if (item.prerequisites) {
                                item.parents = item.prerequisites;
                                delete item.prerequisites;
                            }
                             if (!item.parents) item.parents = [];
                            if (item.parents && item.parents.length > 0 && typeof item.parents[0] === 'string') {
                                item.parents = item.parents.map(parentId => ({ id: parentId, requiredLevel: 1 }));
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
        renderLeftPane(); // Re-render the left pane to apply the filter.
    });


    // --- Tab Navigation ---
    const dbTab = document.getElementById('db-tab');
    const ccTab = document.getElementById('cc-tab');
    const dbContent = document.getElementById('app-container');
    const ccContent = document.getElementById('character-creator-container');

    function switchTab(activeTab, activeContent) {
        // Deactivate all tabs and hide all content
        document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
            content.style.display = 'none';
        });

        // Activate the selected tab and content
        activeTab.classList.add('active');
        activeContent.classList.add('active');
        activeContent.style.display = 'flex'; // Use flex for the main container
    }

    dbTab.addEventListener('click', () => switchTab(dbTab, dbContent));
    ccTab.addEventListener('click', () => {
        switchTab(ccTab, ccContent);
        renderCharacterCreatorTab();
    });

    // --- Character Creator Logic ---

    function renderCharacterCreatorTab() {
        // Populate dropdown
        charSelect.innerHTML = '<option value="">None</option>'; // Clear existing options
        gameData.characters.forEach(char => {
            const option = document.createElement('option');
            option.value = char.id;
            option.textContent = char.name;
            charSelect.appendChild(option);
        });

        // Set current selection
        if (currentCharacterId) {
            charSelect.value = currentCharacterId;
        } else {
            charSelect.value = "";
        }

        // Render the sheet for the current character
        renderCharacterSheet();
    }

    function renderCharacterSheet() {
        characterSheetContainer.innerHTML = ''; // Clear current sheet

        const char = gameData.characters.find(c => c.id === currentCharacterId);

        if (!char) {
            characterSheetContainer.innerHTML = '<p>Select a character to see their sheet.</p>';
            return;
        }

        const nameHeader = document.createElement('h3');
        nameHeader.textContent = char.name;
        characterSheetContainer.appendChild(nameHeader);

        // --- Skills Section ---
        const skillsSection = document.createElement('div');
        skillsSection.className = 'char-sheet-section';
        const skillsHeader = document.createElement('h4');
        skillsHeader.textContent = 'Acquired Skills';
        skillsSection.appendChild(skillsHeader);

        if (char.skills && char.skills.length > 0) {
            const skillsList = document.createElement('ul');
            char.skills.forEach(charSkill => {
                const skillItem = getItemById(charSkill.id);
                if (skillItem) {
                    const li = document.createElement('li');
                    li.textContent = `${skillItem.name} (Lvl ${charSkill.level})`;
                    const removeBtn = document.createElement('button');
                    removeBtn.textContent = 'Remove';
                    removeBtn.className = 'remove-item-btn';
                    removeBtn.onclick = () => removeItemFromCharacter(skillItem.id);
                    li.appendChild(removeBtn);
                    skillsList.appendChild(li);
                }
            });
            skillsSection.appendChild(skillsList);
        } else {
            skillsSection.appendChild(document.createElement('p')).textContent = 'No skills acquired yet.';
        }
        characterSheetContainer.appendChild(skillsSection);


        // --- Faculties Section ---
        const facultiesSection = document.createElement('div');
        facultiesSection.className = 'char-sheet-section';
        const facultiesHeader = document.createElement('h4');
        facultiesHeader.textContent = 'Acquired Faculties';
        facultiesSection.appendChild(facultiesHeader);

        if (char.faculties && char.faculties.length > 0) {
            const facultiesList = document.createElement('ul');
            char.faculties.forEach(facultyId => {
                const facultyItem = getItemById(facultyId);
                if (facultyItem) {
                    const li = document.createElement('li');
                    li.textContent = facultyItem.name;
                    const removeBtn = document.createElement('button');
                    removeBtn.textContent = 'Remove';
                    removeBtn.className = 'remove-item-btn';
                    removeBtn.onclick = () => removeItemFromCharacter(facultyItem.id);
                    li.appendChild(removeBtn);
                    facultiesList.appendChild(li);
                }
            });
            facultiesSection.appendChild(facultiesList);
        } else {
            facultiesSection.appendChild(document.createElement('p')).textContent = 'No faculties acquired yet.';
        }
        characterSheetContainer.appendChild(facultiesSection);

        // --- Factors Section ---
        const factorsSection = document.createElement('div');
        factorsSection.className = 'char-sheet-section';
        const factorsHeader = document.createElement('h4');
        factorsHeader.textContent = 'Acquired Factors';
        factorsSection.appendChild(factorsHeader);

         if (char.factors && char.factors.length > 0) {
            const factorsList = document.createElement('ul');
            char.factors.forEach(factorId => {
                const factorItem = getItemById(factorId);
                if (factorItem) {
                    const li = document.createElement('li');
                    li.textContent = factorItem.name;
                    const removeBtn = document.createElement('button');
                    removeBtn.textContent = 'Remove';
                    removeBtn.className = 'remove-item-btn';
                    removeBtn.onclick = () => removeItemFromCharacter(factorItem.id);
                    li.appendChild(removeBtn);
                    factorsList.appendChild(li);
                }
            });
            factorsSection.appendChild(factorsList);
        } else {
            factorsSection.appendChild(document.createElement('p')).textContent = 'No factors acquired yet.';
        }
        characterSheetContainer.appendChild(factorsSection);

    }

    function canCharacterAcquire(item) {
        const char = gameData.characters.find(c => c.id === currentCharacterId);
        if (!char || !item) return false;

        // Tier 0 items are always acquirable.
        if (item.tier === 0) {
            return true;
        }

        // Check if all parent prerequisites are met.
        return item.parents.every(parentReq => {
            const parentItem = getItemById(parentReq.id);
            if (!parentItem) return false; // Should not happen, but a safeguard.

            if (parentItem.type === 'skill') {
                const charSkill = char.skills.find(s => s.id === parentReq.id);
                return charSkill && charSkill.level >= parentReq.requiredLevel;
            } else if (parentItem.type === 'faculty') {
                return char.faculties.includes(parentReq.id);
            } else if (parentItem.type === 'factor') {
                return char.factors.includes(parentReq.id);
            }
            return false;
        });
    }


    function addItemToCharacter(itemId) {
        const char = gameData.characters.find(c => c.id === currentCharacterId);
        if (!char) return;

        const item = getItemById(itemId);
        if (!item) return;

        // Add the item to the correct array in the character's data.
        if (item.type === 'skill') {
            // Skills are added at level 1 by default.
            if (!char.skills.some(s => s.id === itemId)) {
                char.skills.push({ id: itemId, level: 1 });
            }
        } else if (item.type === 'faculty') {
            if (!char.faculties.includes(itemId)) {
                char.faculties.push(itemId);
            }
        } else if (item.type === 'factor') {
            if (!char.factors.includes(itemId)) {
                char.factors.push(itemId);
            }
        }

        saveData();
        renderCharacterSheet();
        // Re-render the main view to update the button states.
        setView(currentView);
    }


    function removeItemFromCharacter(itemId) {
        const char = gameData.characters.find(c => c.id === currentCharacterId);
        if (!char) return;

        const item = getItemById(itemId);
        if (!item) return;

        if (item.type === 'skill') {
            char.skills = char.skills.filter(s => s.id !== itemId);
        } else if (item.type === 'faculty') {
            char.faculties = char.faculties.filter(id => id !== itemId);
        } else if (item.type === 'factor') {
            char.factors = char.factors.filter(id => id !== itemId);
        }


        saveData();
        renderCharacterSheet();
        // We also need to re-render the main view in case the "Add" button state needs to change
        setView(currentView);
    }


    function createCharacter() {
        const name = newCharNameInput.value.trim();
        if (!name) {
            alert('Please enter a character name.');
            return;
        }
        if (gameData.characters.some(char => char.name === name)) {
            alert('A character with this name already exists.');
            return;
        }

        const newChar = {
            id: `char_${Date.now()}`,
            name: name,
            skills: [], // Array of { id: skillId, level: number }
            faculties: [], // Array of faculty IDs
            factors: [], // Array of factor IDs
        };

        gameData.characters.push(newChar);
        currentCharacterId = newChar.id;
        newCharNameInput.value = ''; // Clear input

        saveData();
        renderCharacterCreatorTab();
    }

    function selectCharacter() {
        currentCharacterId = charSelect.value || null;
        saveData();
        renderCharacterCreatorTab();
        renderLeftPane(); // Update acquirable items when character changes
    }

    createCharBtn.addEventListener('click', createCharacter);
    charSelect.addEventListener('change', selectCharacter);


    // --- Initialization ---
    function init() {
        loadData();
        setView(currentView); // Set initial view from loaded data
        renderLeftPane(); // Populate search results on load
        renderCharacterCreatorTab(); // Populate character tab on load
    }

    init();
});