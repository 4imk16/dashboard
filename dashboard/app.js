const log = document.getElementById("log");
const cmdInput = document.getElementById("cmdInput");

const dot = document.getElementById("dot");
const statusText = document.getElementById("statusText");

const playersList = document.getElementById("playersList");
const players = new Set();

const usermodal = document.getElementById("usermodal");
const modalForm = document.getElementById("modalForm");
const modalReason = document.getElementById("modalReason");
const modalClose = document.getElementById("modalClose");
const modalBan = document.getElementById("modalBan");
const modalKick = document.getElementById("modalKick");
const modalTitle = document.getElementById("modalTitle");
const modalPlayerLabel = document.getElementById("modalPlayerLabel");
let selectedPlayer = "";

function openPlayerModal(name) {
    selectedPlayer = name;
    modalTitle.textContent = `Acción a jugador: ${name}`;
    modalPlayerLabel.textContent = `Razón para ${name}`;
    modalReason.value = "";
    usermodal.showModal();
    modalReason.focus();
}

function closePlayerModal() {
    selectedPlayer = "";
    modalReason.value = "";
    usermodal.close();
}

function sendPlayerCommand(action) {
    const reason = modalReason.value.trim();
    if (!reason) {
        modalReason.focus();
        return;
    }

    const command = `/${action} ${selectedPlayer} ${reason}`;
    api.cmd(command);
    log.textContent += `> ${command}\n`;
    log.scrollTop = log.scrollHeight;
    closePlayerModal();
}

playersList.addEventListener("click", event => {
    const playerEl = event.target.closest(".player");
    if (!playerEl) return;

    const playerName = playerEl.querySelector(".player-name")?.textContent?.trim();
    if (!playerName) return;

    openPlayerModal(playerName);
});

modalClose.addEventListener("click", closePlayerModal);
modalBan.addEventListener("click", () => sendPlayerCommand("ban"));
modalKick.addEventListener("click", () => sendPlayerCommand("kick"));

modalForm.addEventListener("submit", event => {
    event.preventDefault();
    closePlayerModal();
});

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