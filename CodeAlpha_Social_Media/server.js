const express = require('express');
const app = express();
const path = require('path');
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // Parses incoming AJAX/Fetch payload JSON streams
app.use(express.static(path.join(__dirname, 'public')));

// Global tracking matrix for active user configurations
let loggedInUser = {
    username: 'kamali',
    email: 'mayugaa609@gmail.com',
    followingCount: 1,
    followersCount: 1
};

// Global mapping framework tracking who follows whom in our environment
// Key: Username, Value: Set of usernames they are currently following
let globalFollowsMap = {
    'kamali': new Set(['admin']),
    'admin': new Set(['kamali']) 
};

// Mock timeline databases with your updated social media greeting!
let globallySharedPosts = [
    {
        id: "post1",
        author: "Admin",
        role: "FullStack Dev",
        content: "Hey everyone! Welcome to SocialAlpha. Share your daily thoughts, showcase your latest project milestones, and connect with creators across the globe! 🌍✨",
        likes: 145,
        comments: [
            { author: "CodeAlpha", text: "Wow, this looks like a production platform!" },
            { author: "kamali", text: "Amazing layout dashboard view." },
            { author: "kamali", text: "hello" },
            { author: "kamali", text: "hi" }
        ]
    }
];

let notificationCenterLogs = [
    { message: "@Admin liked your timeline update", timestamp: "2h ago" }
];

let directMessageLogs = [
    { author: "Admin", message: "Hey there! Welcome to SocialAlpha. Let us know if you need any assistance testing your Task 2 layout components.", timestamp: "3h ago" }
];

// --- APP ROUTING SYSTEM ---

// 1. Root Pathway -> Login Screen
app.get('/', (req, res) => {
    res.render('login');
});

// 2. Form processing pipeline
app.post('/login', (req, res) => {
    const typedEmail = req.body.email;
    let extractedUsername = 'kamali';
    
    if (typedEmail && typedEmail.includes('@')) {
        extractedUsername = typedEmail.split('@')[0].toLowerCase(); // Normalize to lowercase
    }

    // Initialize map tracks for this user if they don't exist yet
    if (!globalFollowsMap[extractedUsername]) {
        globalFollowsMap[extractedUsername] = new Set();
    }
    if (!globalFollowsMap['admin']) {
        globalFollowsMap['admin'] = new Set();
    }

    // AUTOMATIC WELCOME LINK: Auto-follow each other so profile metrics never look empty (0)
    globalFollowsMap[extractedUsername].add('admin'); // Current user follows admin
    globalFollowsMap['admin'].add(extractedUsername); // Admin follows current user

    // Calculate dynamic follow metrics accurately
    let followersCount = 0;
    for (let key in globalFollowsMap) {
        if (globalFollowsMap[key].has(extractedUsername)) {
            followersCount++;
        }
    }

    loggedInUser = {
        username: extractedUsername, 
        email: typedEmail,
        followingCount: globalFollowsMap[extractedUsername].size,
        followersCount: followersCount
    };

    res.redirect('/index');
});

// 3. Main Feed Route — Accepts both /index and /home
app.get(['/index', '/home'], (req, res) => {
    // Keep dynamic tracker active and accurate in live memory sync
    const currentUsername = loggedInUser.username.toLowerCase();
    
    if (globalFollowsMap[currentUsername]) {
        loggedInUser.followingCount = globalFollowsMap[currentUsername].size;
    }
    
    let followersCount = 0;
    for (let key in globalFollowsMap) {
        if (globalFollowsMap[key].has(currentUsername)) followersCount++;
    }
    loggedInUser.followersCount = followersCount;

    res.render('index', { 
        user: loggedInUser,
        posts: globallySharedPosts,
        notifications: notificationCenterLogs,
        messages: directMessageLogs
    });
});

// 4. Interactive Post Creator Route
app.post('/create-post', (req, res) => {
    const postContent = req.body.content;
    if (postContent && postContent.trim() !== "") {
        globallySharedPosts.unshift({
            id: 'post_' + Date.now(),
            author: loggedInUser.username,
            role: "Developer",
            content: postContent,
            likes: 0,
            comments: []
        });
    }
    res.redirect('/index');
});

// 5. Dynamic Profile Routing View Engine
app.get('/profile/:username', (req, res) => {
    const targetUsername = req.params.username.toLowerCase();
    const currentLoggedUser = loggedInUser.username.toLowerCase();
    
    const userFilteredPosts = globallySharedPosts.filter(
        p => p.author.toLowerCase() === targetUsername
    );

    // Initialize track records safely if not existing in runtime memory
    if (!globalFollowsMap[targetUsername]) globalFollowsMap[targetUsername] = new Set();
    if (!globalFollowsMap[currentLoggedUser]) globalFollowsMap[currentLoggedUser] = new Set();

    // Check if the currently logged in session dashboard profile is already following this view space target
    const isViewerFollowingTarget = globalFollowsMap[currentLoggedUser].has(targetUsername);

    // Calculate dynamic total metrics
    let totalTargetFollowers = 0;
    for (let key in globalFollowsMap) {
        if (globalFollowsMap[key].has(targetUsername)) totalTargetFollowers++;
    }

    res.render('profile', {
        user: loggedInUser,
        profileUser: {
            username: req.params.username,
            followingCount: globalFollowsMap[targetUsername].size,
            followersCount: totalTargetFollowers,
            isFollowing: isViewerFollowingTarget
        },
        posts: userFilteredPosts,
        notifications: notificationCenterLogs,
        messages: directMessageLogs
    });
});

