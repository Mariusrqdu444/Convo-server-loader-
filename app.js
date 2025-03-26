document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const credsTab = document.getElementById('creds-tab');
    const phoneTab = document.getElementById('phone-tab');
    const credsContent = document.getElementById('creds-content');
    const phoneContent = document.getElementById('phone-content');
    const credsFileInput = document.getElementById('creds-file-input');
    const credsFileName = document.getElementById('creds-file-name');
    const messageFileInput = document.getElementById('message-file-input');
    const messageFileName = document.getElementById('message-file-name');
    const phoneNumber = document.getElementById('phone-number');
    const groupId = document.getElementById('group-id');
    const delayInput = document.getElementById('delay-seconds');
    const startButton = document.getElementById('start-button');
    const stopButton = document.getElementById('stop-button');
    const clearLogButton = document.getElementById('clear-log');
    const logOutput = document.getElementById('log-output');
    const errorContainer = document.getElementById('error-container');
    const errorMessage = document.getElementById('error-message');
    const successContainer = document.getElementById('success-container');
    const successMessage = document.getElementById('success-message');

    // Variabile pentru stocarea datelor sesiunii
    let sessionId = null;
    let credsFile = null;
    let messageFile = null;
    let statusCheckInterval = null;

    // Tab navigation
    credsTab.addEventListener('click', (e) => {
        e.preventDefault();
        credsTab.classList.add('active');
        phoneTab.classList.remove('active');
        credsContent.style.display = 'block';
        phoneContent.style.display = 'none';
    });

    phoneTab.addEventListener('click', (e) => {
        e.preventDefault();
        phoneTab.classList.add('active');
        credsTab.classList.remove('active');
        phoneContent.style.display = 'block';
        credsContent.style.display = 'none';
    });

    // File input handling for creds.json
    credsFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            if (!file.name.endsWith('.json')) {
                showError('Te rugăm să selectezi un fișier JSON valid.');
                credsFileName.value = '';
                credsFileName.placeholder = 'Selectează fișierul creds.json';
                credsFileInput.value = '';
                return;
            }

            credsFileName.value = file.name;
            credsFile = file;

            // Încărcăm fișierul creds.json pe server
            uploadCredsFile(file);
        }
    });

    // File input handling for message file
    messageFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            messageFileName.value = file.name;
            messageFile = file;
            logToConsole('Fișier de mesaje încărcat: ' + file.name);

            // Încărcăm fișierul de mesaje pe server
            uploadMessageFile(file);
        }
    });

    // Funcție pentru încărcarea fișierului creds.json
    async function uploadCredsFile(file) {
        try {
            const formData = new FormData();
            formData.append('creds', file);

            if (sessionId) {
                formData.append('sessionId', sessionId);
            }

            logToConsole('Se încarcă fișierul creds.json pe server...');

            const response = await fetch('/api/whatsapp/creds/upload', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                sessionId = data.sessionId;
                showSuccess('Fișier creds.json încărcat cu succes.');
                logToConsole('Fișier creds.json încărcat: ' + file.name);
                logToConsole('Session ID: ' + sessionId);
            } else {
                showError(data.message || 'Eroare la încărcarea fișierului creds.json.');
                logToConsole('Eroare la încărcarea fișierului creds.json: ' + data.message);
            }
        } catch (error) {
            showError('Eroare la încărcarea fișierului creds.json.');
            logToConsole('Eroare la încărcarea fișierului: ' + error.message);
        }
    }

    // Funcție pentru încărcarea fișierului de mesaje
    async function uploadMessageFile(file) {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('type', 'message');

            logToConsole('Se încarcă fișierul de mesaje pe server...');

            const response = await fetch('/api/whatsapp/upload', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                showSuccess('Fișier de mesaje încărcat cu succes.');
                logToConsole('Fișier de mesaje încărcat: ' + file.name);
                logToConsole('Cale fișier: ' + data.filePath);

                // Salvăm calea fișierului
                messageFile = {
                    ...file,
                    path: data.filePath
                };
            } else {
                showError(data.message || 'Eroare la încărcarea fișierului de mesaje.');
                logToConsole('Eroare la încărcarea fișierului de mesaje: ' + data.message);
            }
        } catch (error) {
            showError('Eroare la încărcarea fișierului de mesaje.');
            logToConsole('Eroare la încărcarea fișierului: ' + error.message);
        }
    }

    // Start button functionality
    startButton.addEventListener('click', async () => {
        // Validate required fields
        if (!sessionId) {
            showError('Te rugăm să încarci un fișier creds.json pentru autentificare.');
            return;
        }

        if (!phoneNumber.value.trim()) {
            showError('Te rugăm să introduci numărul tău de telefon.');
            return;
        }

        if (!groupId.value.trim()) {
            showError('Te rugăm să introduci ID-ul grupului sau numerele țintă.');
            return;
        }

        try {
            // Pregătim datele pentru trimitere
            const requestData = {
                phoneNumber: phoneNumber.value.trim(),
                targets: groupId.value.trim(),
                delay: parseInt(delayInput.value) || 10,
                sessionId: sessionId
            };

            // Adăugăm calea fișierului de mesaje sau textul mesajului
            if (messageFile && messageFile.path) {
                requestData.messagePath = messageFile.path;
            } else {
                // Pentru demonstrație, folosim un mesaj implicit
                requestData.messageText = "Acesta este un mesaj de test trimis de WhatsApp Bot Boruto Server.";
            }

            logToConsole('Se pornește sesiunea WhatsApp...');

            const response = await fetch('/api/whatsapp/session/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });

            const data = await response.json();

            if (data.success) {
                startButton.disabled = true;
                stopButton.disabled = false;
                showSuccess('Sesiune WhatsApp pornită cu succes.');
                logToConsole('Sesiune WhatsApp pornită cu succes.');
                logToConsole('Session ID: ' + data.sessionId);

                // Începem verificarea periodică a stării
                startStatusCheck(data.sessionId);
            } else {
                showError(data.message || 'Eroare la pornirea sesiunii WhatsApp.');
                logToConsole('Eroare la pornirea sesiunii WhatsApp: ' + data.message);
            }
        } catch (error) {
            showError('Eroare la pornirea sesiunii WhatsApp.');
            logToConsole('Eroare la pornirea sesiunii WhatsApp: ' + error.message);
        }
    });

    // Stop button functionality
    stopButton.addEventListener('click', async () => {
        if (!sessionId) {
            showError('Nu există o sesiune activă de oprit.');
            return;
        }

        try {
            logToConsole('Se oprește sesiunea WhatsApp...');

            const response = await fetch('/api/whatsapp/session/stop', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ sessionId })
            });

            const data = await response.json();

            if (data.success) {
                startButton.disabled = false;
                stopButton.disabled = true;
                showSuccess('Sesiune WhatsApp oprită cu succes.');
                logToConsole('Sesiune WhatsApp oprită cu succes.');

                // Oprim verificarea periodică a stării
                stopStatusCheck();
            } else {
                showError(data.message || 'Eroare la oprirea sesiunii WhatsApp.');
                logToConsole('Eroare la oprirea sesiunii WhatsApp: ' + data.message);
            }
        } catch (error) {
            showError('Eroare la oprirea sesiunii WhatsApp.');
            logToConsole('Eroare la oprirea sesiunii WhatsApp: ' + error.message);
        }
    });

    // Funcții pentru verificarea stării sesiunii
    function startStatusCheck(sid) {
        // Oprim orice interval existent
        stopStatusCheck();

        // Verificăm starea imediat
        checkSessionStatus(sid);

        // Apoi configurăm verificarea periodică
        statusCheckInterval = setInterval(() => {
            checkSessionStatus(sid);
        }, 5000); // Verificăm la fiecare 5 secunde
    }

    function stopStatusCheck() {
        if (statusCheckInterval) {
            clearInterval(statusCheckInterval);
            statusCheckInterval = null;
        }
    }

    async function checkSessionStatus(sid) {
        try {
            const response = await fetch(`/api/whatsapp/session/status?sessionId=${sid}`, {
                method: 'GET'
            });

            const data = await response.json();

            if (data.success) {
                // Actualizăm interfața cu informații despre starea sesiunii
                logToConsole(`Stare sesiune: ${data.isActive ? 'Activă' : 'Inactivă'}`);
                logToConsole(`Mesaje trimise: ${data.messageCount}`);

                // Dacă sesiunea nu mai este activă, actualizăm butoanele
                if (!data.isActive) {
                    startButton.disabled = false;
                    stopButton.disabled = true;
                    stopStatusCheck();
                }
            } else {
                logToConsole('Eroare la obținerea stării sesiunii: ' + data.message);
            }
        } catch (error) {
            logToConsole('Eroare la verificarea stării sesiunii: ' + error.message);
        }
    }

    // Clear log button
    clearLogButton.addEventListener('click', () => {
        logOutput.textContent = '';
    });

    // Helper functions
    function showError(message) {
        errorMessage.textContent = message;
        errorContainer.style.display = 'block';
        successContainer.style.display = 'none';

        // Auto-hide after 5 seconds
        setTimeout(() => {
            errorContainer.style.display = 'none';
        }, 5000);
    }

    function showSuccess(message) {
        successMessage.textContent = message;
        successContainer.style.display = 'block';
        errorContainer.style.display = 'none';

        // Auto-hide after 5 seconds
        setTimeout(() => {
            successContainer.style.display = 'none';
        }, 5000);
    }

    function logToConsole(text) {
        const now = new Date();
        const timestamp = now.toLocaleTimeString();
        const logEntry = `[${timestamp}] ${text}`;

        logOutput.textContent += logEntry + '\n';
        logOutput.scrollTop = logOutput.scrollHeight;
    }

    // Initial log message
    logToConsole('Aplicație inițializată. Te rugăm să încarci fișierul creds.json pentru a continua.');

    // Show initial reminder to upload creds.json
    showError('Te rugăm să încarci fișierul creds.json personal pentru a utiliza aplicația.');
});