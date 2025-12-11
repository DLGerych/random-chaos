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
        // Ensure all players have isActive field and positionCounts
        return players.map(player => {
            // Migrate from old confirmCount to positionCounts
            if (player.confirmCount !== undefined && !player.positionCounts) {
                player.positionCounts = {};
                // Migrate old count to position 1 for backwards compatibility
                if (player.confirmCount > 0) {
                    player.positionCounts[1] = player.confirmCount;
                }
                delete player.confirmCount;
            }

            return {
                ...player,
                isActive: player.isActive !== undefined ? player.isActive : true,
                positionCounts: player.positionCounts || {}
            };
        });
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
            positionCounts: {},
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

    getTotalCount(player) {
        if (!player.positionCounts) return 0;
        return Object.values(player.positionCounts).reduce((sum, count) => sum + count, 0);
    }

    render() {
        const container = document.getElementById('players-list');

        if (this.players.length === 0) {
            container.innerHTML = '<p class="empty-state">No players yet. Add your first player above!</p>';
            return;
        }

        const listHTML = this.players.map(player => {
            const totalCount = this.getTotalCount(player);
            return `
            <div class="player-item ${player.isActive ? '' : 'inactive'}" data-id="${player.id}">
                <div class="player-info">
                    <span class="player-name">${this.escapeHtml(player.name)}</span>
                    <span class="player-count">Confirmed: ${totalCount}</span>
                </div>
                <div class="player-controls">
                    <button class="toggle-active-btn ${player.isActive ? 'active' : 'inactive'}" data-id="${player.id}">
                        ${player.isActive ? 'Active' : 'Inactive'}
                    </button>
                    <select class="position-select" data-id="${player.id}">
                        <option value="Guard" ${player.position === 'Guard' ? 'selected' : ''}>Guard</option>
                        <option value="Forward" ${player.position === 'Forward' ? 'selected' : ''}>Forward</option>
                        <option value="Guard/Forward" ${player.position === 'Guard/Forward' ? 'selected' : ''}>Guard/Forward</option>
                    </select>
                    <button class="delete-btn" data-id="${player.id}">Delete</button>
                </div>
            </div>
        `;
        }).join('');

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

        // selectedPlayers will now store {player, position} objects
        this.selectedPlayers = [];
        const selectedPlayerIds = new Set(); // Track which players have been selected to avoid duplicates

        // Select players for each position
        for (let position = 1; position <= requestedCount; position++) {
            // Get available players (not yet selected in this draw)
            const availablePlayers = activePlayers.filter(p => !selectedPlayerIds.has(p.id));

            if (availablePlayers.length === 0) {
                // No more players available
                break;
            }

            // Group available players by their count for this specific position
            const playersByCount = {};
            availablePlayers.forEach(player => {
                const count = player.positionCounts[position] || 0;
                if (!playersByCount[count]) {
                    playersByCount[count] = [];
                }
                playersByCount[count].push(player);
            });

            // Get sorted count tiers (lowest to highest)
            const countTiers = Object.keys(playersByCount).map(Number).sort((a, b) => a - b);

            // Select one player from the lowest tier
            const lowestTier = countTiers[0];
            const tieredPlayers = playersByCount[lowestTier];

            // Randomly select one player from the lowest tier
            const selectedPlayer = tieredPlayers[Math.floor(Math.random() * tieredPlayers.length)];

            // Add to selected players with position info
            this.selectedPlayers.push({
                player: selectedPlayer,
                position: position
            });

            // Mark this player as selected
            selectedPlayerIds.add(selectedPlayer.id);
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
        const listHTML = this.selectedPlayers.map((selection) => {
            // Find the current player data to get the latest count
            const currentPlayer = players.find(p => p.id === selection.player.id);
            const positionCount = currentPlayer && currentPlayer.positionCounts
                ? (currentPlayer.positionCounts[selection.position] || 0)
                : 0;

            return `
                <div class="selected-player-item">
                    <span class="player-number">${selection.position}</span>
                    <div class="selected-player-info">
                        <span class="selected-player-name">${this.escapeHtml(selection.player.name)}</span>
                        <span class="selected-player-position">${selection.player.position}</span>
                    </div>
                    <span class="selected-player-count">Pos ${selection.position}: ${positionCount}</span>
                </div>
            `;
        }).join('');

        container.innerHTML = listHTML;
    }

    confirmSelection() {
        // Update positionCounts for selected players
        const players = this.playerManager.loadPlayers();

        this.selectedPlayers.forEach(selection => {
            const player = players.find(p => p.id === selection.player.id);
            if (player) {
                // Increment count for this specific position
                if (!player.positionCounts[selection.position]) {
                    player.positionCounts[selection.position] = 0;
                }
                player.positionCounts[selection.position] += 1;
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

        // Reset positionCounts for all players
        const players = this.playerManager.loadPlayers();
        players.forEach(player => {
            player.positionCounts = {};
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
        let guards = activePlayers.filter(p => p.position === 'Guard');
        let forwards = activePlayers.filter(p => p.position === 'Forward');
        const flexible = activePlayers.filter(p => p.position === 'Guard/Forward');

        const totalGuardSlots = 6;
        const totalForwardSlots = 4;

        // Calculate deficits (how many players we need to avoid coaches)
        const guardDeficit = Math.max(0, totalGuardSlots - guards.length);
        const forwardDeficit = Math.max(0, totalForwardSlots - forwards.length);

        // Shuffle flexible players
        const shuffledFlexible = this.shuffleArray([...flexible]);

        let guardsAssigned = 0;
        let forwardsAssigned = 0;

        shuffledFlexible.forEach(player => {
            // First priority: fill deficits to avoid coaches
            if (guardsAssigned < guardDeficit) {
                guards = [...guards, player];
                guardsAssigned++;
            } else if (forwardsAssigned < forwardDeficit) {
                forwards = [...forwards, player];
                forwardsAssigned++;
            } else {
                // Deficits filled, randomly assign the rest
                if (Math.random() < 0.5) {
                    guards = [...guards, player];
                } else {
                    forwards = [...forwards, player];
                }
            }
        });

        // Initialize teams
        this.teamA.guards = [];
        this.teamB.guards = [];
        this.teamA.forwards = [];
        this.teamB.forwards = [];

        // Distribute guards
        this.distributePlayersToPosition(guards, this.teamA.guards, this.teamB.guards, 3);

        // Distribute forwards
        this.distributePlayersToPosition(forwards, this.teamA.forwards, this.teamB.forwards, 2);

        // Fill any remaining empty slots with coaches
        this.fillRemainingWithCoaches();

        // Calculate sitting out players
        const assignedPlayers = [
            ...this.teamA.guards,
            ...this.teamA.forwards,
            ...this.teamB.guards,
            ...this.teamB.forwards
        ];

        // Filter out coaches to get only real players
        const realAssignedPlayers = assignedPlayers.filter(p => !p.isCoach);

        // Find who's sitting out
        this.sittingOut = activePlayers.filter(player =>
            !realAssignedPlayers.find(p => p.id === player.id)
        );

        this.render();
    }

    distributePlayersToPosition(players, teamASlots, teamBSlots, slotsPerTeam) {
        const shuffled = this.shuffleArray([...players]);

        for (let player of shuffled) {
            if (teamASlots.length < slotsPerTeam && teamBSlots.length < slotsPerTeam) {
                // Both teams have room, randomly pick one
                if (Math.random() < 0.5) {
                    teamASlots.push(player);
                } else {
                    teamBSlots.push(player);
                }
            } else if (teamASlots.length < slotsPerTeam) {
                teamASlots.push(player);
            } else if (teamBSlots.length < slotsPerTeam) {
                teamBSlots.push(player);
            }
        }
    }

    fillRemainingWithCoaches() {
        // Fill guard slots
        while (this.teamA.guards.length < 3) {
            this.teamA.guards.push({ name: 'Coach', position: 'Guard', isCoach: true });
        }
        while (this.teamB.guards.length < 3) {
            this.teamB.guards.push({ name: 'Coach', position: 'Guard', isCoach: true });
        }

        // Fill forward slots
        while (this.teamA.forwards.length < 2) {
            this.teamA.forwards.push({ name: 'Coach', position: 'Forward', isCoach: true });
        }
        while (this.teamB.forwards.length < 2) {
            this.teamB.forwards.push({ name: 'Coach', position: 'Forward', isCoach: true });
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

        // Render sitting out players
        this.renderSittingOut();
    }

    renderSittingOut() {
        const container = document.getElementById('sitting-out-list');
        const section = document.getElementById('sitting-out-section');

        if (!this.sittingOut || this.sittingOut.length === 0) {
            section.style.display = 'none';
            return;
        }

        section.style.display = 'block';

        const sittingOutHTML = this.sittingOut.map(player => {
            return `
                <div class="sitting-out-player">
                    <span class="sitting-out-name">${this.escapeHtml(player.name)}</span>
                    <span class="sitting-out-position">${player.position}</span>
                </div>
            `;
        }).join('');

        container.innerHTML = sittingOutHTML;
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

// Loose Ball drill system
class LooseBallDrill {
    constructor(playerManager) {
        this.playerManager = playerManager;
        this.selectedPlayers = [];
        this.offensivePlayer = null;
        this.defensivePlayer = null;
        this.stats = this.loadStats();
        this.init();
    }

    init() {
        const newPlayersButton = document.getElementById('looseball-new-players-btn');
        const makeButton = document.getElementById('looseball-make-btn');
        const missButton = document.getElementById('looseball-miss-btn');
        const resetStatsButton = document.getElementById('looseball-reset-stats-btn');

        newPlayersButton.addEventListener('click', () => this.selectNewPlayers());
        makeButton.addEventListener('click', () => this.recordMake());
        missButton.addEventListener('click', () => this.recordMiss());
        resetStatsButton.addEventListener('click', () => this.resetStats());
    }

    loadStats() {
        const stored = localStorage.getItem('chaos-picker-looseball-stats');
        return stored ? JSON.parse(stored) : {};
    }

    saveStats() {
        localStorage.setItem('chaos-picker-looseball-stats', JSON.stringify(this.stats));
    }

    getPlayerStats(playerId) {
        if (!this.stats[playerId]) {
            this.stats[playerId] = {
                offenseCount: 0,
                defenseCount: 0,
                makes: 0,
                stops: 0,
                lastOpponent: null
            };
        }
        return this.stats[playerId];
    }

    selectNewPlayers() {
        const players = this.playerManager.loadPlayers();
        const activePlayers = players.filter(p => p.isActive);

        if (activePlayers.length < 2) {
            alert('Need at least 2 active players for this drill.');
            return;
        }

        // Select 2 players using the complex algorithm
        const [player1, player2] = this.selectTwoPlayers(activePlayers);

        this.selectedPlayers = [player1, player2];
        this.offensivePlayer = null;
        this.defensivePlayer = null;

        this.renderPlayerSelection();
    }

    selectTwoPlayers(activePlayers) {
        // Ensure all players have stats
        activePlayers.forEach(p => this.getPlayerStats(p.id));

        // Group players by total turns (offense + defense)
        const playersByTurns = {};
        activePlayers.forEach(player => {
            const stats = this.getPlayerStats(player.id);
            const totalTurns = stats.offenseCount + stats.defenseCount;
            if (!playersByTurns[totalTurns]) {
                playersByTurns[totalTurns] = [];
            }
            playersByTurns[totalTurns].push(player);
        });

        // Get the tier with the least turns
        const sortedTurns = Object.keys(playersByTurns).map(Number).sort((a, b) => a - b);
        const lowestTurnCount = sortedTurns[0];
        let eligiblePlayers = playersByTurns[lowestTurnCount];

        // Select player 1: from eligible players, choose one with most makes
        const player1 = this.selectPlayerByMakes(eligiblePlayers, true);

        // For player 2, filter out player1 and anyone who shouldn't face player1
        let eligibleForPlayer2 = eligiblePlayers.filter(p => {
            if (p.id === player1.id) return false;

            const player1Stats = this.getPlayerStats(player1.id);
            const pStats = this.getPlayerStats(p.id);

            // Don't allow if player1's last opponent was this player
            if (player1Stats.lastOpponent === p.id) return false;

            // Don't allow if this player's last opponent was player1
            if (pStats.lastOpponent === player1.id) return false;

            return true;
        });

        // If no eligible players in the same turn group, look at all other players
        if (eligibleForPlayer2.length === 0) {
            // Use reverse selection criteria
            eligibleForPlayer2 = activePlayers.filter(p => {
                if (p.id === player1.id) return false;

                const player1Stats = this.getPlayerStats(player1.id);
                const pStats = this.getPlayerStats(p.id);

                // Don't allow if player1's last opponent was this player
                if (player1Stats.lastOpponent === p.id) return false;

                // Don't allow if this player's last opponent was player1
                if (pStats.lastOpponent === player1.id) return false;

                return true;
            });

            if (eligibleForPlayer2.length === 0) {
                // If still no eligible players, just pick any other player (ignore last opponent rule)
                eligibleForPlayer2 = activePlayers.filter(p => p.id !== player1.id);
            }

            // Reverse selection: most defense, then least stops, then least makes
            const player2 = this.selectPlayerReverse(eligibleForPlayer2);
            return [player1, player2];
        }

        // Normal selection for player 2: next highest makes
        const player2 = this.selectPlayerByMakes(eligibleForPlayer2, false);

        return [player1, player2];
    }

    selectPlayerByMakes(players, isFirst) {
        // Sort by makes (descending), then by offense count (descending), then by stops (descending)
        const sorted = players.sort((a, b) => {
            const aStats = this.getPlayerStats(a.id);
            const bStats = this.getPlayerStats(b.id);

            // Primary: most makes
            if (aStats.makes !== bStats.makes) {
                return bStats.makes - aStats.makes;
            }

            // Tie-breaker 1: most times on offense
            if (aStats.offenseCount !== bStats.offenseCount) {
                return bStats.offenseCount - aStats.offenseCount;
            }

            // Tie-breaker 2: most stops
            if (aStats.stops !== bStats.stops) {
                return bStats.stops - aStats.stops;
            }

            // Tie-breaker 3: random
            return Math.random() - 0.5;
        });

        if (isFirst) {
            // For player 1, pick from the top group (highest makes)
            const topMakes = this.getPlayerStats(sorted[0].id).makes;
            const topGroup = sorted.filter(p => this.getPlayerStats(p.id).makes === topMakes);
            return topGroup[Math.floor(Math.random() * topGroup.length)];
        } else {
            // For player 2, pick the next one
            return sorted[0];
        }
    }

    selectPlayerReverse(players) {
        // Reverse selection: most defense, then least stops, then least makes
        const sorted = players.sort((a, b) => {
            const aStats = this.getPlayerStats(a.id);
            const bStats = this.getPlayerStats(b.id);

            // Primary: most times on defense
            if (aStats.defenseCount !== bStats.defenseCount) {
                return bStats.defenseCount - aStats.defenseCount;
            }

            // Tie-breaker 1: least stops
            if (aStats.stops !== bStats.stops) {
                return aStats.stops - bStats.stops;
            }

            // Tie-breaker 2: least makes
            if (aStats.makes !== bStats.makes) {
                return aStats.makes - bStats.makes;
            }

            // Tie-breaker 3: random
            return Math.random() - 0.5;
        });

        return sorted[0];
    }

    renderPlayerSelection() {
        const playersSection = document.getElementById('looseball-players-section');
        const resultSection = document.getElementById('looseball-result-section');
        const playersList = document.getElementById('looseball-players-list');

        playersSection.classList.remove('hidden');
        resultSection.classList.add('hidden');

        const buttonsHTML = this.selectedPlayers.map(player => {
            return `
                <button class="looseball-player-btn" data-id="${player.id}">
                    ${this.escapeHtml(player.name)}
                </button>
            `;
        }).join('');

        playersList.innerHTML = buttonsHTML;

        // Add event listeners to player buttons
        playersList.querySelectorAll('.looseball-player-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const playerId = e.target.dataset.id;
                this.selectOffensivePlayer(playerId);
            });
        });

        this.renderStats();
    }

    selectOffensivePlayer(playerId) {
        this.offensivePlayer = this.selectedPlayers.find(p => p.id === playerId);
        this.defensivePlayer = this.selectedPlayers.find(p => p.id !== playerId);

        // Disable player buttons
        document.querySelectorAll('.looseball-player-btn').forEach(btn => {
            btn.disabled = true;
        });

        // Show result section
        const playersSection = document.getElementById('looseball-players-section');
        const resultSection = document.getElementById('looseball-result-section');

        playersSection.classList.add('hidden');
        resultSection.classList.remove('hidden');

        document.getElementById('looseball-offense-name').textContent = this.offensivePlayer.name;
        document.getElementById('looseball-defense-name').textContent = this.defensivePlayer.name;
    }

    recordMake() {
        if (!this.offensivePlayer || !this.defensivePlayer) return;

        const offenseStats = this.getPlayerStats(this.offensivePlayer.id);
        const defenseStats = this.getPlayerStats(this.defensivePlayer.id);

        offenseStats.offenseCount += 1;
        offenseStats.makes += 1;
        offenseStats.lastOpponent = this.defensivePlayer.id;

        defenseStats.defenseCount += 1;
        defenseStats.lastOpponent = this.offensivePlayer.id;

        this.saveStats();
        this.renderStats();
        this.resetRound();
    }

    recordMiss() {
        if (!this.offensivePlayer || !this.defensivePlayer) return;

        const offenseStats = this.getPlayerStats(this.offensivePlayer.id);
        const defenseStats = this.getPlayerStats(this.defensivePlayer.id);

        offenseStats.offenseCount += 1;
        offenseStats.lastOpponent = this.defensivePlayer.id;

        defenseStats.defenseCount += 1;
        defenseStats.stops += 1;
        defenseStats.lastOpponent = this.offensivePlayer.id;

        this.saveStats();
        this.renderStats();
        this.resetRound();
    }

    resetRound() {
        this.selectedPlayers = [];
        this.offensivePlayer = null;
        this.defensivePlayer = null;

        document.getElementById('looseball-players-section').classList.add('hidden');
        document.getElementById('looseball-result-section').classList.add('hidden');
    }

    renderStats() {
        const players = this.playerManager.loadPlayers();
        const activePlayers = players.filter(p => p.isActive);
        const statsList = document.getElementById('looseball-stats-list');

        if (activePlayers.length === 0) {
            statsList.innerHTML = '<p class="empty-state">No active players.</p>';
            return;
        }

        // Sort by total turns (descending)
        const sortedPlayers = activePlayers.sort((a, b) => {
            const aStats = this.getPlayerStats(a.id);
            const bStats = this.getPlayerStats(b.id);
            const aTurns = aStats.offenseCount + aStats.defenseCount;
            const bTurns = bStats.offenseCount + bStats.defenseCount;
            return bTurns - aTurns;
        });

        const statsHTML = sortedPlayers.map(player => {
            const stats = this.getPlayerStats(player.id);
            const totalTurns = stats.offenseCount + stats.defenseCount;

            return `
                <div class="looseball-stat-item">
                    <div class="looseball-stat-name">${this.escapeHtml(player.name)}</div>
                    <div class="looseball-stat-details">
                        <div class="looseball-stat-item-detail">
                            <span class="looseball-stat-label">Turns</span>
                            <span class="looseball-stat-value">${totalTurns}</span>
                        </div>
                        <div class="looseball-stat-item-detail">
                            <span class="looseball-stat-label">Offense</span>
                            <span class="looseball-stat-value">${stats.offenseCount}</span>
                        </div>
                        <div class="looseball-stat-item-detail">
                            <span class="looseball-stat-label">Defense</span>
                            <span class="looseball-stat-value">${stats.defenseCount}</span>
                        </div>
                        <div class="looseball-stat-item-detail">
                            <span class="looseball-stat-label">Makes</span>
                            <span class="looseball-stat-value">${stats.makes}</span>
                        </div>
                        <div class="looseball-stat-item-detail">
                            <span class="looseball-stat-label">Stops</span>
                            <span class="looseball-stat-value">${stats.stops}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        statsList.innerHTML = statsHTML;
    }

    resetStats() {
        if (!confirm('Reset all Loose Ball stats? This cannot be undone.')) {
            return;
        }

        this.stats = {};
        this.saveStats();
        this.resetRound();
        this.renderStats();

        alert('All Loose Ball stats have been reset to 0.');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Layup Lines system
class LayupLines {
    constructor(playerManager) {
        this.playerManager = playerManager;
        this.stats = this.loadStats();
        this.currentlySelecting = null;
        this.playerOrder = [];
        this.init();
    }

    init() {
        const resetStatsButton = document.getElementById('layuplines-reset-stats-btn');
        resetStatsButton.addEventListener('click', () => this.resetStats());
    }

    loadStats() {
        const stored = localStorage.getItem('chaos-picker-layuplines-stats');
        return stored ? JSON.parse(stored) : {};
    }

    saveStats() {
        localStorage.setItem('chaos-picker-layuplines-stats', JSON.stringify(this.stats));
    }

    getPlayerStats(playerId) {
        if (!this.stats[playerId]) {
            this.stats[playerId] = {
                attempts: 0,
                successes: 0
            };
        }
        return this.stats[playerId];
    }

    onScreenEnter() {
        const players = this.playerManager.loadPlayers();
        const activePlayers = players.filter(p => p.isActive);

        this.playerOrder = activePlayers.map(p => p.id);
        this.currentlySelecting = null;

        this.render();
    }

    render() {
        this.renderPlayerButtons();
        this.renderStats();
    }

    renderPlayerButtons() {
        const players = this.playerManager.loadPlayers();
        const activePlayers = players.filter(p => p.isActive);
        const playersList = document.getElementById('layuplines-players-list');

        if (activePlayers.length === 0) {
            playersList.innerHTML = '<p class="empty-state">No active players.</p>';
            return;
        }

        // Sort by playerOrder
        const sortedPlayers = this.playerOrder
            .map(id => activePlayers.find(p => p.id === id))
            .filter(p => p !== undefined);

        const buttonsHTML = sortedPlayers.map(player => {
            if (this.currentlySelecting === player.id) {
                return `
                    <div class="layuplines-player-item" data-id="${player.id}">
                        <div class="layuplines-action-buttons">
                            <button class="layuplines-success-btn" data-id="${player.id}">
                                <span class="layuplines-icon">✓</span>
                            </button>
                            <button class="layuplines-fail-btn" data-id="${player.id}">
                                <span class="layuplines-icon">✗</span>
                            </button>
                        </div>
                    </div>
                `;
            } else {
                return `
                    <div class="layuplines-player-item" data-id="${player.id}">
                        <button class="layuplines-player-btn" data-id="${player.id}">
                            ${this.escapeHtml(player.name)}
                        </button>
                    </div>
                `;
            }
        }).join('');

        playersList.innerHTML = buttonsHTML;

        // Add event listeners to player buttons
        playersList.querySelectorAll('.layuplines-player-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const playerId = e.target.dataset.id;
                this.handlePlayerClick(playerId);
            });
        });

        // Add event listeners to success buttons
        playersList.querySelectorAll('.layuplines-success-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const playerId = e.target.dataset.id;
                this.handleSuccess(playerId);
            });
        });

        // Add event listeners to fail buttons
        playersList.querySelectorAll('.layuplines-fail-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const playerId = e.target.dataset.id;
                this.handleFail(playerId);
            });
        });
    }

    handlePlayerClick(playerId) {
        const stats = this.getPlayerStats(playerId);
        stats.attempts += 1;
        this.saveStats();

        this.currentlySelecting = playerId;
        this.render();
    }

    handleSuccess(playerId) {
        const stats = this.getPlayerStats(playerId);
        stats.successes += 1;
        this.saveStats();

        this.movePlayerToEnd(playerId);
        this.currentlySelecting = null;
        this.render();
    }

    handleFail(playerId) {
        this.movePlayerToEnd(playerId);
        this.currentlySelecting = null;
        this.render();
    }

    movePlayerToEnd(playerId) {
        const index = this.playerOrder.indexOf(playerId);
        if (index !== -1) {
            this.playerOrder.splice(index, 1);
            this.playerOrder.push(playerId);
        }
    }

    renderStats() {
        const players = this.playerManager.loadPlayers();
        const activePlayers = players.filter(p => p.isActive);
        const statsList = document.getElementById('layuplines-stats-list');

        if (activePlayers.length === 0) {
            statsList.innerHTML = '<p class="empty-state">No active players.</p>';
            return;
        }

        const statsHTML = activePlayers.map(player => {
            const stats = this.getPlayerStats(player.id);
            const successRate = stats.attempts > 0
                ? Math.round((stats.successes / stats.attempts) * 100)
                : 0;

            return `
                <div class="layuplines-stat-item">
                    <div class="layuplines-stat-name">${this.escapeHtml(player.name)}</div>
                    <div class="layuplines-stat-details">
                        <div class="layuplines-stat-item-detail">
                            <span class="layuplines-stat-label">Attempts</span>
                            <span class="layuplines-stat-value">${stats.attempts}</span>
                        </div>
                        <div class="layuplines-stat-item-detail">
                            <span class="layuplines-stat-label">Successes</span>
                            <span class="layuplines-stat-value">${stats.successes}</span>
                        </div>
                        <div class="layuplines-stat-item-detail">
                            <span class="layuplines-stat-label">Rate</span>
                            <span class="layuplines-stat-value">${successRate}%</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        statsList.innerHTML = statsHTML;
    }

    resetStats() {
        if (!confirm('Reset all Layup Lines stats? This cannot be undone.')) {
            return;
        }

        this.stats = {};
        this.saveStats();
        this.currentlySelecting = null;
        this.render();

        alert('All Layup Lines stats have been reset to 0.');
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
const looseBallDrill = new LooseBallDrill(playerManager);
const layupLines = new LayupLines(playerManager);

// Hook into navigation to handle screen-specific logic
const originalNavigateTo = nav.navigateTo.bind(nav);
nav.navigateTo = function(screenId) {
    originalNavigateTo(screenId);

    // Handle picker screen entry
    if (screenId === 'picker-screen') {
        randomPicker.onScreenEnter();
    }

    // Handle layup lines screen entry
    if (screenId === 'layuplines-screen') {
        layupLines.onScreenEnter();
    }
};
