const db    = require("../database/db");
const CROPS = require("../core/cropsData");

module.exports = {
    name: "fertilize",
    execute(message, args) {
        const user    = message.author.id;
        const plotNum = parseInt(args[0]) || null;

        // Check fertilizer in inventory
        db.get(`SELECT amount FROM inventory WHERE user_id=? AND item='fertilizer'`, [user], (err, inv) => {
            if (!inv || inv.amount < 1) {
                return message.reply(
                    `❌ You have no **fertilizer**!\n` +
                    `🛒 Buy some: \`wbuy fertilizer\` (💰 500)`
                );
            }

            const query = plotNum
                ? `SELECT * FROM farm_plots WHERE user_id=? AND plot_number=?`
                : `SELECT * FROM farm_plots WHERE user_id=? AND fertilized=0 LIMIT 1`;
            const params = plotNum ? [user, plotNum] : [user];

            db.get(query, params, (err, plot) => {
                if (!plot) {
                    return plotNum
                        ? message.reply(`❌ No crop in plot **#${plotNum}**!`)
                        : message.reply("❌ No un-fertilized crops found! Plant something first.");
                }
                if (plot.fertilized) return message.reply(`❌ Plot **#${plot.plot_number}** is already fertilized!`);

                const crop = CROPS[plot.seed_type];
                db.run(`UPDATE farm_plots SET fertilized=1 WHERE user_id=? AND plot_number=?`, [user, plot.plot_number]);
                db.run(`UPDATE inventory SET amount = amount - 1 WHERE user_id=? AND item='fertilizer'`, [user]);
                db.run(`DELETE FROM inventory WHERE user_id=? AND item='fertilizer' AND amount <= 0`, [user]);

                message.reply(
                    `🧪 **Fertilized!** — Plot #${plot.plot_number}\n\n` +
                    `${crop?.emoji || "🌱"} **${crop?.name || plot.seed_type}**\n` +
                    `📈 Yield doubled on harvest!\n` +
                    `🧪 Fertilizer used: ${inv.amount - 1} remaining`
                );
            });
        });
    }
};
