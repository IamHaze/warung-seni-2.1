const db    = require("../database/db");
const CROPS = require("../core/cropsData");

module.exports = {
    name: "water",
    execute(message, args) {
        const user   = message.author.id;
        const target = args[0]?.toLowerCase();
        const now    = Date.now();

        db.all(`SELECT * FROM farm_plots WHERE user_id=? ORDER BY plot_number`, [user], (err, plots) => {
            if (!plots || plots.length === 0)
                return message.reply(
                    "🌾 No crops to water! Plant something first with `wplant <seed>`.\n" +
                    "💡 Tip: `wplant wheat all` — plants in every empty plot at once!"
                );

            // ── Determine which plots to water ──────────────────────────────────────
            let toWater;
            if (target && target !== "all") {
                const num  = parseInt(target);
                const plot = plots.find(p => p.plot_number === num);
                if (!plot)            return message.reply(`❌ No crop in plot **#${num}**!`);
                if (plot.watered_at > 0) return message.reply(`💧 Plot **#${num}** is already watered!`);
                toWater = [plot];
            } else {
                toWater = plots.filter(p => !p.watered_at || p.watered_at === 0);
            }

            if (toWater.length === 0)
                return message.reply("💧 All your plots are already watered!");

            const lines = [];

            toWater.forEach(p => {
                const crop = CROPS[p.seed_type];
                if (!crop) return;

                db.run(
                    `UPDATE farm_plots SET watered_at=? WHERE user_id=? AND plot_number=?`,
                    [now, user, p.plot_number]
                );

                const newGrowTime = Math.floor(crop.growTime * 0.75);
                const newReadyAt  = Math.floor((p.planted_at + newGrowTime) / 1000);
                const isReady     = now - p.planted_at >= newGrowTime;

                lines.push(
                    `💧 Plot #${p.plot_number} — ${crop.emoji} **${crop.name}**: ` +
                    (isReady ? "✅ **READY NOW!**" : `⏳ ready <t:${newReadyAt}:R>`)
                );
            });

            message.reply(
                `💧 **Watered ${toWater.length} plot${toWater.length > 1 ? "s" : ""}!**\n\n` +
                lines.join("\n") + "\n\n" +
                `⚡ Grow time reduced by **25%**!\n` +
                `💡 \`wfertilize all\` — double yield on all plots\n` +
                `🌾 \`wcrops\` — view your full farm`
            );
        });
    }
};
