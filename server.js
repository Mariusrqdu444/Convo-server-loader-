const express = require('express');
const multer = require('multer');
const { Client } = require('whatsapp-web.js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Înlocuire pentru nanoid, care este un modul ESM
function generateId(size = 21) {
  return crypto.randomBytes(size).toString('base64url').slice(0, size);
}

// Creare directoare dacă nu există
const uploadsDir = path.join(__dirname, 'uploads');
const credsDir = path.join(uploadsDir, 'creds');
const messagesDir = path.join(uploadsDir, 'messages');
const userSessionsDir = path.join(__dirname, 'user_sessions');

[uploadsDir, credsDir, messagesDir, userSessionsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configurare multer pentru încărcarea fișierelor
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'creds') {
      cb(null, credsDir);
    } else if (file.fieldname === 'message') {
      cb(null, messagesDir);
    } else {
      cb(new Error('Tip de fișier neacceptat'));
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `${file.fieldname}-${uniqueSuffix}-${file.originalname}`);
  }
});

const upload = multer({ storage });

// Configurare multer pentru creds.json
const credsStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const sessionId = req.body.sessionId || generateId();
    const sessionDir = path.join(userSessionsDir, sessionId);
    
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }
    
    cb(null, sessionDir);
  },
  filename: (req, file, cb) => {
    cb(null, 'creds.json');
  }
});

const uploadCreds = multer({ storage: credsStorage });

// Crearea aplicației Express
const app = express();
app.use(express.json());
app.use(express.static(__dirname));

// Gestionare sesiuni WhatsApp active
const activeSessions = new Map();

// Endpoint pentru încărcarea fișierului creds.json
app.post('/api/whatsapp/creds/upload', uploadCreds.single('creds'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Fișierul creds.json lipsește"
      });
    }
    
    // Generăm sau folosim sessionId
    const sessionId = req.body.sessionId || generateId();
    const sessionDir = path.join(userSessionsDir, sessionId);
    const credsPath = path.join(sessionDir, 'creds.json');
    
    // Verificăm dacă fișierul este un JSON valid
    try {
      const fileContent = fs.readFileSync(credsPath, 'utf-8');
      JSON.parse(fileContent); // Verificăm dacă e JSON valid
    } catch (err) {
      // Ștergem fișierul dacă nu este JSON valid
      if (fs.existsSync(credsPath)) {
        fs.unlinkSync(credsPath);
      }
      
      return res.status(400).json({
        success: false,
        message: "Fișierul creds.json este invalid sau corupt"
      });
    }
    
    return res.status(200).json({
      success: true,
      message: "Fișierul creds.json a fost încărcat cu succes",
      sessionId
    });
  } catch (err) {
    console.error("Error uploading creds.json:", err);
    return res.status(500).json({
      success: false,
      message: "Eroare la încărcarea fișierului creds.json"
    });
  }
});

// Endpoint pentru încărcarea fișierului de mesaje
app.post('/api/whatsapp/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file || !req.body.type) {
      return res.status(400).json({
        success: false,
        message: "Fișier sau tip lipsă"
      });
    }
    
    const { originalname, path: filePath, size } = req.file;
    
    return res.status(200).json({
      success: true,
      message: "Fișier încărcat cu succes",
      filePath
    });
  } catch (err) {
    console.error("Error uploading file:", err);
    return res.status(500).json({
      success: false,
      message: "Eroare la încărcarea fișierului"
    });
  }
});

