const db    = require("../database/db");
const CROPS = require("../core/cropsData");

const BASE_PLOTS = 6;
const SEASON_EMOJI = { spring: "🌸", summer: "☀️", fall: "🍂", winter: "❄️" };

function getCurrentSeason() {
    const SEASONS = ["spring", "summer", "fall", "winter"];
    return SEASONS[Math.floor((Math.floor(Date.now() / 86400000) % 28) / 7)];
}

function progressBar(pct) {
    const filled = Math.round(pct * 10);
    return `[${"█".repeat(filled)}${"░".repeat(10 - filled)}]`;
}

module.exports = {
    name: "crops",
    execute(message) {
        const user   = message.author.id;
        const now    = Date.now();
        const season = getCurrentSeason();
        const se     = SEASON_EMOJI[season];

        db.get(`SELECT prestige FROM users WHERE user_id=?`, [user], (err, u) => {
            const totalPlots = BASE_PLOTS + Math.floor((u?.prestige || 0) / 5);

            db.all(`SELECT * FROM farm_plots WHERE user_id=? ORDER BY plot_number`, [user], (err, plots) => {
                const plotMap = {};
                (plots || []).forEach(p => { plotMap[p.plot_number] = p; });

                const lines = [`🌾 **YOUR FARM** — ${se} **${season.charAt(0).toUpperCase() + season.slice(1)}**\n`];
                let readyCount = 0;

                for (let i = 1; i <= totalPlots; i++) {
                    const p = plotMap[i];

                    if (!p) {
                        lines.push(`┃ **Plot #${i}** — *(empty)*\n┃`);
                        continue;
                    }

                    const crop = CROPS[p.seed_type];
                    if (!crop) {
                        lines.push(`┃ **Plot #${i}** — *(unknown crop)*\n┃`);
                        continue;
                    }

                    // Effective grow time considering watering
                    const inSeason   = crop.season === "any" || crop.season === season;
                    const seasonMult = season === "winter" ? 3 : inSeason ? 1 : 2;
                    let growTime     = crop.growTime * seasonMult;
                    if (p.watered_at > 0) growTime = Math.floor(growTime * 0.75);

                    const elapsed  = now - p.planted_at;
                    const pct      = Math.min(1, elapsed / growTime);
                    const isReady  = pct >= 1;

                    if (isReady) readyCount++;

                    const stage    = isReady ? crop.stages[2] : pct > 0.5 ? crop.stages[1] : crop.stages[0];
                    const bar      = progressBar(pct);
                    const readyAt  = Math.floor((p.planted_at + growTime) / 1000);
                    const timer    = isReady ? "✅ **READY!**" : `⏳ <t:${readyAt}:R>`;
                    const tags     = [
                        p.watered_at > 0 ? "💧" : "",
                        p.fertilized     ? "🧪" : "",
                        !inSeason && !isReady ? "⚠️ slow" : ""
                    ].filter(Boolean).join(" ");

                    lines.push(
                        `┃ **Plot #${i}** — ${stage} ${crop.name}  ${tags}\n` +
                        `┃ ${bar} ${Math.round(pct * 100)}%  ${timer}\n┃`
                    );
                }

                const footer = [
                    readyCount > 0 ? `\n✅ **${readyCount} plot${readyCount > 1 ? "s" : ""} ready!** Run \`wharvest all\`` : "",
                    `\n📋 \`wplant\` | \`wharvest\` | \`wwater\` | \`wfertilize\``,
                    `🌟 Prestige ${u?.prestige || 0} — ${totalPlots} plots unlocked`
                ].filter(Boolean).join("\n");

                message.reply(lines.join("\n") + footer);
            });
        });
    }
};
