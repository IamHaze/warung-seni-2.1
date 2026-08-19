const db    = require("../database/db");
const CROPS = require("../core/cropsData");
const { addXP } = require("../core/level");

function getCurrentSeason() {
    const SEASONS = ["spring", "summer", "fall", "winter"];
    return SEASONS[Math.floor((Math.floor(Date.now() / 86400000) % 28) / 7)];
}

function effectiveGrowTime(crop, wateredAt, season) {
    const inSeason   = crop.season === "any" || crop.season === season;
    const seasonMult = season === "winter" ? 3 : inSeason ? 1 : 2;
    let growTime     = crop.growTime * seasonMult;
    if (wateredAt > 0) growTime = Math.floor(growTime * 0.75);
    return growTime;
}

module.exports = {
    name: "harvest",
    execute(message, args) {
        const user   = message.author.id;
        const target = args[0]?.toLowerCase();
        const now    = Date.now();
        const season = getCurrentSeason();

        db.all(`SELECT * FROM farm_plots WHERE user_id=? ORDER BY plot_number`, [user], (err, plots) => {
            if (!plots || plots.length === 0) {
                return message.reply(
                    `🌾 No crops planted!\n` +
                    `🌱 Start with \`wplant <seed>\` — buy seeds from \`wshop\``
                );
            }

            const readyPlots = plots.filter(p => {
                const crop = CROPS[p.seed_type];
                if (!crop) return false;
                return now - p.planted_at >= effectiveGrowTime(crop, p.watered_at, season);
            });

            if (readyPlots.length === 0) {
                return message.reply("🌾 Nothing is ready to harvest yet! Check `wcrops` for timers.");
            }

            let toHarvest;
            if (!target || target === "all") {
                toHarvest = readyPlots;
            } else {
                const num = parseInt(target);
                toHarvest = readyPlots.filter(p => p.plot_number === num);
                if (toHarvest.length === 0)
                    return message.reply(`❌ Plot **#${num}** isn't ready yet, or doesn't exist.`);
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

                    // In-season bonus +20%
                    const inSeason = crop.season === "any" || crop.season === season;
                    if (inSeason && crop.season !== "any") coins = Math.floor(coins * 1.2);

                    totalCoins += coins;
                    totalXP    += crop.xp;

                    const tags = [
                        p.fertilized                           ? "🧪x2"     : "",
                        inSeason && crop.season !== "any"      ? "🌸+20%"   : "",
                        p.watered_at > 0                       ? "💧"        : ""
                    ].filter(Boolean).join(" ");

                    lines.push(`${crop.emoji} **${crop.name}** (Plot #${p.plot_number}) — 💰 **+${coins.toLocaleString()}** ${tags}`);

                    db.run(`DELETE FROM farm_plots WHERE user_id=? AND plot_number=?`, [user, p.plot_number]);
                });

                db.run(`UPDATE users SET wallet = wallet + ? WHERE user_id=?`, [totalCoins, user]);
                addXP(user, totalXP);

                message.reply(
                    `🌾 **HARVEST!** (${toHarvest.length} crop${toHarvest.length > 1 ? "s" : ""})\n\n` +
                    lines.join("\n") + "\n\n" +
                    `💰 **Total: +${totalCoins.toLocaleString()}** coins\n` +
                    `✨ **+${totalXP} XP** earned\n\n` +
                    `🌱 Plant again: \`wplant <seed>\`  |  🌾 View farm: \`wcrops\``
                );
            });
        });
    }
};
