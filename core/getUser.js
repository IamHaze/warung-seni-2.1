const db = require("../database/db");

module.exports = function getUser(user, callback) {

    db.run(
        `INSERT OR IGNORE INTO users 
        (user_id, wallet, bank, last_daily, last_claim, streak, prestige, last_collect, pending_income, last_event, heat)
        VALUES (?, 500, 0, 0, 0, 0, 0, 0, 0, '', 0)`,
        [user],
        function (err) {

            if (err) return callback(err);

            // ✅ NOW guaranteed user exists
            db.get(
                `SELECT * FROM users WHERE user_id=?`,
                [user],
                (err, row) => {

                    if (!row) {
                        return callback("User creation failed");
                    }

                    // 🔒 HARD SAFETY (prevents random null bugs)
                    row.prestige = row.prestige || 0;
                    row.heat = row.heat || 0;
                    row.wallet = row.wallet || 0;
                    row.bank = row.bank || 0;

                    callback(null, row);
                }
            );
        }
    );
};
