const db    = require("../database/db");
const CROPS = require("../core/cropsData");

const BASE_PLOTS   = 6;
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

                const lines    = [];
                let readyCount = 0;
                let emptyCount = 0;

                lines.push(`🌾 **YOUR FARM** — ${se} **${season.charAt(0).toUpperCase() + season.slice(1)}**\n`);

                for (let i = 1; i <= totalPlots; i++) {
                    const p = plotMap[i];

                    if (!p) {
                        emptyCount++;
                        lines.push(`┃ **Plot #${i}** — 🟫 *(empty — \`wplant <seed> ${i}\`)*`);
                        lines.push(`┃`);
                        continue;
                    }

                    const crop = CROPS[p.seed_type];
                    if (!crop) {
                        lines.push(`┃ **Plot #${i}** — *(unknown crop)*`);
                        lines.push(`┃`);
                        continue;
                    }

                    const inSeason   = crop.season === "any" || crop.season === season;
                    const seasonMult = season === "winter" ? 3 : inSeason ? 1 : 2;
                    let growTime     = crop.growTime * seasonMult;
                    if (p.watered_at > 0) growTime = Math.floor(growTime * 0.75);

                    const elapsed = now - p.planted_at;
                    const pct     = Math.min(1, elapsed / growTime);
                    const isReady = pct >= 1;

                    if (isReady) readyCount++;

                    const stage   = isReady ? crop.stages[2] : pct > 0.5 ? crop.stages[1] : crop.stages[0];
                    const bar     = progressBar(pct);
                    const readyAt = Math.floor((p.planted_at + growTime) / 1000);
                    const timer   = isReady ? "✅ **READY TO HARVEST!**" : `⏳ ready <t:${readyAt}:R>`;

                    const tags = [
                        p.watered_at > 0                       ? "💧 watered"     : "",
                        p.fertilized                           ? "🧪 fertilized"  : "",
                        !inSeason && !isReady                  ? "⚠️ slow season" : ""
                    ].filter(Boolean).join("  ");

                    lines.push(
                        `┃ **Plot #${i}** — ${stage} ${crop.name}  ${tags ? `*(${tags})*` : ""}\n` +
                        `┃ ${bar} **${Math.round(pct * 100)}%**  ${timer}`
                    );
                    lines.push(`┃`);
                }

                const footerParts = [];
                if (readyCount > 0)
                    footerParts.push(`\n✅ **${readyCount} plot${readyCount > 1 ? "s" : ""} ready!** → \`wharvest all\``);
                if (emptyCount > 0)
                    footerParts.push(`🟫 **${emptyCount}** empty plot${emptyCount > 1 ? "s" : ""} — plant seeds from \`wshop\``);
                footerParts.push(`\n📋 \`wplant\` · \`wwater\` · \`wfertilize\` · \`wharvest\``);
                footerParts.push(`🌟 Prestige **${u?.prestige || 0}** — **${totalPlots}** plots unlocked`);

                const full = lines.join("\n") + "\n" + footerParts.join("\n");

                // Discord 2000 char limit guard
                if (full.length > 1980) {
                    return message.reply(full.slice(0, 1980) + "\n*(truncated — use wharvest to free plots)*");
                }
                message.reply(full);
            });
        });
    }
};
