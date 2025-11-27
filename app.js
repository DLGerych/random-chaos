// Register service worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('Service Worker registered:', registration);
            })
            .catch(error => {
                console.log('Service Worker registration failed:', error);
            });
    });
}

// Simple SPA navigation system
class Navigation {
    constructor() {
        this.currentScreen = 'home-screen';
        this.init();
    }

    init() {
        // Add click handlers to all navigation buttons
        document.addEventListener('click', (e) => {
            const navButton = e.target.closest('[data-screen]');
            if (navButton) {
                const targetScreen = navButton.dataset.screen;
                this.navigateTo(targetScreen);
            }
        });

        // Show initial screen
        this.showScreen(this.currentScreen);
    }

    navigateTo(screenId) {
        if (this.currentScreen === screenId) return;

        this.hideScreen(this.currentScreen);
        this.showScreen(screenId);
        this.currentScreen = screenId;
    }

    showScreen(screenId) {
        const screen = document.getElementById(screenId);
        if (screen) {
            screen.classList.add('active');
        }
    }

    hideScreen(screenId) {
        const screen = document.getElementById(screenId);
        if (screen) {
            screen.classList.remove('active');
        }
    }
}

// Player management system
class PlayerManager {
    constructor() {
        this.players = this.loadPlayers();
        this.init();
    }

