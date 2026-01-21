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
const PROGRAM_TEMPLATES_FILE = path.join(DATA_DIR, 'program_templates.json');
const STUDENT_PROGRAMS_FILE = path.join(DATA_DIR, 'student_programs.json');
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
initFile(USERS_FILE, [{ username: 'admin', password: 'admin', roles: ['admin'] }]);
initFile(STAFF_FILE);
initFile(CLASSES_FILE);
initFile(ROLLCALLS_FILE);
initFile(ABSENCES_FILE);
initFile(PROGRAM_TEMPLATES_FILE);
initFile(STUDENT_PROGRAMS_FILE);

// Migration for existing users
const usersForMigration = readJSON(USERS_FILE);
let usersChanged = false;
const migratedUsers = usersForMigration.map(u => {
    if (u.role && !u.roles) {
        u.roles = [u.role];
        if (u.isAbsenceChecker) u.roles.push('absence-checker');
        delete u.role;
        delete u.isAbsenceChecker;
        usersChanged = true;
    }
    return u;
});
if (usersChanged) writeJSON(USERS_FILE, migratedUsers);

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
        res.json({ username: user.username, roles: user.roles });
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
        res.json({ username: user.username, roles: user.roles });
    } else {
        res.status(401).json({ error: 'Invalid session' });
    }
});

// User management (Admin only)
app.get('/api/users', auth, (req, res) => {
    if (!req.user.roles.includes('admin') && !req.user.roles.includes('courseroom-supervisor')) return res.status(403).json({ error: 'Forbidden' });
    res.json(readJSON(USERS_FILE).map(u => ({ username: u.username, roles: u.roles })));
});

app.post('/api/users', auth, (req, res) => {
    if (!req.user.roles.includes('admin')) return res.status(403).json({ error: 'Forbidden' });
    const newUser = req.body;
    const users = readJSON(USERS_FILE);
    if (users.find(u => u.username === newUser.username)) {
        return res.status(400).json({ error: 'User already exists' });
    }
    users.push(newUser);
    writeJSON(USERS_FILE, users);
    res.status(201).json({ username: newUser.username, roles: newUser.roles });
});

app.put('/api/users/:username', auth, (req, res) => {
    if (!req.user.roles.includes('admin')) return res.status(403).json({ error: 'Forbidden' });
    const { username } = req.params;
    let users = readJSON(USERS_FILE);
    const index = users.findIndex(u => u.username === username);
    if (index === -1) return res.status(404).send();
    
    // Update fields
    const updatedUser = { ...users[index], ...req.body };
    // Prevent changing username for now as it's the key
    updatedUser.username = users[index].username;
    
    users[index] = updatedUser;
    writeJSON(USERS_FILE, users);
    res.json({ username: updatedUser.username, roles: updatedUser.roles });
});

app.delete('/api/users/:username', auth, (req, res) => {
    if (!req.user.roles.includes('admin')) return res.status(403).json({ error: 'Forbidden' });
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
    if (!req.user.roles.includes('admin')) return res.status(403).json({ error: 'Forbidden' });
    const newClass = { id: Date.now().toString(), ...req.body };
    const classes = readJSON(CLASSES_FILE);
    classes.push(newClass);
    writeJSON(CLASSES_FILE, classes);
    res.status(201).json(newClass);
});

app.put('/api/classes/:id', auth, (req, res) => {
    if (!req.user.roles.includes('admin')) return res.status(403).json({ error: 'Forbidden' });
    const { id } = req.params;
    let classes = readJSON(CLASSES_FILE);
    const index = classes.findIndex(c => c.id === id);
    if (index === -1) return res.status(404).send();
    classes[index] = { ...classes[index], ...req.body };
    writeJSON(CLASSES_FILE, classes);
    res.json(classes[index]);
});

app.delete('/api/classes/:id', auth, (req, res) => {
    if (!req.user.roles.includes('admin')) return res.status(403).json({ error: 'Forbidden' });
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
    if (!req.user.roles.includes('admin') && cls.supervisor !== req.user.username) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    
    const rollcalls = readJSON(ROLLCALLS_FILE);
    const newRollcall = { id: Date.now().toString(), timestamp: new Date().toISOString(), ...req.body };
    rollcalls.push(newRollcall);
    writeJSON(ROLLCALLS_FILE, rollcalls);
    
    res.status(201).json(newRollcall);
});

