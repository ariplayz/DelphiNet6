import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 80;

// Path to data files
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'data.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const STAFF_FILE = path.join(DATA_DIR, 'staff.json');
const CLASSES_FILE = path.join(DATA_DIR, 'classes.json');
const ROLLCALLS_FILE = path.join(DATA_DIR, 'rollcalls.json');
const ABSENCES_FILE = path.join(DATA_DIR, 'absences.json');
const WEB_ROOT = process.env.WEB_ROOT || path.join(__dirname, '../dist');

app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Ensure the directory exists
const ensureDirectoryExistence = (filePath) => {
    const dirname = path.dirname(filePath);
    if (fs.existsSync(dirname)) {
        return true;
    }
    try {
        fs.mkdirSync(dirname, { recursive: true });
        return true;
    } catch (e) {
        console.error('Error creating directory:', e);
        return false;
    }
};

ensureDirectoryExistence(DATA_FILE);

// Initialize files if they don't exist
const initFile = (file, content = []) => {
    if (!fs.existsSync(file)) {
        fs.writeFileSync(file, JSON.stringify(content, null, 2));
    }
};

initFile(DATA_FILE);
initFile(USERS_FILE, [{ username: 'admin', password: 'Password01', role: 'admin' }]);
initFile(STAFF_FILE);
initFile(CLASSES_FILE);
initFile(ROLLCALLS_FILE);
initFile(ABSENCES_FILE);

// Helper to read/write JSON files
const readJSON = (file) => {
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) {
        return [];
    }
};

const writeJSON = (file, data) => {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
};

// Session middleware
const auth = (req, res, next) => {
    const session = req.cookies.session;
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    
    const users = readJSON(USERS_FILE);
    const user = users.find(u => u.username === session);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    
    req.user = user;
    next();
};

// Authentication endpoint
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    const users = readJSON(USERS_FILE);
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
        res.cookie('session', user.username, { maxAge: 7 * 24 * 60 * 60 * 1000, httpOnly: true });
        res.json({ username: user.username, role: user.role, isAbsenceChecker: user.isAbsenceChecker });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

app.post('/api/logout', (req, res) => {
    res.clearCookie('session');
    res.status(204).send();
});

app.get('/api/me', (req, res) => {
    const session = req.cookies.session;
    if (!session) return res.status(401).json({ error: 'Not logged in' });
    
    const users = readJSON(USERS_FILE);
    const user = users.find(u => u.username === session);
    if (user) {
        res.json({ username: user.username, role: user.role, isAbsenceChecker: user.isAbsenceChecker });
    } else {
        res.status(401).json({ error: 'Invalid session' });
    }
});

// User management (Admin only)
app.get('/api/users', auth, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    res.json(readJSON(USERS_FILE).map(u => ({ username: u.username, role: u.role, isAbsenceChecker: u.isAbsenceChecker })));
});

app.post('/api/users', auth, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const newUser = req.body;
    const users = readJSON(USERS_FILE);
    if (users.find(u => u.username === newUser.username)) {
        return res.status(400).json({ error: 'User already exists' });
    }
    users.push(newUser);
    writeJSON(USERS_FILE, users);
    res.status(201).json({ username: newUser.username, role: newUser.role, isAbsenceChecker: newUser.isAbsenceChecker });
});

app.delete('/api/users/:username', auth, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const { username } = req.params;
    if (username === 'admin') return res.status(400).json({ error: 'Cannot delete default admin' });
    let users = readJSON(USERS_FILE);
    users = users.filter(u => u.username !== username);
    writeJSON(USERS_FILE, users);
    res.status(204).send();
});

// Class management
app.get('/api/classes', auth, (req, res) => {
    res.json(readJSON(CLASSES_FILE));
});

app.post('/api/classes', auth, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const newClass = { id: Date.now().toString(), ...req.body };
    const classes = readJSON(CLASSES_FILE);
    classes.push(newClass);
    writeJSON(CLASSES_FILE, classes);
    res.status(201).json(newClass);
});

app.put('/api/classes/:id', auth, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const { id } = req.params;
    let classes = readJSON(CLASSES_FILE);
    const index = classes.findIndex(c => c.id === id);
    if (index === -1) return res.status(404).send();
    classes[index] = { ...classes[index], ...req.body };
    writeJSON(CLASSES_FILE, classes);
    res.json(classes[index]);
});