// Endpoint pentru pornirea sesiunii WhatsApp
app.post('/api/whatsapp/session/start', async (req, res) => {
  try {
    const { 
      phoneNumber, 
      targets, 
      messagePath, 
      messageText, 
      delay = 10, 
      sessionId 
    } = req.body;
    
    if (!phoneNumber || !targets || (!messagePath && !messageText) || !sessionId) {
      return res.status(400).json({
        success: false,
        message: "Date de sesiune invalide"
      });
    }
    
    // Verificăm dacă sesiunea există deja
    if (activeSessions.has(sessionId)) {
      // Oprim sesiunea existentă pentru a o reporni
      const existingSession = activeSessions.get(sessionId);
      if (existingSession.client) {
        await existingSession.client.destroy();
      }
      if (existingSession.interval) {
        clearInterval(existingSession.interval);
      }
      activeSessions.delete(sessionId);
    }
    
    console.log(`Starting WhatsApp session ${sessionId}`);
    
    // Parsăm țintele
    const targetsList = targets.split(',').map(t => t.trim()).filter(Boolean);
    
    if (targetsList.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Nu s-au găsit ținte valide"
      });
    }
    
    // Obținem mesajele
    let messages = [];
    
    if (messageText) {
      messages = messageText.split('\\n').filter(Boolean);
    } else {
      try {
        const messageContent = fs.readFileSync(messagePath, 'utf-8');
        messages = messageContent.split('\\n').filter(Boolean);
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: "Nu s-a putut citi fișierul de mesaje"
        });
      }
    }
    
    if (messages.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Nu s-au găsit mesaje valide"
      });
    }
    
    // Creăm clientul WhatsApp folosind credențialele din fișierul creds.json
    try {
      const sessionDir = path.join(userSessionsDir, sessionId);
      const credsPath = path.join(sessionDir, 'creds.json');
      
      if (!fs.existsSync(credsPath)) {
        return res.status(400).json({
          success: false,
          message: "Fișierul creds.json nu a fost găsit pentru această sesiune"
        });
      }
      
      // Citim credențialele
      const credentials = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));
      
      // Creăm clientul WhatsApp cu opțiunea puppeteer headless
      const client = new Client({
        puppeteer: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
          ]
        },
        session: credentials
      });
      
      // Inițializăm clientul
      await client.initialize();
      
      console.log(`WhatsApp client initialized for session ${sessionId}`);
      
      // Configurăm un interval pentru trimiterea mesajelor
      let messageIndex = 0;
      let targetIndex = 0;
      let messageCount = 0;
      
      const interval = setInterval(async () => {
        try {
          // Obținem target-ul curent și mesajul
          const target = targetsList[targetIndex];
          const message = messages[messageIndex];
          
          // Formatăm numărul de telefon pentru WhatsApp
          const formattedTarget = target.includes('@c.us') ? target : `${target}@c.us`;
          
          // Trimitem mesajul
          console.log(`Sending message to ${formattedTarget}: ${message}`);
          await client.sendMessage(formattedTarget, message);
          messageCount++;
          
          // Trecem la următorul mesaj și target
          messageIndex = (messageIndex + 1) % messages.length;
          
          // Dacă am parcurs toate mesajele, trecem la următorul target
          if (messageIndex === 0) {
            targetIndex = (targetIndex + 1) % targetsList.length;
          }
        } catch (err) {
          console.error(`Error sending message for session ${sessionId}:`, err);
        }
      }, delay * 1000);
      
      // Stocăm datele sesiunii
      activeSessions.set(sessionId, {
        client,
        interval,
        targets: targetsList,
        messages,
        delay,
        phoneNumber,
        messageCount,
        startTime: new Date()
      });
      
      return res.status(200).json({
        success: true,
        message: "Sesiune WhatsApp pornită cu succes",
        sessionId
      });
    } catch (err) {
      console.error(`Error starting WhatsApp session ${sessionId}:`, err);
      return res.status(500).json({
        success: false,
        message: "Eroare la pornirea sesiunii WhatsApp: " + err.message
      });
    }
  } catch (err) {
    console.error("Error in session start:", err);
    return res.status(500).json({
      success: false,
      message: "Eroare internă la pornirea sesiunii"
    });
  }
});

// Endpoint pentru oprirea sesiunii WhatsApp
app.post('/api/whatsapp/session/stop', async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "ID sesiune lipsă"
      });
    }
    
    const sessionData = activeSessions.get(sessionId);
    
    if (!sessionData) {
      return res.status(404).json({
        success: false,
        message: "Sesiune negăsită"
      });
    }
    
    // Oprim intervalul de trimitere a mesajelor
    if (sessionData.interval) {
      clearInterval(sessionData.interval);
    }
    
    // Închidem clientul WhatsApp
    if (sessionData.client) {
      try {
        await sessionData.client.destroy();
      } catch (err) {
        console.error(`Error destroying WhatsApp client for session ${sessionId}:`, err);
      }
    }
    
    // Ștergem sesiunea din memorie
    activeSessions.delete(sessionId);
    
    return res.status(200).json({
      success: true,
      message: "Sesiune WhatsApp oprită cu succes"
    });
  } catch (err) {
    console.error("Error stopping session:", err);
    return res.status(500).json({
      success: false,
      message: "Eroare la oprirea sesiunii"
    });
  }
});

// Endpoint pentru obținerea stării sesiunii
app.get('/api/whatsapp/session/status', (req, res) => {
  try {
    const { sessionId } = req.query;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "ID sesiune lipsă"
      });
    }
    
    const sessionData = activeSessions.get(sessionId);
    
    if (!sessionData) {
      return res.status(404).json({
        success: false,
        message: "Sesiune negăsită"
      });
    }
    
    return res.status(200).json({
      success: true,
      isActive: true,
      messageCount: sessionData.messageCount,
      startTime: sessionData.startTime,
      connectionMethod: 'creds'
    });
  } catch (err) {
    console.error("Error getting session status:", err);
    return res.status(500).json({
      success: false,
      message: "Eroare la obținerea stării sesiunii"
    });
  }
});

// Pornirea serverului
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});