app.put('/api/rollcalls/:id', auth, (req, res) => {
    const { id } = req.params;
    let rollcalls = readJSON(ROLLCALLS_FILE);
    const index = rollcalls.findIndex(r => r.id === id);
    if (index === -1) return res.status(404).send();
    
    const classes = readJSON(CLASSES_FILE);
    const cls = classes.find(c => c.id === rollcalls[index].classId);
    if (!req.user.roles.includes('admin') && cls.supervisor !== req.user.username) {
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
    if (!req.user.roles.includes('admin') && !req.user.roles.includes('absence-checker')) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    const absences = readJSON(ABSENCES_FILE);
    const newAbsence = { id: Date.now().toString(), ...req.body };
    absences.push(newAbsence);
    writeJSON(ABSENCES_FILE, absences);
    res.status(201).json(newAbsence);
});

app.put('/api/absences/:id', auth, (req, res) => {
    if (!req.user.roles.includes('admin') && !req.user.roles.includes('absence-checker')) {
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

// Program Templates
app.get('/api/program-templates', auth, (req, res) => {
    res.json(readJSON(PROGRAM_TEMPLATES_FILE));
});

app.post('/api/program-templates', auth, (req, res) => {
    if (!req.user.roles.includes('admin')) return res.status(403).json({ error: 'Forbidden' });
    const templates = readJSON(PROGRAM_TEMPLATES_FILE);
    const newTemplate = { id: Date.now().toString(), ...req.body };
    templates.push(newTemplate);
    writeJSON(PROGRAM_TEMPLATES_FILE, templates);
    res.status(201).json(newTemplate);
});

app.put('/api/program-templates/:id', auth, (req, res) => {
    if (!req.user.roles.includes('admin')) return res.status(403).json({ error: 'Forbidden' });
    const { id } = req.params;
    let templates = readJSON(PROGRAM_TEMPLATES_FILE);
    const index = templates.findIndex(t => t.id === id);
    if (index === -1) return res.status(404).send();
    templates[index] = { ...templates[index], ...req.body };
    writeJSON(PROGRAM_TEMPLATES_FILE, templates);
    res.json(templates[index]);
});

app.delete('/api/program-templates/:id', auth, (req, res) => {
    if (!req.user.roles.includes('admin')) return res.status(403).json({ error: 'Forbidden' });
    const { id } = req.params;
    let templates = readJSON(PROGRAM_TEMPLATES_FILE);
    templates = templates.filter(t => t.id !== id);
    writeJSON(PROGRAM_TEMPLATES_FILE, templates);
    res.status(204).send();
});

// Student Programs
app.get('/api/student-programs', auth, (req, res) => {
    const programs = readJSON(STUDENT_PROGRAMS_FILE);
    if (req.user.roles.includes('student')) {
        return res.json(programs.filter(p => p.studentUsername === req.user.username));
    }
    res.json(programs);
});

app.post('/api/student-programs', auth, (req, res) => {
    if (!req.user.roles.includes('admin') && !req.user.roles.includes('courseroom-supervisor')) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    const programs = readJSON(STUDENT_PROGRAMS_FILE);
    const newProgram = { id: Date.now().toString(), ...req.body };
    programs.push(newProgram);
    writeJSON(STUDENT_PROGRAMS_FILE, programs);
    res.status(201).json(newProgram);
});

app.put('/api/student-programs/:id', auth, (req, res) => {
    const { id } = req.params;
    let programs = readJSON(STUDENT_PROGRAMS_FILE);
    const index = programs.findIndex(p => p.id === id);
    if (index === -1) return res.status(404).send();

    const program = programs[index];
    if (req.user.roles.includes('student') && program.studentUsername !== req.user.username) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    if (!req.user.roles.includes('admin') && !req.user.roles.includes('courseroom-supervisor') && !req.user.roles.includes('student')) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    // Students can only update status/startDate of courses
    if (req.user.roles.includes('student')) {
        // Simple merge for now, frontend should send correct subset
        programs[index] = { ...programs[index], courses: req.body.courses };
    } else {
        programs[index] = { ...programs[index], ...req.body };
    }

    writeJSON(STUDENT_PROGRAMS_FILE, programs);
    res.json(programs[index]);
});

app.delete('/api/student-programs/:id', auth, (req, res) => {
    if (!req.user.roles.includes('admin') && !req.user.roles.includes('courseroom-supervisor')) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    const { id } = req.params;
    let programs = readJSON(STUDENT_PROGRAMS_FILE);
    programs = programs.filter(p => p.id !== id);
    writeJSON(STUDENT_PROGRAMS_FILE, programs);
    res.status(204).send();
});

app.get('/api/dashboard-stats', auth, (req, res) => {
    const slips = readJSON(DATA_FILE);
    const rollcalls = readJSON(ROLLCALLS_FILE);
    const programs = readJSON(STUDENT_PROGRAMS_FILE);
    const absences = readJSON(ABSENCES_FILE);
    const classes = readJSON(CLASSES_FILE);

    if (req.user.roles.includes('student')) {
        const userSlips = slips.filter(s => s.name === req.user.username);
        const userPrograms = programs.filter(p => p.studentUsername === req.user.username);
        const userAbsences = absences.filter(a => a.studentName === req.user.username);
        const userClasses = classes.filter(c => c.students && c.students.includes(req.user.username));

        res.json({
            slips: userSlips,
            programs: userPrograms,
            absences: userAbsences,
            classes: userClasses
        });
    } else {
        const supervisorClasses = classes.filter(c => c.supervisor === req.user.username);
        let supervisorStudents = [...new Set(supervisorClasses.flatMap(c => c.students || []))];

        // If they are a courseroom supervisor, they also supervise students they've assigned programs to
        if (req.user.roles.includes('courseroom-supervisor') || req.user.roles.includes('admin')) {
            const studentsWithPrograms = programs.map(p => p.studentUsername);
            supervisorStudents = [...new Set([...supervisorStudents, ...studentsWithPrograms])];
        }

        const studentStats = supervisorStudents.map(student => {
            const sSlips = slips.filter(s => s.name === student);
            const sPrograms = programs.filter(p => p.studentUsername === student);
            const sAbsences = absences.filter(a => a.studentName === student);
            return {
                username: student,
                totalPoints: sSlips.reduce((sum, s) => sum + s.points, 0),
                programsCount: sPrograms.length,
                absencesCount: sAbsences.length
            };
        });

        res.json({
            studentStats,
            classes: supervisorClasses,
            rollcalls: rollcalls.filter(r => {
                const cls = classes.find(c => c.id === r.classId);
                return cls && cls.supervisor === req.user.username;
            })
        });
    }
});

app.post('/api/slips', auth, (req, res) => {
    const newSlip = req.body;
    // Students can only enter points for themselves
    if (req.user.roles.includes('student') && newSlip.name !== req.user.username) {
        return res.status(403).json({ error: 'Can only enter points for yourself' });
    }
    // Staff cannot enter points
    if (req.user.roles.includes('staff')) {
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

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Saving data to: ${DATA_FILE}`);
});