    init() {
        // Add player button
        const addButton = document.getElementById('add-player-btn');
        const nameInput = document.getElementById('player-name-input');

        addButton.addEventListener('click', () => this.addPlayer());
        nameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addPlayer();
            }
        });

        // Initial render
        this.render();
    }

    loadPlayers() {
        const stored = localStorage.getItem('chaos-picker-players');
        const players = stored ? JSON.parse(stored) : [];
        // Ensure all players have isActive field (default to true for existing players)
        return players.map(player => ({
            ...player,
            isActive: player.isActive !== undefined ? player.isActive : true
        }));
    }

    savePlayers() {
        localStorage.setItem('chaos-picker-players', JSON.stringify(this.players));
    }

    addPlayer() {
        const nameInput = document.getElementById('player-name-input');
        const positionInput = document.getElementById('player-position-input');

        const name = nameInput.value.trim();
        const position = positionInput.value;

        if (!name) {
            alert('Please enter a player name');
            return;
        }

        const newPlayer = {
            id: Date.now().toString(),
            name: name,
            position: position,
            confirmCount: 0,
            isActive: true
        };

        this.players.push(newPlayer);
        this.savePlayers();
        this.render();

        // Clear input
        nameInput.value = '';
        nameInput.focus();
    }

    deletePlayer(id) {
        this.players = this.players.filter(p => p.id !== id);
        this.savePlayers();
        this.render();
    }

    updatePlayerPosition(id, newPosition) {
        const player = this.players.find(p => p.id === id);
        if (player) {
            player.position = newPosition;
            this.savePlayers();
            this.render();
        }
    }

    togglePlayerActive(id) {
        const player = this.players.find(p => p.id === id);
        if (player) {
            player.isActive = !player.isActive;
            this.savePlayers();
            this.render();
        }
    }

    render() {
        const container = document.getElementById('players-list');

        if (this.players.length === 0) {
            container.innerHTML = '<p class="empty-state">No players yet. Add your first player above!</p>';
            return;
        }

        const listHTML = this.players.map(player => `
            <div class="player-item ${player.isActive ? '' : 'inactive'}" data-id="${player.id}">
                <div class="player-info">
                    <span class="player-name">${this.escapeHtml(player.name)}</span>
                    <span class="player-count">Confirmed: ${player.confirmCount}</span>
                </div>
                <div class="player-controls">
                    <button class="toggle-active-btn ${player.isActive ? 'active' : 'inactive'}" data-id="${player.id}">
                        ${player.isActive ? 'Active' : 'Inactive'}
                    </button>
                    <select class="position-select" data-id="${player.id}">
                        <option value="Guard" ${player.position === 'Guard' ? 'selected' : ''}>Guard</option>
                        <option value="Forward" ${player.position === 'Forward' ? 'selected' : ''}>Forward</option>
                    </select>
                    <button class="delete-btn" data-id="${player.id}">Delete</button>
                </div>
            </div>
        `).join('');

        container.innerHTML = listHTML;

        // Add event listeners
        container.querySelectorAll('.toggle-active-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                this.togglePlayerActive(id);
            });
        });

        container.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                if (confirm('Delete this player?')) {
                    this.deletePlayer(id);
                }
            });
        });

        container.querySelectorAll('.position-select').forEach(select => {
            select.addEventListener('change', (e) => {
                const id = e.target.dataset.id;
                const newPosition = e.target.value;
                this.updatePlayerPosition(id, newPosition);
            });
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Random picker system
class RandomPicker {
    constructor(playerManager) {
        this.playerManager = playerManager;
        this.selectedPlayers = [];
        this.init();
    }

    init() {
        const drawButton = document.getElementById('draw-names-btn');
        const confirmButton = document.getElementById('confirm-btn');
        const drawAgainButton = document.getElementById('draw-again-btn');
        const resetCountsButton = document.getElementById('reset-counts-btn');

        drawButton.addEventListener('click', () => this.drawNames());
        confirmButton.addEventListener('click', () => this.confirmSelection());
        drawAgainButton.addEventListener('click', () => this.drawNames());
        resetCountsButton.addEventListener('click', () => this.resetAllCounts());
    }

    onScreenEnter() {
        // Check if there are any players
        const players = this.playerManager.loadPlayers();
        if (players.length === 0) {
            // Redirect to players screen
            setTimeout(() => {
                nav.navigateTo('players-screen');
                alert('Please add players first before using the random picker.');
            }, 100);
            return;
        }

        // Initialize the picker
        this.resetPicker();
        this.populateCountDropdown();
    }

    populateCountDropdown() {
        const players = this.playerManager.loadPlayers();
        const activePlayers = players.filter(p => p.isActive);
        const select = document.getElementById('pick-count-select');

        select.innerHTML = '';
        for (let i = 1; i <= activePlayers.length; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i;
            select.appendChild(option);
        }
    }

    drawNames() {
        const countSelect = document.getElementById('pick-count-select');
        const requestedCount = parseInt(countSelect.value);

        const players = this.playerManager.loadPlayers();
        const activePlayers = players.filter(p => p.isActive);

        // Group players by confirmCount
        const playersByCount = {};
        activePlayers.forEach(player => {
            const count = player.confirmCount;
            if (!playersByCount[count]) {
                playersByCount[count] = [];
            }
            playersByCount[count].push(player);
        });

        // Get sorted count tiers (lowest to highest)
        const countTiers = Object.keys(playersByCount).map(Number).sort((a, b) => a - b);

        // Select players tier by tier
        this.selectedPlayers = [];
        let remaining = requestedCount;

        for (const tier of countTiers) {
            if (remaining === 0) break;

            const tieredPlayers = playersByCount[tier];

            if (tieredPlayers.length <= remaining) {
                // Take all players from this tier
                this.selectedPlayers.push(...tieredPlayers);
                remaining -= tieredPlayers.length;
            } else {
                // Randomly select from this tier
                const shuffled = this.shuffleArray([...tieredPlayers]);
                this.selectedPlayers.push(...shuffled.slice(0, remaining));
                remaining = 0;
            }
        }

        // Re-enable the Confirm button for the new draw
        const confirmButton = document.getElementById('confirm-btn');
        confirmButton.disabled = false;
        confirmButton.textContent = 'Confirm';
        confirmButton.classList.remove('btn-disabled');

        this.showResults();
    }

    shuffleArray(array) {
        // Fisher-Yates shuffle
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    showResults() {
        // Show results (keep picker-setup visible but move it to sticky position)
        document.getElementById('picker-results').classList.remove('hidden');

        // Render selected players with current counts
        this.renderSelectedPlayers();
    }

    renderSelectedPlayers() {
        // Get the latest player data to show current counts
        const players = this.playerManager.loadPlayers();

        const container = document.getElementById('selected-players-list');
        const listHTML = this.selectedPlayers.map((selectedPlayer, index) => {
            // Find the current player data to get the latest count
            const currentPlayer = players.find(p => p.id === selectedPlayer.id);
            const currentCount = currentPlayer ? currentPlayer.confirmCount : selectedPlayer.confirmCount;

            return `
                <div class="selected-player-item">
                    <span class="player-number">${index + 1}</span>
                    <div class="selected-player-info">
                        <span class="selected-player-name">${this.escapeHtml(selectedPlayer.name)}</span>
                        <span class="selected-player-position">${selectedPlayer.position}</span>
                    </div>
                    <span class="selected-player-count">Count: ${currentCount}</span>
                </div>
            `;
        }).join('');

        container.innerHTML = listHTML;
    }

    confirmSelection() {
        // Update confirmCount for selected players
        const players = this.playerManager.loadPlayers();

        this.selectedPlayers.forEach(selectedPlayer => {
            const player = players.find(p => p.id === selectedPlayer.id);
            if (player) {
                player.confirmCount += 1;
            }
        });

        // Save updated players
        this.playerManager.players = players;
        this.playerManager.savePlayers();
        this.playerManager.render();

        // Disable the Confirm button
        const confirmButton = document.getElementById('confirm-btn');
        confirmButton.disabled = true;
        confirmButton.textContent = 'Confirmed';
        confirmButton.classList.add('btn-disabled');

        // Update the displayed counts in the UI
        this.renderSelectedPlayers();
    }

    resetPicker() {
        this.selectedPlayers = [];
        document.getElementById('picker-results').classList.add('hidden');

        // Re-enable the Confirm button
        const confirmButton = document.getElementById('confirm-btn');
        confirmButton.disabled = false;
        confirmButton.textContent = 'Confirm';
        confirmButton.classList.remove('btn-disabled');
    }

    resetAllCounts() {
        if (!confirm('Reset all player counts to 0? This cannot be undone.')) {
            return;
        }

        // Reset confirmCount for all players
        const players = this.playerManager.loadPlayers();
        players.forEach(player => {
            player.confirmCount = 0;
        });

        // Save updated players
        this.playerManager.players = players;
        this.playerManager.savePlayers();
        this.playerManager.render();

        // Update the displayed counts if results are visible
        if (!document.getElementById('picker-results').classList.contains('hidden')) {
            this.renderSelectedPlayers();
        }

        alert('All player counts have been reset to 0.');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Scrimmage generator system
class ScrimmageGenerator {
    constructor(playerManager) {
        this.playerManager = playerManager;
        this.teamA = { guards: [], forwards: [] };
        this.teamB = { guards: [], forwards: [] };
        this.init();
    }

    init() {
        const generateButton = document.getElementById('generate-scrimmage-btn');
        const reselectButton = document.getElementById('reselect-teams-btn');

        generateButton.addEventListener('click', () => this.generateTeams());
        reselectButton.addEventListener('click', () => this.generateTeams());
    }

    generateTeams() {
        const players = this.playerManager.loadPlayers();
        const activePlayers = players.filter(p => p.isActive);

        // Separate players by position
        const guards = activePlayers.filter(p => p.position === 'Guard');
        const forwards = activePlayers.filter(p => p.position === 'Forward');

        // Shuffle both groups
        const shuffledGuards = this.shuffleArray([...guards]);
        const shuffledForwards = this.shuffleArray([...forwards]);

        // Distribute guards randomly between teams
        this.teamA.guards = [];
        this.teamB.guards = [];
        this.distributePlayersRandomly(shuffledGuards, this.teamA.guards, this.teamB.guards, 3);

        // Distribute forwards randomly between teams
        this.teamA.forwards = [];
        this.teamB.forwards = [];
        this.distributePlayersRandomly(shuffledForwards, this.teamA.forwards, this.teamB.forwards, 2);

        this.render();
    }

    distributePlayersRandomly(players, teamASlots, teamBSlots, slotsPerTeam) {
        // Randomly distribute players between both teams
        const shuffledPlayers = this.shuffleArray([...players]);

        for (let i = 0; i < shuffledPlayers.length; i++) {
            // Randomly assign to a team that still has room, or alternate if both have room
            if (teamASlots.length < slotsPerTeam && teamBSlots.length < slotsPerTeam) {
                // Both teams have room, randomly pick one
                if (Math.random() < 0.5) {
                    teamASlots.push(shuffledPlayers[i]);
                } else {
                    teamBSlots.push(shuffledPlayers[i]);
                }
            } else if (teamASlots.length < slotsPerTeam) {
                teamASlots.push(shuffledPlayers[i]);
            } else if (teamBSlots.length < slotsPerTeam) {
                teamBSlots.push(shuffledPlayers[i]);
            }
        }

        // Fill remaining slots with coaches, alternating between teams for balance
        const totalCoachesNeeded = (slotsPerTeam * 2) - (teamASlots.length + teamBSlots.length);
        let addToTeamA = teamASlots.length <= teamBSlots.length;

        for (let i = 0; i < totalCoachesNeeded; i++) {
            const coachSlot = {
                name: 'Coach',
                position: teamASlots === this.teamA.guards || teamBSlots === this.teamB.guards ? 'Guard' : 'Forward',
                isCoach: true
            };

            if (addToTeamA && teamASlots.length < slotsPerTeam) {
                teamASlots.push(coachSlot);
                addToTeamA = false;
            } else if (teamBSlots.length < slotsPerTeam) {
                teamBSlots.push(coachSlot);
                addToTeamA = true;
            } else if (teamASlots.length < slotsPerTeam) {
                teamASlots.push(coachSlot);
                addToTeamA = false;
            }
        }
    }

    shuffleArray(array) {
        // Fisher-Yates shuffle
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    render() {
        // Show teams container
        document.getElementById('scrimmage-teams').classList.remove('hidden');

        // Render Team A Guards
        this.renderSlots('team-a-guards', this.teamA.guards);

        // Render Team A Forwards
        this.renderSlots('team-a-forwards', this.teamA.forwards);

        // Render Team B Guards
        this.renderSlots('team-b-guards', this.teamB.guards);

        // Render Team B Forwards
        this.renderSlots('team-b-forwards', this.teamB.forwards);
    }

    renderSlots(containerId, players) {
        const container = document.getElementById(containerId);
        const slotsHTML = players.map((player, index) => {
            const isCoach = player.isCoach === true;
            const className = isCoach ? 'team-slot coach-slot' : 'team-slot';
            return `
                <div class="${className}">
                    <span class="slot-number">${index + 1}</span>
                    <span class="slot-name">${this.escapeHtml(player.name)}</span>
                </div>
            `;
        }).join('');

        container.innerHTML = slotsHTML;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize app
const nav = new Navigation();
const playerManager = new PlayerManager();
const randomPicker = new RandomPicker(playerManager);
const scrimmageGenerator = new ScrimmageGenerator(playerManager);

// Hook into navigation to handle screen-specific logic
const originalNavigateTo = nav.navigateTo.bind(nav);
nav.navigateTo = function(screenId) {
    originalNavigateTo(screenId);

    // Handle picker screen entry
    if (screenId === 'picker-screen') {
        randomPicker.onScreenEnter();
    }
};
