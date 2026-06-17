const log = document.getElementById("log");
const cmdInput = document.getElementById("cmdInput");

const dot = document.getElementById("dot");
const statusText = document.getElementById("statusText");

const playersList = document.getElementById("playersList");
const players = new Set();

// STATUS SYSTEM

function setServerStatus(isOnline) {
    statusText.textContent = isOnline ? "Online" : "Offline";

    if (isOnline) {
        dot.classList.add("online");
    } else {
        dot.classList.remove("online");
    }
}

// PLAYERS SYSTEM

function addPlayer(name) {
    if (players.has(name)) return;

    players.add(name);

    const div = document.createElement("div");
    div.className = "player";
    div.id = `player-${name}`;

    div.innerHTML = `
        <span class="material-icons">person</span>
        <span class="player-name">${name}</span>
    `;

    playersList.appendChild(div);
}

function removePlayer(name) {
    players.delete(name);

    const el = document.getElementById(`player-${name}`);
    if (el) el.remove();
}

// START SERVER

const originalStart = api.start;

api.start = function () {
    setServerStatus(true);

    try {
        return originalStart();
    } catch (err) {
        setServerStatus(false);
        throw err;
    }
};

// LOG SYSTEM + PARSER

api.onLog(msg => {
    const isAtBottom =
        log.scrollTop + log.clientHeight >= log.scrollHeight - 5;

    log.textContent += msg;

    const clean = msg.toLowerCase();

    // SERVER READY DETECTION

    if (clean.includes("done") || clean.includes("started")) {
        setServerStatus(true);
    }

    // PLAYER JOIN

    const joinMatch = msg.match(/: ([a-zA-Z0-9_]+) joined the game/);
    if (joinMatch) {
        addPlayer(joinMatch[1]);
    }

    // PLAYER LEAVE

    const leaveMatch = msg.match(/: ([a-zA-Z0-9_]+) left the game/);
    if (leaveMatch) {
        removePlayer(leaveMatch[1]);
    }

    if (isAtBottom) {
        log.scrollTop = log.scrollHeight;
    }
});

// STOP SERVER

function stopServer() {
    log.textContent += "\nGuardando mundo antes de apagar...\n";
    log.scrollTop = log.scrollHeight;

    api.cmd('save-all')
        .then(() => api.cmd('stop'))
        .then(() => {

            // CLEAR PLAYERS

            players.clear();
            playersList.innerHTML = "";

            setServerStatus(false);
        })
        .catch(err => {
            console.error(err);

            players.clear();
            playersList.innerHTML = "";

            setServerStatus(false);
        });
}

// SEND COMMAND

function sendCmd() {
    const cmd = cmdInput.value.trim();
    if (!cmd) return;

    api.cmd(cmd);

    log.textContent += `> ${cmd}\n`;

    cmdInput.value = "";
    log.scrollTop = log.scrollHeight;
}

// INIT

setServerStatus(false);