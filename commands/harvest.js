const db    = require("../database/db");
const CROPS = require("../core/cropsData");
const { addXP } = require("../core/level");

function getCurrentSeason() {
    const SEASONS = ["spring", "summer", "fall", "winter"];
    return SEASONS[Math.floor((Math.floor(Date.now() / 86400000) % 28) / 7)];
}

function effectiveGrowTime(crop, plantedAt, wateredAt, fertilized, season) {
    const inSeason   = crop.season === "any" || crop.season === season;
    const seasonMult = season === "winter" ? 3 : inSeason ? 1 : 2;
    let growTime     = crop.growTime * seasonMult;

    // Watering reduces remaining grow time by 25% (applied once at water time)
    // We store watered_at; if watered, full grow time is discounted
    // Simple model: if watered, total grow time is 75%
    if (wateredAt > 0) growTime = Math.floor(growTime * 0.75);

    return growTime;
}

module.exports = {
    name: "harvest",
    execute(message, args) {
        const user   = message.author.id;
        const target = args[0]?.toLowerCase();   // "all" or a plot number
        const now    = Date.now();
        const season = getCurrentSeason();

        db.all(`SELECT * FROM farm_plots WHERE user_id=? ORDER BY plot_number`, [user], (err, plots) => {
            if (!plots || plots.length === 0) {
                return message.reply("🌾 No crops planted! Use `wplant <seed>` to start farming.");
            }

            const readyPlots = plots.filter(p => {
                const crop = CROPS[p.seed_type];
                if (!crop) return false;
                const growTime = effectiveGrowTime(crop, p.planted_at, p.watered_at, p.fertilized, season);
                return now - p.planted_at >= growTime;
            });

            if (readyPlots.length === 0) {
                return message.reply("🌾 Nothing is ready to harvest yet! Check `wcrops` for timers.");
            }

            // Which plots to harvest
            let toHarvest;
            if (!target || target === "all") {
                toHarvest = readyPlots;
            } else {
                const num = parseInt(target);
                toHarvest = readyPlots.filter(p => p.plot_number === num);
                if (toHarvest.length === 0)
                    return message.reply(`❌ Plot **#${num}** isn't ready yet (or doesn't exist).`);
            }

            db.get(`SELECT prestige FROM users WHERE user_id=?`, [user], (err, u) => {
                const prestigeMult = 1 + ((u?.prestige || 0) * 0.05);
                let totalCoins = 0;
                let totalXP    = 0;
                const lines    = [];

                toHarvest.forEach(p => {
                    const crop = CROPS[p.seed_type];
                    const [minY, maxY] = crop.yield;
                    let coins = Math.floor(
                        (Math.random() * (maxY - minY) + minY) * prestigeMult
                    );

                    // Fertilizer doubles yield
                    if (p.fertilized) coins = Math.floor(coins * 2);

                    // In-season bonus (+20%)
                    const inSeason = crop.season === "any" || crop.season === season;
                    if (inSeason && crop.season !== "any") coins = Math.floor(coins * 1.2);

                    totalCoins += coins;
                    totalXP    += crop.xp;

                    const fertTag   = p.fertilized ? " 🧪" : "";
                    const seasonTag = (inSeason && crop.season !== "any") ? " 🌸+20%" : "";
                    lines.push(`${crop.emoji} **${crop.name}** (Plot #${p.plot_number}) — 💰 **+${coins.toLocaleString()}**${fertTag}${seasonTag}`);

                    // Remove plot
                    db.run(`DELETE FROM farm_plots WHERE user_id=? AND plot_number=?`, [user, p.plot_number]);
                });

                db.run(`UPDATE users SET wallet = wallet + ? WHERE user_id=?`, [totalCoins, user]);
                addXP(user, totalXP);

                message.reply(
                    `🌾 **HARVEST!** (${toHarvest.length} crop${toHarvest.length > 1 ? "s" : ""})\n\n` +
                    lines.join("\n") + "\n\n" +
                    `💰 **Total: +${totalCoins.toLocaleString()}** coins\n` +
                    `✨ **+${totalXP} XP** earned\n\n` +
                    `🌱 Plant again with \`wplant <seed>\` | 🌾 \`wcrops\` to view farm`
                );
            });
        });
    }
};