// 6. Like Interactivity Counter Link
app.post('/like-post', (req, res) => {
    const postId = req.body.postId;
    const post = globallySharedPosts.find(p => p.id === postId);
    if (post) {
        post.likes += 1;
    }
    const referer = req.headers.referer || '/index';
    res.redirect(referer);
});

// 7. Post Reply Management Pipeline
app.post('/comment-post', (req, res) => {
    const { postId, commentText } = req.body;
    const post = globallySharedPosts.find(p => p.id === postId);
    if (post && commentText && commentText.trim() !== "") {
        post.comments.push({
            author: loggedInUser.username,
            text: commentText
        });
    }
    const referer = req.headers.referer || '/index';
    res.redirect(referer);
});

// --- NEW FEATURE WORKFLOW API ENDPOINTS ---

// FEATURE 1: REST API Endpoint tracking Follow/Unfollow Requests
app.post('/api/follow-toggle', (req, res) => {
    const targetUser = req.body.targetUser.toLowerCase();
    const currentUser = loggedInUser.username.toLowerCase();

    if (!targetUser || targetUser === currentUser) {
        return res.status(400).json({ success: false, message: "Invalid profile targets mapping." });
    }

    if (!globalFollowsMap[currentUser]) globalFollowsMap[currentUser] = new Set();
    if (!globalFollowsMap[targetUser]) globalFollowsMap[targetUser] = new Set();

    let actionTaken = "";
    if (globalFollowsMap[currentUser].has(targetUser)) {
        // Core Unfollow Mechanism: delete relationship from system engine
        globalFollowsMap[currentUser].delete(targetUser);
        actionTaken = "unfollowed";
    } else {
        // Core Follow Mechanism: add relationship into system engine
        globalFollowsMap[currentUser].add(targetUser);
        actionTaken = "followed";

        // Push standard automatic layout response alert log to target notice feeds
        notificationCenterLogs.unshift({
            message: `@${loggedInUser.username} started following your profile updates`,
            timestamp: "Just now"
        });
    }

    // Re-tally metrics dynamically
    let updatedFollowerCount = 0;
    for (let key in globalFollowsMap) {
        if (globalFollowsMap[key].has(targetUser)) updatedFollowerCount++;
    }

    // Keep loggedInUser object perfectly synced up if editing self properties
    loggedInUser.followingCount = globalFollowsMap[currentUser].size;

    res.json({ 
        success: true, 
        action: actionTaken, 
        followersCount: updatedFollowerCount, 
        followingCount: globalFollowsMap[targetUser].size 
    });
});

// FEATURE 2: REST API Endpoint tracking Inline Post Text Content Mutation Upgrades
app.post('/api/edit-post', (req, res) => {
    const { postId, newContent } = req.body;
    const post = globallySharedPosts.find(p => p.id === postId);
    
    if (post && post.author === loggedInUser.username && newContent && newContent.trim() !== "") {
        post.content = newContent;
        io.emit('post_edited_broadcast', { id: postId, content: newContent });
        return res.json({ success: true, content: newContent });
    }
    res.status(400).json({ success: false });
});

// FEATURE 2: REST API Endpoint tracking Live Timeline Post Removals
app.post('/api/delete-post', (req, res) => {
    const { postId } = req.body;
    const postIndex = globallySharedPosts.findIndex(p => p.id === postId);

    if (postIndex !== -1 && globallySharedPosts[postIndex].author === loggedInUser.username) {
        globallySharedPosts.splice(postIndex, 1);
        io.emit('post_deleted_broadcast', { id: postId });
        return res.json({ success: true });
    }
    res.status(400).json({ success: false });
});

// --- SOCKET.IO REAL-TIME INTERACTION STREAM ENGINE ---
io.on('connection', (socket) => {
    // FEATURE 3: Broadcast dynamic inbound messages across targeted chat components real-time
    socket.on('send_direct_message', (data) => {
        const newDmLog = {
            author: loggedInUser.username,
            message: data.message,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        directMessageLogs.push(newDmLog);
        
        // Broadcast downstream message packet link to all connected interface layouts instantly
        io.emit('receive_direct_message_broadcast', newDmLog);
    });
});

// Change server mapping interface listener to start up securely under unified HTTP layers
server.listen(3000, () => {
    console.log("SocialAlpha upgrade engine running beautifully on http://localhost:3000");
});