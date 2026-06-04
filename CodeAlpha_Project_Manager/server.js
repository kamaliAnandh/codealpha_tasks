const express = require('express');
const app = express();
const path = require('path');
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);
const fs = require('fs');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DB_FILE = path.join(__dirname, 'database.json');
let loggedInUser = null;

// Core Storage Engine: Reads local JSON state from disk
function loadDatabase() {
    try {
        if (!fs.existsSync(DB_FILE)) {
            const defaultData = {
                globalTeam: [{ username: "system", email: "system@alphamanager.io" }],
                projectBoards: [{
                    id: "board_1",
                    name: "E-Commerce Launch Suite",
                    description: "Task tracking matrix for tracking storefront application modules.",
                    lists: [
                        { 
                            name: "To Do", 
                            tasks: [
                                {
                                    id: "task_sample",
                                    title: "Setup Stripe Webhooks",
                                    desc: "Configure secure handlers to track payment confirmation events.",
                                    assignedTo: "system",
                                    comments: [{ user: "system", text: "Task created automatically.", timestamp: "Just now" }]
                                }
                            ] 
                        },
                        { name: "In Progress", tasks: [] },
                        { name: "Done", tasks: [] }
                    ]
                }]
            };
            fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 4));
            return defaultData;
        }
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(fileContent);
    } catch (error) {
        console.error("Error reading storage file:", error);
        return { globalTeam: [], projectBoards: [] };
    }
}

// Core Storage Engine: Saves active application state to disk
function saveDatabase(data) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 4));
    } catch (error) {
        console.error("Error writing to storage file:", error);
    }
}

function isAuthenticated(req, res, next) {
    if (!loggedInUser) return res.redirect('/');
    next();
}

app.get('/', (req, res) => res.render('login'));

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    if (email && password) {
        const usernameHandle = email.split('@')[0];
        loggedInUser = { username: usernameHandle, email: email };
        
        let db = loadDatabase();
        if (!db.globalTeam.some(m => m.username === usernameHandle)) {
            db.globalTeam.push({ username: usernameHandle, email: email });
            saveDatabase(db);
        }
        
        return res.redirect('/dashboard');
    }
    res.redirect('/');
});

app.get('/logout', (req, res) => {
    loggedInUser = null; 
    res.redirect('/');
});

app.get('/dashboard', isAuthenticated, (req, res) => {
    let db = loadDatabase();
    res.render('dashboard', { 
        user: loggedInUser, 
        boards: db.projectBoards,
        team: db.globalTeam 
    });
});

app.post('/create-board', isAuthenticated, (req, res) => {
    const { boardName, boardDesc } = req.body;
    if (boardName && boardName.trim() !== "") {
        let db = loadDatabase();
        db.projectBoards.push({
            id: 'board_' + Date.now(),
            name: boardName,
            description: boardDesc || "No overview provided.",
            lists: [
                { name: "To Do", tasks: [] },
                { name: "In Progress", tasks: [] },
                { name: "Done", tasks: [] }
            ]
        });
        saveDatabase(db);
    }
    res.redirect('/dashboard');
});

// REMOVAL PIPELINE: Drop target workspace boards from local storage
app.post('/delete-board/:boardId', isAuthenticated, (req, res) => {
    let db = loadDatabase();
    db.projectBoards = db.projectBoards.filter(b => b.id !== req.params.boardId);
    saveDatabase(db);
    res.redirect('/dashboard');
});

app.post('/invite-member', isAuthenticated, (req, res) => {
    const { memberEmail } = req.body;
    if (memberEmail && memberEmail.includes('@')) {
        const memberHandle = memberEmail.split('@')[0];
        let db = loadDatabase();
        if (!db.globalTeam.some(m => m.username === memberHandle)) {
            db.globalTeam.push({ username: memberHandle, email: memberEmail });
            saveDatabase(db);
        }
    }
    res.redirect('/dashboard');
});

app.get('/board/:boardId', isAuthenticated, (req, res) => {
    let db = loadDatabase();
    const targetBoard = db.projectBoards.find(b => b.id === req.params.boardId);
    if (!targetBoard) return res.status(404).send("Board not found.");
    
    res.render('board', { 
        user: loggedInUser, 
        board: targetBoard,
        team: db.globalTeam 
    });
});

app.post('/board/:boardId/create-task', isAuthenticated, (req, res) => {
    let db = loadDatabase();
    const board = db.projectBoards.find(b => b.id === req.params.boardId);
    const { taskTitle, taskDesc, targetList, assignTo } = req.body;
    
    if (board) {
        const list = board.lists.find(l => l.name === targetList);
        if (list) {
            const newTask = {
                id: 'task_' + Date.now(),
                title: taskTitle,
                desc: taskDesc || "",
                assignedTo: assignTo || "Unassigned",
                comments: []
            };
            list.tasks.push(newTask);
            saveDatabase(db);
            io.to(req.params.boardId).emit('taskCreated', { listName: targetList, task: newTask });
        }
    }
    res.redirect(`/board/${req.params.boardId}`);
});

app.post('/board/:boardId/task/:taskId/comment', isAuthenticated, (req, res) => {
    let db = loadDatabase();
    const board = db.projectBoards.find(b => b.id === req.params.boardId);
    const { commentText } = req.body;
    
    if (board && commentText && commentText.trim() !== "") {
        for (let list of board.lists) {
            const task = list.tasks.find(t => t.id === req.params.taskId);
            if (task) {
                const newComment = {
                    user: loggedInUser.username,
                    text: commentText,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                };
                task.comments.push(newComment);
                saveDatabase(db);
                io.to(req.params.boardId).emit('commentAdded', { taskId: task.id, comment: newComment });
                return res.json({ success: true, comment: newComment });
            }
        }
    }
    res.status(400).json({ success: false });
});

io.on('connection', (socket) => {
    socket.on('joinBoard', (boardId) => socket.join(boardId));
});

server.listen(3000, () => console.log("Server active on http://localhost:3000"));