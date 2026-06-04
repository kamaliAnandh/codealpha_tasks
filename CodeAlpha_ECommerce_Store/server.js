const express = require('express');
const session = require('express-session');
const app = express();

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: 'codealpha-final-2026',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// --- 16 Products Database ---
const products = [
    { id: 1, name: "Gaming Mouse", price: 50, category: "electronics", desc: "High-precision RGB optical sensor for pro gamers.", img: "https://static.vecteezy.com/system/resources/thumbnails/030/908/729/small/digital-precision-vision-of-isolated-computer-mouse-generative-ai-photo.jpg" },
    { id: 2, name: "Mechanical Keyboard", price: 100, category: "electronics", desc: "Tactile blue switches with customizable RGB lighting.", img: "https://www.shutterstock.com/image-vector/computer-keyboard-black-color-vector-260nw-2504979535.jpg" },
    { id: 3, name: "Pro Headphones", price: 150, category: "electronics", desc: "Studio-quality sound with active noise cancellation.", img: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80" },
    { id: 4, name: "Smart Watch", price: 200, category: "electronics", desc: "Health tracking with a stunning OLED display.", img: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80" },
    { id: 5, name: "Remote Control Car", price: 45, category: "toys", desc: "High-speed drift racer with 2.4GHz remote control.", img: "https://images.unsplash.com/photo-1594787318286-3d835c1d207f?w=500&q=80" },
    { id: 6, name: "Building Blocks", price: 35, category: "toys", desc: "1000+ pieces to build your own architectural wonders.", img: "https://images.unsplash.com/photo-1585366119957-e9730b6d0f60?w=500&q=80" },
    { id: 7, name: "Teddy Bear", price: 20, category: "toys", desc: "Soft, huggable plush companion for all ages.", img: "https://images.unsplash.com/photo-1559454403-b8fb88521f11?w=500&q=80" },
    { id: 8, name: "Drone", price: 80, category: "toys", desc: "Stable flight with 720p camera for beginners.", img: "https://images.unsplash.com/photo-1507582020474-9a35b7d455d9?w=500&q=80" },
    { id: 9, name: "Table Lamp", price: 55, category: "home", desc: "Minimalist LED lamp with eye-protection technology.", img: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=500&q=80" },
    { id: 10, name: "Wall Clock", price: 25, category: "home", desc: "Silent wooden wall clock for modern homes.", img: "https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=500&q=80" },
    { id: 11, name: "Ceramic Vase", price: 40, category: "home", desc: "Elegant hand-crafted vase for floral displays.", img: "https://images.unsplash.com/photo-1581783898377-1c85bf937427?w=500&q=80" },
    { id: 12, name: "Plant Pot", price: 15, category: "home", desc: "Sleek, self-watering pot for indoor succulents.", img: "https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=500&q=80" },
    { id: 13, name: "Leather Jacket", price: 120, category: "fashion", desc: "Classic genuine leather jacket.", img: "https://images.unsplash.com/photo-1551028150-64b9f398f678?w=500&q=80" },
    { id: 14, name: "Sneakers", price: 75, category: "fashion", desc: "Breathable, lightweight sneakers.", img: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=80" },
    { id: 15, name: "Backpack", price: 40, category: "fashion", desc: "Water-resistant backpack for travelers.", img: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&q=80" },
    { id: 16, name: "Sunglasses", price: 30, category: "fashion", desc: "Polarized lenses with vintage frame.", img: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=500&q=80" }
];

let users = [];

// --- Routes ---

app.get('/', (req, res) => {
    let filtered = products;
    const { category, search } = req.query;
    if (category && category !== 'all') filtered = filtered.filter(p => p.category === category);
    if (search) filtered = filtered.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

    res.render('index', { 
        products: filtered, 
        user: req.session.userId, 
        selectedCategory: category || 'all',
        wishlist: req.session.wishlist || [] 
    });
});

app.get('/product/:id', (req, res) => {
    const product = products.find(p => p.id === parseInt(req.params.id));
    if (product) res.render('product', { product, user: req.session.userId });
    else res.status(404).send('Product Not Found');
});

app.post('/wishlist/toggle', (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    if (!req.session.wishlist) req.session.wishlist = [];
    
    const productId = parseInt(req.body.productId);
    const index = req.session.wishlist.indexOf(productId);
    
    if (index === -1) req.session.wishlist.push(productId);
    else req.session.wishlist.splice(index, 1);
    
    res.redirect(req.get('referer') || '/');
});

app.get('/wishlist', (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    const items = products.filter(p => (req.session.wishlist || []).includes(p.id));
    res.render('wishlist', { products: items, user: req.session.userId });
});

app.get('/cart', (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    const cartIds = req.session.cart || [];
    const cartItems = cartIds.map(id => products.find(p => p.id == id)).filter(p => p);
    res.render('cart', { cartItems, user: req.session.userId });
});

app.post('/add-to-cart', (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    if (!req.session.cart) req.session.cart = [];
    req.session.cart.push(req.body.productId);
    res.redirect('/cart');
});

app.post('/remove-from-cart', (req, res) => {
    if (req.session.cart) {
        const index = req.session.cart.indexOf(req.body.productId);
        if (index > -1) req.session.cart.splice(index, 1);
    }
    res.redirect('/cart');
});

app.post('/checkout', (req, res) => {
    req.session.cart = [];
    // Clear saved cart data on the user database record object upon a checkout
    const user = users.find(u => u.username === req.session.userId);
    if (user) user.cart = [];
    
    res.send("<div style='text-align:center; padding:100px;'><h1>✔️ Order Placed Success!</h1><a href='/'>Back to Shop</a></div>");
});

app.get('/login', (req, res) => res.render('login'));

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);
    if (user) { 
        req.session.userId = user.username; 
        
        // 👉 PERSISTENCE LOAD: Retrieve user's saved cart and wishlist back to the session
        req.session.cart = user.cart || []; 
        req.session.wishlist = user.wishlist || []; 
        
        res.redirect('/'); 
    }
    else res.send('Login Failed');
});

app.post('/register', (req, res) => {
    // 👉 PERSISTENCE INITIALIZE: Give newly created user accounts blank profile containers
    users.push({ 
        username: req.body.username, 
        password: req.body.password, 
        cart: [], 
        wishlist: [] 
    });
    res.redirect('/login');
});

app.get('/logout', (req, res) => { 
    // 👉 PERSISTENCE SAVE: Store session details onto user profile container database array before destroying
    if (req.session.userId) {
        const user = users.find(u => u.username === req.session.userId);
        if (user) {
            user.cart = req.session.cart || [];
            user.wishlist = req.session.wishlist || [];
        }
    }
    req.session.destroy(); 
    res.redirect('/'); 
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));