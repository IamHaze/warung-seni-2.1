const db = require("../database/db");
const { getGlobalMultiplier } = require("./globalEvents");

function runPassiveIncome() {
    setInterval(() => {
        db.all("SELECT * FROM inventory", [], (err, items) => {
            if (err) return console.log(err);

            items.forEach(entry => {
                let base = 0;

                if (entry.item === "printer") base = 10;
                if (entry.item === "factory") base = 50;
                if (entry.item === "lab") base = 200;
                if (entry.item === "quantum_core") base = 1000;

                if (entry.item === "gold_printer") base = 500;
                if (entry.item === "ai_factory") base = 2000;
                if (entry.item === "dark_lab") base = 10000;

                if (base === 0) return;

                db.get(
                    "SELECT prestige FROM users WHERE user_id=?",
                    [entry.user_id],
                    (err, user) => {

                        const prestige = user?.prestige || 0;

                        let multiplier =
                            (1 + prestige * 0.5) * getGlobalMultiplier();

                        let eventMsg = "";
                        const roll = Math.random();

                        if (roll < 0.01) {
                            multiplier *= 5;
                            eventMsg = "💎 JACKPOT!!! x5 income!";
                        } else if (roll < 0.05) {
                            multiplier *= 2;
                            eventMsg = "🎉 Lucky boost! x2 income";
                        } else if (roll < 0.10) {
                            multiplier *= 0.5;
                            eventMsg = "💥 System failure! x0.5 income";
                        }

                        const income = Math.floor(
                            base * entry.amount * (entry.level || 1) * multiplier
                        );

                        db.run(
                            "UPDATE users SET pending_income = pending_income + ?, last_event=? WHERE user_id=?",
                            [income, eventMsg, entry.user_id]
                        );
                    }
                );
            });
        });

        console.log("💸 Passive tick");
    }, 30000);
}

module.exports = runPassiveIncome;
