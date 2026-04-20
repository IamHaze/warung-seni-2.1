const db = require("../database/db");

function applyTax() {
    db.run(`
        UPDATE users
        SET wallet = wallet * 0.98
        WHERE wallet > 100000
    `);
}

module.exports = { applyTax };
