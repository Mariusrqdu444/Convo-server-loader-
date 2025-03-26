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
    const startButton = document.getElementById('start-button');
    const stopButton = document.getElementById('stop-button');
    const clearLogButton = document.getElementById('clear-log');
    const logOutput = document.getElementById('log-output');
    const errorContainer = document.getElementById('error-container');
    const errorMessage = document.getElementById('error-message');
    const successContainer = document.getElementById('success-container');
    const successMessage = document.getElementById('success-message');

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
            if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
                showError('Te rugăm să selectezi un fișier JSON valid.');
                credsFileName.value = '';
                credsFileName.placeholder = 'Selectează fișierul creds.json';
                credsFileInput.value = '';
                return;
            }
            
            credsFileName.value = file.name;
            
            // Read and validate the JSON file
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const content = JSON.parse(event.target.result);
                    // Check for minimal expected properties in a WhatsApp creds.json
                    if (!content.clientID || !content.serverToken || !content.clientToken) {
                        showError('Fișierul creds.json nu conține datele necesare pentru autentificarea WhatsApp.');
                        return;
                    }
                    
                    showSuccess('Fișier creds.json valid încărcat cu succes.');
                    logToConsole('Fișier creds.json încărcat: ' + file.name);
                } catch (error) {
                    showError('Fișierul creds.json este invalid sau corupt. Asigură-te că fișierul conține JSON valid.');
                    logToConsole('Eroare la citirea fișierului creds.json: ' + error.message);
                }
            };
            
            reader.onerror = () => {
                showError('Eroare la citirea fișierului creds.json.');
            };
            
            reader.readAsText(file);
        }
    });

    // File input handling for message file
    messageFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            messageFileName.value = file.name;
            logToConsole('Fișier de mesaje încărcat: ' + file.name);
        }
    });

    // Start button functionality
    startButton.addEventListener('click', () => {
        // Validate required fields
        if (!credsFileInput.files.length) {
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

        // Simulate starting the WhatsApp session
        startButton.disabled = true;
        stopButton.disabled = false;
        showSuccess('Sesiune WhatsApp pornită. Se așteaptă conectarea...');
        logToConsole('Pornire sesiune WhatsApp...');
        logToConsole('Număr telefon: ' + phoneNumber.value);
        logToConsole('Grup/Țintă: ' + groupId.value);
        
        // This is where you would normally initialize the WhatsApp connection
        // with the uploaded creds.json file
        
        // For demonstration, we'll just show what would happen
        setTimeout(() => {
            logToConsole('Autentificare reușită cu fișierul creds.json încărcat de utilizator');
            logToConsole('Conectat la WhatsApp');
        }, 2000);
    });

    // Stop button functionality
    stopButton.addEventListener('click', () => {
        startButton.disabled = false;
        stopButton.disabled = true;
        showSuccess('Sesiune WhatsApp oprită cu succes.');
        logToConsole('Sesiune WhatsApp oprită.');
    });

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
