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
                return message.reply("🌾 No crops to water! Plant something first with `wplant`.");

            const toWater = target && target !== "all"
                ? plots.filter(p => p.plot_number === parseInt(target))
                : plots.filter(p => !p.watered_at || p.watered_at === 0);

            const alreadyDone = target && target !== "all"
                ? plots.filter(p => p.plot_number === parseInt(target) && p.watered_at > 0)
                : [];

            if (alreadyDone.length > 0)
                return message.reply(`💧 Plot **#${args[0]}** was already watered!`);

            if (toWater.length === 0)
                return message.reply("💧 All plots are already watered!");

            const lines = [];
            toWater.forEach(p => {
                const crop = CROPS[p.seed_type];
                if (!crop) return;

                db.run(`UPDATE farm_plots SET watered_at=? WHERE user_id=? AND plot_number=?`, [now, user, p.plot_number]);

                // Recalculate remaining time with 25% discount
                const elapsed      = now - p.planted_at;
                const originalTime = crop.growTime;
                const newTime      = Math.floor(originalTime * 0.75);
                const newReadyAt   = Math.floor((p.planted_at + newTime) / 1000);
                const isReady      = now - p.planted_at >= newTime;

                lines.push(
                    `💧 Plot #${p.plot_number} — ${crop.emoji} ${crop.name}: ` +
                    (isReady ? "✅ **READY NOW!**" : `⏳ ready <t:${newReadyAt}:R>`)
                );
            });

            message.reply(
                `💧 **Watered ${toWater.length} plot${toWater.length > 1 ? "s" : ""}!**\n\n` +
                lines.join("\n") + "\n\n" +
                `⚡ Grow time reduced by **25%**!\n` +
                `🧪 Use \`wfertilize [#]\` to double the yield`
            );
        });
    }
};
