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
    const viewTreeBtn = document.getElementById('view-tree-btn');


    // --- Game Data & Constants ---
    const STORAGE_KEY = 'Xenophile';
    const VIEW_MODE_KEY = 'XenophileViewMode';
    let gameData = {
        skills: [],
        faculties: [],
    };
    let currentView = 'alpha'; // 'alpha' or 'tree'

    // --- Data Functions ---
    function saveData() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(gameData));
        localStorage.setItem(VIEW_MODE_KEY, currentView);
    }

    function loadData() {
        const savedData = localStorage.getItem(STORAGE_KEY);
        const savedView = localStorage.getItem(VIEW_MODE_KEY);

        if (savedView) {
            currentView = savedView;
        }

        if (savedData) {
            const parsedData = JSON.parse(savedData);
            if (parsedData.skills || parsedData.faculties) {
                 gameData = parsedData;
                 return;
            }
        }
        initializeDefaultData();
        saveData();
    }

    function initializeDefaultData() {
        gameData.skills = [
            // Tier 0
            { id: 'skill_move_0', name: 'Move', description: 'The ability to change location.', prerequisites: [], tier: 0, type: 'skill' },
            { id: 'skill_think_0', name: 'Think', description: 'The ability to process information and form ideas.', prerequisites: [], tier: 0, type: 'skill' },
            { id: 'skill_talk_0', name: 'Talk', description: 'The ability to communicate with sounds.', prerequisites: [], tier: 0, type: 'skill' },
            { id: 'skill_carry_1', name: 'Carry', description: 'Hold something in your hand.', prerequisites: ['skill_move_0', 'faculty_thumbs_0'], tier: 1, type: 'skill' },

            // Barrel Roll Tree
            { id: 'skill_fly_1', name: 'Fly', description: 'Gain altitude and move through the air.', prerequisites: ['faculty_wings_0', 'skill_move_0'], tier: 1, type: 'skill' },
            { id: 'skill_barrel_roll_2', name: 'Barrel Roll', description: 'Perform a full lateral roll while in flight.', prerequisites: ['skill_fly_1', 'skill_move_0'], tier: 2, type: 'skill' },

            // Oral Dissertation Tree
            { id: 'skill_formulate_argument_1', name: 'Formulate Argument', description: 'Create a structured and logical line of reasoning.', prerequisites: ['skill_think_0', 'skill_talk_0'], tier: 1, type: 'skill' },
            { id: 'skill_structure_narrative_2', name: 'Structure Narrative', description: 'Organize arguments into a compelling story.', prerequisites: ['skill_formulate_argument_1', 'skill_think_0'], tier: 2, type: 'skill' },
            { id: 'skill_public_speaking_3', name: 'Public Speaking', description: 'Clearly articulate a narrative to an audience.', prerequisites: ['skill_structure_narrative_2', 'skill_talk_0'], tier: 3, type: 'skill' },
            { id: 'skill_defend_thesis_4', name: 'Defend Thesis', description: 'Respond to challenges and questions about your arguments.', prerequisites: ['skill_public_speaking_3', 'skill_formulate_argument_1'], tier: 4, type: 'skill' },
            { id: 'skill_oral_dissertation_5', name: 'Oral Dissertation', description: 'Deliver a comprehensive academic presentation to a panel of experts.', prerequisites: ['skill_defend_thesis_4', 'skill_public_speaking_3'], tier: 5, type: 'skill' },
        ];
        gameData.faculties = [
            // Tier 0
            { id: 'faculty_wings_0', name: 'Wings', description: 'Appendages that allow for flight.', prerequisites: [], tier: 0, type: 'faculty' },
            { id: 'faculty_gills_0', name: 'Gills', description: 'Organs that allow for breathing underwater.', prerequisites: [], tier: 0, type: 'faculty' },
            { id: 'faculty_thumbs_0', name: 'Opposable Thumbs', description: 'Thumbs that can be moved to touch the other fingers, allowing for grasping.', prerequisites: [], tier: 0, type: 'faculty' },
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
                    const prereqTiers = item.prerequisites.map(prereqId => {
                        const prereq = getItemById(prereqId);
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
    function openModalForCreate() {
        modalTitle.textContent = 'Create New Item';
        addEditForm.reset();
        editItemIdInput.value = '';
        prerequisitesContainer.style.display = 'block';
        isTierZeroCheckbox.checked = false;
        itemTypeSelect.disabled = false;
        populatePrerequisiteDropdowns();
        modal.style.display = 'block';
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

        if (item.tier === 0 || item.prerequisites.length === 0) {
            isTierZeroCheckbox.checked = true;
            prerequisitesContainer.style.display = 'none';
        } else {
            isTierZeroCheckbox.checked = false;
            prerequisitesContainer.style.display = 'block';
            prereq1Select.value = item.prerequisites[0] || '';
            prereq2Select.value = item.prerequisites[1] || '';
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

             if (prereq1Id === id || prereq2Id === id) {
                alert('An item cannot be its own prerequisite.');
                return;
            }
            // Only add unique, non-empty prerequisites
            if(prereq1Id) prerequisites.push(prereq1Id);
            if(prereq2Id && prereq1Id !== prereq2Id) prerequisites.push(prereq2Id);

        }

        if (id) { // --- Editing Existing Item ---
            const itemToUpdate = type === 'skill'
                ? gameData.skills.find(i => i.id === id)
                : gameData.faculties.find(i => i.id === id);

            if (itemToUpdate) {
                itemToUpdate.name = name;
                itemToUpdate.description = description;
                itemToUpdate.prerequisites = prerequisites;
            }
        } else { // --- Creating New Item ---
            const newItem = {
                id: `${type}_${name.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}`,
                name,
                description,
                prerequisites,
                tier: 0, // Tier will be calculated by updateAllDependentTiers
                type
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
        const isPrerequisite = allItems.some(item => item.prerequisites.includes(itemId));

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
        viewTreeBtn.classList.toggle('active', view === 'tree');

        const treeStylesheet = document.getElementById('tree-view-stylesheet');

        if (view === 'tree') {
            treeStylesheet.disabled = false;
            renderGenealogyTree();
        } else {
            treeStylesheet.disabled = true;
            renderSkillTree();
        }

        saveData(); // Save the new view state
    }

    viewAlphaBtn.addEventListener('click', () => setView('alpha'));
    viewTreeBtn.addEventListener('click', () => setView('tree'));

    // --- Rendering ---
    function renderGenealogyTree() {
        skillTreeContainer.innerHTML = '';
        skillTreeContainer.style.position = 'relative';
        const allItems = getAllItems();
        if (allItems.length === 0) {
            skillTreeContainer.innerHTML = '<p>No items to display.</p>';
            return;
        }

        // Create a map of nodes to build the tree structure
        const nodes = new Map(allItems.map(item => [item.id, { item, children: [], element: null, isRendered: false }]));

        // Populate children arrays and identify roots
        const roots = [];
        nodes.forEach(node => {
            const hasPrerequisites = node.item.prerequisites && node.item.prerequisites.length > 0;
            if (hasPrerequisites) {
                node.item.prerequisites.forEach(prereqId => {
                    const parentNode = nodes.get(prereqId);
                    if (parentNode) {
                        parentNode.children.push(node);
                    }
                });
            } else {
                roots.push(node);
            }
        });

        // Create a container for all the separate trees
        const treeContainer = document.createElement('div');
        treeContainer.className = 'tree-container';

        // Render each tree starting from its roots
        roots.forEach(rootNode => {
            if (!rootNode.isRendered) {
                const treeRootElement = document.createElement('div');
                treeRootElement.className = 'tree-root';
                recursivelyRenderNode(rootNode, treeRootElement, nodes);
                treeContainer.appendChild(treeRootElement);
            }
        });

        skillTreeContainer.appendChild(treeContainer);

        // Draw connecting lines after a short delay
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.classList.add('connector-lines');
        skillTreeContainer.insertBefore(svg, skillTreeContainer.firstChild);
        setTimeout(() => drawConnectingLines(svg, nodes), 100);
    }

    function recursivelyRenderNode(node, parentElement) {
        if (node.isRendered) return;

        const nodeGroup = document.createElement('div');
        nodeGroup.className = 'tree-node-group';

        const card = createSkillCard(node.item);
        nodeGroup.appendChild(card);
        node.element = card; // Keep a reference to the card itself
        node.isRendered = true;

        if (node.children.length > 0) {
            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'tree-children';
            node.children.forEach(childNode => {
                recursivelyRenderNode(childNode, childrenContainer);
            });
            nodeGroup.appendChild(childrenContainer);

            // Add toggle button
            const toggleBtn = document.createElement('button');
            toggleBtn.className = 'toggle-children collapsed';
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
            childrenContainer.classList.add('collapsed');
        }
        parentElement.appendChild(nodeGroup);
    }


    function createSkillCard(item) {
        const card = document.createElement('div');
        card.className = 'skill-card';
        card.dataset.id = item.id;
        card.dataset.type = item.type;

        const cardTitle = document.createElement('h3');
        cardTitle.textContent = item.name;

        const cardType = document.createElement('p');
        cardType.className = 'skill-type';
        cardType.textContent = `Type: ${item.type.charAt(0).toUpperCase() + item.type.slice(1)}`;

        const cardDescription = document.createElement('p');
        cardDescription.textContent = item.description;

        const cardControls = document.createElement('div');
        cardControls.className = 'card-controls';

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

        cardControls.appendChild(editBtn);
        cardControls.appendChild(deleteBtn);

        card.appendChild(cardTitle);
        card.appendChild(cardType);
        card.appendChild(cardDescription);

        if (item.prerequisites && item.prerequisites.length > 0) {
            const prereqList = document.createElement('div');
            prereqList.className = 'prerequisites-list';
            const prereqTitle = document.createElement('strong');
            prereqTitle.textContent = 'Prerequisites:';
            prereqList.appendChild(prereqTitle);

            const ul = document.createElement('ul');
            item.prerequisites.forEach(prereqId => {
                const prereqItem = getItemById(prereqId);
                const li = document.createElement('li');
                li.textContent = prereqItem ? `${prereqItem.name} (T${prereqItem.tier})` : 'Unknown';
                ul.appendChild(li);
            });
            prereqList.appendChild(ul);
            card.appendChild(prereqList);
        }

        card.appendChild(cardControls);
        return card;
    }

    function drawConnectingLines(svg) {
        svg.innerHTML = '';
        const containerRect = skillTreeContainer.getBoundingClientRect();

        const allCards = Array.from(skillTreeContainer.querySelectorAll('.skill-card'));

        allCards.forEach(childCard => {
            const childId = childCard.dataset.id;
            const childItem = getItemById(childId);
            if (!childItem || !childItem.prerequisites) return;

            // Don't draw lines to hidden cards
            if (childCard.closest('.tree-children.collapsed')) {
                return;
            }

            childItem.prerequisites.forEach(prereqId => {
                const parentCard = skillTreeContainer.querySelector(`.skill-card[data-id="${prereqId}"]`);
                if (parentCard && !parentCard.closest('.tree-children.collapsed')) {
                    const parentRect = parentCard.getBoundingClientRect();
                    const childRect = childCard.getBoundingClientRect();

                    const startX = parentRect.right - containerRect.left;
                    const startY = parentRect.top - containerRect.top + parentRect.height / 2;
                    const endX = childRect.left - containerRect.left;
                    const endY = childRect.top - containerRect.top + childRect.height / 2;

                    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    path.setAttribute('d', `M ${startX} ${startY} C ${startX + 50} ${startY}, ${endX - 50} ${endY}, ${endX} ${endY}`);
                    path.setAttribute('stroke', '#ccc');
                    path.setAttribute('stroke-width', '2');
                    path.setAttribute('fill', 'none');
                    svg.appendChild(path);
                }
            });
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

    // --- Initialization ---
    function init() {
        loadData();
        setView(currentView); // Set initial view from loaded data
    }

    init();
});