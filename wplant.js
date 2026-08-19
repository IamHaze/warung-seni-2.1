const db    = require("../database/db");
const CROPS = require("../core/cropsData");

const BASE_PLOTS         = 6;
const PLOTS_PER_PRESTIGE = 5;

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
        const isAll   = args[1]?.toLowerCase() === "all";
        const plotNum = isAll ? null : parseInt(args[1]) || null;

        if (!seedKey || !CROPS[seedKey]) {
            const list = Object.entries(CROPS)
                .map(([k, c]) =>
                    `${c.emoji} \`${k}\` — ${(c.growTime / 60000).toFixed(0)}m · ` +
                    `💰 ${c.yield[0].toLocaleString()}–${c.yield[1].toLocaleString()}` +
                    (c.legendary ? " 🌟" : "") +
                    (c.season !== "any" ? ` *(${c.season} only)*` : "")
                )
                .join("\n");
            return message.reply(
                `🌱 **Usage:** \`wplant <seed> [plot# | all]\`\n\n` +
                `**Available Seeds** — buy with \`wbuy <seed>\`:\n${list}\n\n` +
                `🌾 View your farm: \`wcrops\`\n` +
                `💡 \`wplant wheat all\` — plants wheat in every empty plot at once`
            );
        }

        const crop = CROPS[seedKey];

        db.get(`SELECT amount FROM inventory WHERE user_id=? AND item=?`, [user, seedKey], (err, inv) => {
            if (!inv || inv.amount < 1) {
                return message.reply(
                    `❌ You have no **${crop.emoji} ${seedKey}**!\n` +
                    `🛒 Buy some: \`wbuy ${seedKey}\``
                );
            }

            db.get(`SELECT prestige FROM users WHERE user_id=?`, [user], (err, u) => {
                const totalPlots = BASE_PLOTS + Math.floor((u?.prestige || 0) / PLOTS_PER_PRESTIGE);

                db.all(`SELECT plot_number FROM farm_plots WHERE user_id=?`, [user], (err, taken) => {
                    const occupied = new Set((taken || []).map(p => p.plot_number));

                    // ── ALL MODE ─────────────────────────────────────────────────────
                    if (isAll) {
                        const emptyPlots = [];
                        for (let i = 1; i <= totalPlots; i++) {
                            if (!occupied.has(i)) emptyPlots.push(i);
                        }

                        if (emptyPlots.length === 0) {
                            return message.reply(
                                `❌ All **${totalPlots}** plots are full!\n` +
                                `🌾 Harvest finished crops with \`wharvest all\``
                            );
                        }

                        const toPlant  = Math.min(emptyPlots.length, inv.amount);
                        const targets  = emptyPlots.slice(0, toPlant);

                        const season     = getCurrentSeason();
                        const inSeason   = crop.season === "any" || crop.season === season;
                        const seasonMult = season === "winter" ? 3 : inSeason ? 1 : 2;
                        const growTime   = crop.growTime * seasonMult;
                        const now        = Date.now();
                        const readyAt    = Math.floor((now + growTime) / 1000);

                        let done = 0;
                        targets.forEach(plotN => {
                            db.run(
                                `INSERT OR REPLACE INTO farm_plots
                                 (user_id, plot_number, seed_type, planted_at, watered_at, fertilized)
                                 VALUES (?, ?, ?, ?, 0, 0)`,
                                [user, plotN, seedKey, now],
                                () => { done++; }
                            );
                        });

                        db.run(
                            `UPDATE inventory SET amount = amount - ? WHERE user_id=? AND item=?`,
                            [toPlant, user, seedKey]
                        );
                        db.run(
                            `DELETE FROM inventory WHERE user_id=? AND item=? AND amount <= 0`,
                            [user, seedKey]
                        );

                        let note = "";
                        if (season === "winter")  note = "\n❄️ Winter — grows **3× slower**!";
                        else if (!inSeason)       note = `\n⚠️ Out of season (${season}) — grows **2× slower**!`;
                        else                      note = `\n🌸 In season! Normal grow speed.`;

                        const remaining = inv.amount - toPlant;
                        const plotList  = targets.map(n => `#${n}`).join(", ");

                        return message.reply(
                            `🌱 **Planted ${toPlant}× ${crop.emoji} ${crop.name}** in: **${plotList}**\n\n` +
                            `⏳ All ready: <t:${readyAt}:R>${note}\n` +
                            `🌾 Seeds remaining: **${remaining}**\n\n` +
                            `💡 \`wwater all\` — -25% grow time on all plots\n` +
                            `💡 \`wfertilize all\` — x2 yield on all plots\n` +
                            `🌾 \`wcrops\` — view your full farm`
                        );
                    }

                    // ── SINGLE PLOT MODE ─────────────────────────────────────────────
                    let target = plotNum;
                    if (target) {
                        if (target < 1 || target > totalPlots)
                            return message.reply(`❌ Plot must be 1–${totalPlots}. You have **${totalPlots}** plots unlocked.`);
                        if (occupied.has(target))
                            return message.reply(`❌ Plot **#${target}** already has a crop! Use \`wcrops\` to check timers.`);
                    } else {
                        for (let i = 1; i <= totalPlots; i++) {
                            if (!occupied.has(i)) { target = i; break; }
                        }
                        if (!target) {
                            return message.reply(
                                `❌ All **${totalPlots}** plots are full!\n` +
                                `🌾 Harvest finished crops with \`wharvest all\`\n` +
                                `🌟 Gain prestige to unlock more plots (every 5 levels = +1 plot)`
                            );
                        }
                    }

                    const season       = getCurrentSeason();
                    const inSeason     = crop.season === "any" || crop.season === season;
                    const seasonMult   = season === "winter" ? 3 : inSeason ? 1 : 2;
                    const adjustedTime = crop.growTime * seasonMult;
                    const now          = Date.now();
                    const readyAt      = Math.floor((now + adjustedTime) / 1000);

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
                            if (season === "winter")  note = "\n❄️ Winter — grows **3× slower**! Use fertilizer to help.";
                            else if (!inSeason)       note = `\n⚠️ Out of season (${season}) — grows **2× slower**!`;
                            else                      note = `\n🌸 In season! Normal grow speed.`;

                            message.reply(
                                `🌱 **Planted!** — Plot #${target}\n\n` +
                                `${crop.emoji} **${crop.name}**\n` +
                                `⏳ Ready: <t:${readyAt}:R>${note}\n\n` +
                                `💡 \`wwater ${target}\` — -25% grow time\n` +
                                `💡 \`wfertilize ${target}\` — x2 yield\n` +
                                `🌾 \`wcrops\` — view your full farm`
                            );
                        }
                    );
                });
            });
        });
    }
};
