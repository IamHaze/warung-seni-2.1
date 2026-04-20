const db = require("../database/db");
const config = require("../config.json");

function startNPCTrader() {
    setInterval(() => {

        if (Math.random() > config.market.npc_trader_chance) return;

        db.all(`SELECT * FROM market`, [], (err, items) => {
            if (!items.length) return;

            const item = items[Math.floor(Math.random() * items.length)];

            const volume = Math.floor(Math.random() * config.market.npc_trade_volume) + 1;

            const buy = Math.random() > 0.5;

            if (buy) {
                db.run(`UPDATE market SET demand = demand + ? WHERE item=?`,
                    [volume, item.item]);
                console.log(`🤖 NPC bought ${volume} ${item.item}`);
            } else {
                db.run(`UPDATE market SET supply = supply + ? WHERE item=?`,
                    [volume, item.item]);
                console.log(`🤖 NPC sold ${volume} ${item.item}`);
            }

        });

    }, 30000);
}

module.exports = { startNPCTrader };
