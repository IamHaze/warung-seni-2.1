const db       = require("../database/db");
const CROPS    = require("../core/cropsData");

const BASE_PLOTS     = 6;
const PLOTS_PER_PRESTIGE = 5; // 1 extra plot per 5 prestige levels

function getCurrentSeason() {
    const SEASONS = ["spring", "summer", "fall", "winter"];
    const day     = Math.floor(Date.now() / 86400000);
    return SEASONS[Math.floor((day % 28) / 7)];
}

module.exports = {
    name: "plant",
    execute(message, args) {
        const user    = message.author.id;
        const seedKey = args[0]?.toLowerCase();
        const plotNum = parseInt(args[1]) || null;

        if (!seedKey || !CROPS[seedKey]) {
            const list = Object.entries(CROPS)
                .map(([k, c]) =>
                    `${c.emoji} \`${k}\` — ${(c.growTime / 60000).toFixed(0)}m grow | ` +
                    `💰 ${c.yield[0]}–${c.yield[1]}` +
                    (c.legendary ? " 🌟" : "") +
                    (c.season !== "any" ? ` *(${c.season})*` : "")
                )
                .join("\n");
            return message.reply(
                `🌱 **Usage:** \`wplant <seed> [plot#]\`\n\n` +
                `**Available Seeds:** (buy with \`wbuy <seed>\`)\n${list}`
            );
        }

        const crop = CROPS[seedKey];

        db.get(`SELECT amount FROM inventory WHERE user_id=? AND item=?`, [user, seedKey], (err, inv) => {
            if (!inv || inv.amount < 1) {
                return message.reply(
                    `❌ No **${crop.emoji} ${seedKey}** in inventory!\n` +
                    `🛒 Buy some: \`wbuy ${seedKey}\``
                );
            }

            db.get(`SELECT prestige FROM users WHERE user_id=?`, [user], (err, u) => {
                const totalPlots = BASE_PLOTS + Math.floor((u?.prestige || 0) / PLOTS_PER_PRESTIGE);

                db.all(`SELECT plot_number FROM farm_plots WHERE user_id=?`, [user], (err, taken) => {
                    const occupied = new Set((taken || []).map(p => p.plot_number));

                    // Resolve target plot
                    let target = plotNum;
                    if (target) {
                        if (target < 1 || target > totalPlots)
                            return message.reply(`❌ Plot must be 1–${totalPlots}`);
                        if (occupied.has(target))
                            return message.reply(`❌ Plot **#${target}** already has a crop growing!`);
                    } else {
                        for (let i = 1; i <= totalPlots; i++) {
                            if (!occupied.has(i)) { target = i; break; }
                        }
                        if (!target) {
                            return message.reply(
                                `❌ All **${totalPlots}** plots are full!\n` +
                                `🌟 Gain more prestige to unlock extra plots (every 5 levels = +1 plot)\n` +
                                `🌾 Use \`wharvest\` to clear finished crops.`
                            );
                        }
                    }

                    const season        = getCurrentSeason();
                    const inSeason      = crop.season === "any" || crop.season === season;
                    const seasonMult    = season === "winter" ? 3 : inSeason ? 1 : 2;
                    const adjustedTime  = crop.growTime * seasonMult;
                    const now           = Date.now();
                    const readyAt       = Math.floor((now + adjustedTime) / 1000);

                    db.run(
                        `INSERT OR REPLACE INTO farm_plots
                         (user_id, plot_number, seed_type, planted_at, watered_at, fertilized)
                         VALUES (?, ?, ?, ?, 0, 0)`,
                        [user, target, seedKey, now],
                        (err) => {
                            if (err) return message.reply("❌ DB error");

                            db.run(`UPDATE inventory SET amount = amount - 1 WHERE user_id=? AND item=?`, [user, seedKey]);
                            db.run(`DELETE FROM inventory WHERE user_id=? AND item=? AND amount <= 0`, [user, seedKey]);

                            let note = "";
                            if (season === "winter")      note = "\n❄️ Winter — grows **3× slower**! Consider using fertilizer.";
                            else if (!inSeason)           note = `\n⚠️ Out of season (${season}) — grows **2× slower**!`;
                            else                          note = `\n🌸 In season! Growing at normal speed.`;

                            message.reply(
                                `🌱 **Planted!** — Plot #${target}\n\n` +
                                `${crop.emoji} **${crop.name}**\n` +
                                `⏳ Ready <t:${readyAt}:R>${note}\n\n` +
                                `💡 \`wwater ${target}\` to speed it up | \`wcrops\` to view your farm`
                            );
                        }
                    );
                });
            });
        });
    }
};
