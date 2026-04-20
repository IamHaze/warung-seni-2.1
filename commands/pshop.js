module.exports = {
    name: "pshop",
    execute(message) {
        message.reply(
            `🌟 **PRESTIGE SHOP** — \`wpbuy <item>\`\n` +
            `*Prestige level is required, not spent.*\n\n` +

            `**━━━ Tier 1–3 ━━━**\n` +
            `🖨️ \`gold_printer\`   — P1  | 500/tick\n` +
            `🤖 \`ai_factory\`     — P2  | 2,000/tick\n` +
            `🌑 \`dark_lab\`       — P3  | 10,000/tick\n\n` +

            `**━━━ Tier 4–6 ━━━**\n` +
            `⛏️ \`gold_mine\`      — P4  | 25,000/tick\n` +
            `💎 \`diamond_mine\`   — P5  | 60,000/tick\n` +
            `⚡ \`power_plant\`    — P6  | 120,000/tick\n\n` +

            `**━━━ Tier 7–9 ━━━**\n` +
            `🛢️ \`oil_refinery\`   — P7  | 250,000/tick\n` +
            `🌊 \`offshore_drill\` — P8  | 500,000/tick\n` +
            `🏦 \`bank\`           — P9  | 1,000,000/tick\n\n` +

            `**━━━ Tier 10–12 ━━━**\n` +
            `🛢️ \`oil_rig\`        — P10 | 2,500,000/tick\n` +
            `☢️ \`nuclear_plant\`  — P11 | 5,000,000/tick\n` +
            `🚀 \`space_station\`  — P12 | 10,000,000/tick\n\n` +

            `**━━━ Legendary ━━━**\n` +
            `👑 \`frey\`           — P10 | 5,000,000/tick · ⭐ 1 per server\n`
        );
    }
};
