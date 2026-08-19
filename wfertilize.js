const db    = require("../database/db");
const CROPS = require("../core/cropsData");

module.exports = {
    name: "fertilize",
    execute(message, args) {
        const user    = message.author.id;
        const isAll   = args[0]?.toLowerCase() === "all";
        const plotNum = isAll ? null : parseInt(args[0]) || null;

        db.get(`SELECT amount FROM inventory WHERE user_id=? AND item='fertilizer'`, [user], (err, inv) => {
            if (!inv || inv.amount < 1) {
                return message.reply(
                    `❌ You have no **fertilizer**!\n` +
                    `🛒 Buy some: \`wbuy fertilizer\` (💰 500 each)`
                );
            }

            // ── ALL MODE ─────────────────────────────────────────────────────────────
            if (isAll) {
                db.all(
                    `SELECT * FROM farm_plots WHERE user_id=? AND fertilized=0 ORDER BY plot_number`,
                    [user],
                    (err, plots) => {
                        if (!plots || plots.length === 0) {
                            return message.reply("✅ All your crops are already fertilized!");
                        }

                        const toFert = Math.min(plots.length, inv.amount);
                        const targets = plots.slice(0, toFert);

                        targets.forEach(p => {
                            db.run(
                                `UPDATE farm_plots SET fertilized=1 WHERE user_id=? AND plot_number=?`,
                                [user, p.plot_number]
                            );
                        });

                        db.run(
                            `UPDATE inventory SET amount = amount - ? WHERE user_id=? AND item='fertilizer'`,
                            [toFert, user]
                        );
                        db.run(
                            `DELETE FROM inventory WHERE user_id=? AND item='fertilizer' AND amount <= 0`,
                            [user]
                        );

                        const remaining  = inv.amount - toFert;
                        const skipped    = plots.length - toFert;
                        const plotList   = targets.map(p => {
                            const crop = CROPS[p.seed_type];
                            return `🧪 Plot #${p.plot_number} — ${crop?.emoji || "🌱"} **${crop?.name || p.seed_type}**`;
                        }).join("\n");

                        let footer = `\n🧪 Fertilizer remaining: **${remaining}**`;
                        if (skipped > 0) footer += `\n⚠️ **${skipped}** plot(s) skipped — not enough fertilizer!`;

                        return message.reply(
                            `🧪 **Fertilized ${toFert} plot${toFert > 1 ? "s" : ""}!**\n\n` +
                            plotList +
                            `\n\n📈 Harvest yield on all these plots will be **doubled**!` +
                            footer +
                            `\n\n🌾 Check your farm: \`wcrops\``
                        );
                    }
                );
                return;
            }

            // ── SINGLE PLOT MODE ─────────────────────────────────────────────────────
            const query  = plotNum
                ? `SELECT * FROM farm_plots WHERE user_id=? AND plot_number=?`
                : `SELECT * FROM farm_plots WHERE user_id=? AND fertilized=0 LIMIT 1`;
            const params = plotNum ? [user, plotNum] : [user];

            db.get(query, params, (err, plot) => {
                if (!plot) {
                    return plotNum
                        ? message.reply(`❌ No crop in plot **#${plotNum}**! Use \`wcrops\` to check your farm.`)
                        : message.reply("❌ No un-fertilized crops found! Plant something first with `wplant <seed>`.");
                }

                if (plot.fertilized) {
                    return message.reply(`❌ Plot **#${plot.plot_number}** is already fertilized!`);
                }

                const crop = CROPS[plot.seed_type];

                db.run(`UPDATE farm_plots SET fertilized=1 WHERE user_id=? AND plot_number=?`, [user, plot.plot_number]);
                db.run(`UPDATE inventory SET amount = amount - 1 WHERE user_id=? AND item='fertilizer'`, [user]);
                db.run(`DELETE FROM inventory WHERE user_id=? AND item='fertilizer' AND amount <= 0`, [user]);

                message.reply(
                    `🧪 **Fertilized!** — Plot #${plot.plot_number}\n\n` +
                    `${crop?.emoji || "🌱"} **${crop?.name || plot.seed_type}**\n` +
                    `📈 Harvest yield will be **doubled**!\n` +
                    `🧪 Fertilizer remaining: **${inv.amount - 1}**\n\n` +
                    `💡 \`wfertilize all\` — fertilize all plots at once\n` +
                    `🌾 Check your farm: \`wcrops\``
                );
            });
        });
    }
};
