const db = require("../database/db");
const config = require("../config.json");

function runPoliceSystem() {
    setInterval(() => {

        db.all("SELECT user_id, heat, wallet FROM users", [], (err, users) => {
            if (err || !users) return;

            users.forEach(user => {
                const heat = user.heat || 0;

                // 🚔 POLICE TRIGGER
                if (heat >= config.heat.max_before_police) {

                    const fine = Math.floor(user.wallet * config.heat.fine_multiplier);

                    db.run(
                        "UPDATE users SET wallet = wallet - ?, heat = 0 WHERE user_id=?",
                        [fine, user.user_id]
                    );

                    console.log(`🚔 Police fined ${user.user_id} for ${fine}`);
                }

                // ❄️ HEAT DECAY
                if (heat > 0) {
                    db.run(
                        "UPDATE users SET heat = heat - ? WHERE user_id=?",
                        [config.heat.decay_per_minute, user.user_id]
                    );
                }
            });

        });

    }, 60000);
}

module.exports = runPoliceSystem;
