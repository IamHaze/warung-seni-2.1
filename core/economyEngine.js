const db = require("../database/db");
const getUser = require("./getUser");
const getPrestigeBonus = require("./prestigeBonus");
const config = require("../config.json");

function processIncome(user_id, baseAmount) {

    getUser(user_id, (err, user) => {

        if (!user) return;

        const bonus = getPrestigeBonus(user.prestige, config);
        const finalAmount = Math.floor(baseAmount * bonus);

        db.run(
            `UPDATE users SET wallet = wallet + ? WHERE user_id=?`,
            [finalAmount, user_id]
        );

    });
}

module.exports = { processIncome };
