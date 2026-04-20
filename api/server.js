const express = require("express");
const db = require("../database/db");

const app = express();
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));

// HOME DASHBOARD
app.get("/", (req, res) => {
    db.all("SELECT * FROM users", [], (err, users) => {
        db.all("SELECT * FROM market", [], (err, market) => {
            res.render("index", { users, market });
        });
    });
});

// GIVE MONEY
app.post("/give", (req, res) => {
    const { user, amount } = req.body;

    db.run(`UPDATE users SET wallet = wallet + ? WHERE user_id=?`,
        [amount, user]);

    res.redirect("/");
});

// RESET USER
app.post("/reset", (req, res) => {
    const { user } = req.body;

    db.run(`DELETE FROM users WHERE user_id=?`, [user]);
    res.redirect("/");
});

app.listen(4000, () => {
    console.log("🌐 Dashboard running on http://localhost:4000");
});