app.delete('/api/classes/:id', auth, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const { id } = req.params;
    let classes = readJSON(CLASSES_FILE);
    classes = classes.filter(c => c.id !== id);
    writeJSON(CLASSES_FILE, classes);
    res.status(204).send();
});

// Roll Call
app.get('/api/rollcalls', auth, (req, res) => {
    res.json(readJSON(ROLLCALLS_FILE));
});

app.post('/api/rollcalls', auth, (req, res) => {
    // Should be supervisor or admin
    const classes = readJSON(CLASSES_FILE);
    const cls = classes.find(c => c.id === req.body.classId);
    if (!cls) return res.status(404).json({ error: 'Class not found' });
    if (req.user.role !== 'admin' && cls.supervisor !== req.user.username) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    
    const rollcalls = readJSON(ROLLCALLS_FILE);
    const newRollcall = { id: Date.now().toString(), timestamp: new Date().toISOString(), ...req.body };
    rollcalls.push(newRollcall);
    writeJSON(ROLLCALLS_FILE, rollcalls);
    
    // Automatic points for attendance are not directly stored as point slips yet, 
    // but the points are mentioned: Here 0, Late 2, Absent 4.
    // The issue says "There needs to be a list of all the absences each week with forms next to them"
    // So we store the rollcall and then absences can be derived or explicitly stored.
    
    res.status(201).json(newRollcall);
});

app.put('/api/rollcalls/:id', auth, (req, res) => {
    const { id } = req.params;
    let rollcalls = readJSON(ROLLCALLS_FILE);
    const index = rollcalls.findIndex(r => r.id === id);
    if (index === -1) return res.status(404).send();
    
    const classes = readJSON(CLASSES_FILE);
    const cls = classes.find(c => c.id === rollcalls[index].classId);
    if (req.user.role !== 'admin' && cls.supervisor !== req.user.username) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    rollcalls[index] = { ...rollcalls[index], ...req.body };
    writeJSON(ROLLCALLS_FILE, rollcalls);
    res.json(rollcalls[index]);
});

// Absences
app.get('/api/absences', auth, (req, res) => {
    res.json(readJSON(ABSENCES_FILE));
});

app.post('/api/absences', auth, (req, res) => {
    if (req.user.role !== 'admin' && !req.user.isAbsenceChecker) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    const absences = readJSON(ABSENCES_FILE);
    const newAbsence = { id: Date.now().toString(), ...req.body };
    absences.push(newAbsence);
    writeJSON(ABSENCES_FILE, absences);
    res.status(201).json(newAbsence);
});

app.put('/api/absences/:id', auth, (req, res) => {
    if (req.user.role !== 'admin' && !req.user.isAbsenceChecker) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    const { id } = req.params;
    let absences = readJSON(ABSENCES_FILE);
    const index = absences.findIndex(a => a.id === id);
    if (index === -1) return res.status(404).send();
    absences[index] = { ...absences[index], ...req.body };
    writeJSON(ABSENCES_FILE, absences);
    res.json(absences[index]);
});

// Points Slips (Existing)
app.get('/api/slips', auth, (req, res) => {
    res.json(readJSON(DATA_FILE));
});

app.post('/api/slips', auth, (req, res) => {
    const newSlip = req.body;
    // Students can only enter points for themselves
    if (req.user.role === 'student' && newSlip.name !== req.user.username) {
        return res.status(403).json({ error: 'Can only enter points for yourself' });
    }
    // Staff cannot enter points
    if (req.user.role === 'staff') {
        return res.status(403).json({ error: 'Staff cannot enter points' });
    }

    const slips = readJSON(DATA_FILE);
    slips.push(newSlip);
    writeJSON(DATA_FILE, slips);
    res.status(201).json(newSlip);
});

// Serve static files from webroot if it exists
if (fs.existsSync(WEB_ROOT)) {
    app.use(express.static(WEB_ROOT));
}

// SPA routing - redirect all other requests to index.html if it exists
app.get('*', (req, res) => {
    const indexPath = path.join(WEB_ROOT, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send('Not found');
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Saving data to: ${DATA_FILE}`);
});
