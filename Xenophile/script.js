document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const addSkillBtn = document.getElementById('add-skill-btn');
    const modal = document.getElementById('add-skill-modal');
    const closeBtn = document.querySelector('.close-btn');
    const addSkillForm = document.getElementById('add-skill-form');
    const isBasicSkillCheckbox = document.getElementById('is-basic-skill');
    const prerequisitesContainer = document.getElementById('prerequisites-container');
    const skillTreeContainer = document.getElementById('skill-tree-container');
    const prereq1Select = document.getElementById('prerequisite1');
    const prereq2Select = document.getElementById('prerequisite2');

    // --- Game Data & Constants ---
    const STORAGE_KEY = 'Xenophile';
    let gameData = {
        skills: [],
        faculties: [],
    };

    // --- Data Functions ---
    function saveData() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(gameData));
    }

    function loadData() {
        const savedData = localStorage.getItem(STORAGE_KEY);
        if (savedData && JSON.parse(savedData).skills.length > 0) {
            gameData = JSON.parse(savedData);
        } else {
            initializeDefaultData();
            saveData();
        }
    }

    function initializeDefaultData() {
        gameData.skills = [
            { id: 'skill_move_0', name: 'Move', description: 'The ability to change location.', prerequisites: [], tier: 0, type: 'skill' },
            { id: 'skill_think_0', name: 'Think', description: 'The ability to process information and form ideas.', prerequisites: [], tier: 0, type: 'skill' },
            { id: 'skill_talk_0', name: 'Talk', description: 'The ability to communicate with sounds.', prerequisites: [], tier: 0, type: 'skill' },
        ];
        gameData.faculties = [
            { id: 'faculty_wings_0', name: 'Wings', description: 'Appendages that allow for flight.', prerequisites: [], tier: 0, type: 'faculty' },
            { id: 'faculty_gills_0', name: 'Gills', description: 'Organs that allow for breathing underwater.', prerequisites: [], tier: 0, type: 'faculty' },
            { id: 'faculty_thumbs_0', name: 'Opposable Thumbs', description: 'Thumbs that can be moved to touch the other fingers, allowing for grasping.', prerequisites: [], tier: 0, type: 'faculty' },
        ];
    }

    function populatePrerequisiteDropdowns() {
        const allPrereqs = [...gameData.skills, ...gameData.faculties].sort((a, b) => a.name.localeCompare(b.name));

        prereq1Select.innerHTML = '<option value="">None</option>';
        prereq2Select.innerHTML = '<option value="">None</option>';

        allPrereqs.forEach(item => {
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

    // --- Modal Logic ---
    addSkillBtn.addEventListener('click', () => {
        populatePrerequisiteDropdowns();
        modal.style.display = 'block';
    });

    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });

    // --- Form Logic ---
    isBasicSkillCheckbox.addEventListener('change', () => {
        prerequisitesContainer.style.display = isBasicSkillCheckbox.checked ? 'none' : 'block';
    });

    addSkillForm.addEventListener('submit', (event) => {
        event.preventDefault();

        const skillName = document.getElementById('skill-name').value.trim();
        const skillDescription = document.getElementById('skill-description').value.trim();
        const isBasic = document.getElementById('is-basic-skill').checked;

        if (!skillName || !skillDescription) {
            alert('Skill Name and Description are required.');
            return;
        }

        const newSkill = {
            id: `skill_${skillName.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}`,
            name: skillName,
            description: skillDescription,
            prerequisites: [],
            tier: 0,
            type: 'skill'
        };

        if (!isBasic) {
            const prereq1Id = prereq1Select.value;
            const prereq2Id = prereq2Select.value;

            if (!prereq1Id || !prereq2Id) {
                alert('A non-basic skill must have two prerequisites.');
                return;
            }
            if (prereq1Id === prereq2Id) {
                alert('A skill cannot have the same prerequisite twice.');
                return;
            }

            const allItems = [...gameData.skills, ...gameData.faculties];
            const prereq1 = allItems.find(p => p.id === prereq1Id);
            const prereq2 = allItems.find(p => p.id === prereq2Id);

            newSkill.prerequisites = [prereq1Id, prereq2Id];
            newSkill.tier = Math.max(prereq1.tier, prereq2.tier) + 1;
        }

        gameData.skills.push(newSkill);
        saveData();
        renderSkillTree();

        modal.style.display = 'none';
        addSkillForm.reset();
        prerequisitesContainer.style.display = 'block';
    });

    // --- Rendering ---
    function renderSkillTree() {
        skillTreeContainer.innerHTML = '';
        const allItems = [...gameData.skills, ...gameData.faculties];

        if (allItems.length === 0) {
            skillTreeContainer.innerHTML = '<p>No skills or faculties yet. Add one to get started!</p>';
            return;
        }

        const getItemById = (id) => allItems.find(item => item.id === id);

        const tiers = allItems.reduce((acc, item) => {
            const tier = item.tier;
            if (!acc[tier]) {
                acc[tier] = [];
            }
            acc[tier].push(item);
            return acc;
        }, {});

        const maxTier = Math.max(...Object.keys(tiers).map(Number));

        for (let i = 0; i <= maxTier; i++) {
            if (!tiers[i]) continue;

            const tierColumn = document.createElement('div');
            tierColumn.className = 'tier-column';

            const tierTitle = document.createElement('h2');
            tierTitle.className = 'tier-title';
            tierTitle.textContent = `Tier ${i}`;
            tierColumn.appendChild(tierTitle);

            tiers[i].sort((a,b) => a.name.localeCompare(b.name)).forEach(item => {
                const card = document.createElement('div');
                card.className = 'skill-card';
                card.dataset.id = item.id;

                const cardTitle = document.createElement('h3');
                cardTitle.textContent = item.name;

                const cardType = document.createElement('p');
                cardType.className = 'skill-type';
                cardType.textContent = `Type: ${item.type.charAt(0).toUpperCase() + item.type.slice(1)}`;

                const cardDescription = document.createElement('p');
                cardDescription.textContent = item.description;

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

                tierColumn.appendChild(card);
            });

            skillTreeContainer.appendChild(tierColumn);
        }
    }


    // --- Initialization ---
    function init() {
        loadData();
        renderSkillTree();
    }

    init();
});
