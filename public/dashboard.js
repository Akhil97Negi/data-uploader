const socket = io();
const logsContainer = document.getElementById('logs');
const filterSelect = document.getElementById('filter');

filterSelect.addEventListener('change', filterLogs);

socket.on('log', (log) => {
    addLog(log);
});

function addLog(log) {
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${log.level}`;
    logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${log.message}`;
    logsContainer.appendChild(logEntry);
    filterLogs();
}

function filterLogs() {
    const filter = filterSelect.value;
    const logEntries = document.querySelectorAll('.log-entry');

    logEntries.forEach(entry => {
        if (filter === 'all' || entry.classList.contains(filter)) {
            entry.style.display = '';
        } else {
            entry.style.display = 'none';
        }
    });
}
