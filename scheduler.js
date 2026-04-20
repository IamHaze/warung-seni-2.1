const db = require("../database/db");

function runPassiveIncome() {
    setInterval(() => {
        db.all("SELECT * FROM inventory", [], (err, items) => {
            if (err) return console.log(err);

            items.forEach(entry => {
                let base = 0;

                // 🧱 NORMAL ITEMS
                if (entry.item === "printer") base = 10;
                if (entry.item === "factory") base = 50;
                if (entry.item === "lab") base = 200;
                if (entry.item === "quantum_core") base = 1000;

                // 🌟 PRESTIGE ITEMS (ADD HERE)
                if (entry.item === "gold_printer") base = 500;
                if (entry.item === "ai_factory") base = 2000;
                if (entry.item === "dark_lab") base = 10000;

                // ❌ skip unknown items
                if (base === 0) return;

                db.get(
                    "SELECT prestige FROM users WHERE user_id = ?",
                    [entry.user_id],
                    (err, user) => {

                        const prestige = user?.prestige || 0;

                        // 💎 prestige multiplier
                        let multiplier = 1 + (prestige * 0.5);

                        // 🎲 RANDOM EVENTS
                        const roll = Math.random();

                        if (roll < 0.05) {
                            multiplier *= 2;
                            console.log(`🎉 Lucky boost for ${entry.user_id}`);
                        } 
                        else if (roll < 0.1) {
                            multiplier *= 0.5;
                            console.log(`💥 Bad event for ${entry.user_id}`);
                        }

                        const income = Math.floor(
                            base * entry.amount * (entry.level || 1) * multiplier
                        );

                        // 💰 STORE (NOT direct wallet)
                        db.run(
                            "UPDATE users SET pending_income = pending_income + ? WHERE user_id = ?",
                            [income, entry.user_id]
                        );
                    }
                );
            });
        });

        console.log("💸 Passive income tick");
    }, 30000);
}

module.exports = runPassiveIncome;
