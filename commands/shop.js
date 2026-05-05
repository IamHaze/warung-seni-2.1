module.exports = {
    name: "shop",
    execute(message) {
        message.reply(
            `🛒 **ITEM SHOP** — \`wbuy <item> [qty]\`\n\n` +

            `**━━━ 💼 Income Items ━━━**\n` +
            `🖨️ \`printer\`       — 💰 1,000     | 50/tick\n` +
            `🏭 \`factory\`       — 💰 5,000     | 300/tick\n` +
            `🔬 \`lab\`           — 💰 20,000    | 1,200/tick\n` +
            `⚛️ \`quantum_core\`  — 💰 100,000   | 5,000/tick\n` +
            `🏗️ \`warehouse\`     — 💰 350,000   | 15,000/tick\n\n` +

            `**━━━ ⚔️ Attack Items ━━━**\n` +
            `🔑 \`lockpick\`      — 💰 500       | Required to rob\n` +
            `💻 \`hacker_kit\`    — 💰 2,000     | +15% rob success\n` +
            `⚡ \`emp_device\`    — 💰 5,000     | Bypass all defenses\n` +
            `🚗 \`getaway_car\`   — 💰 3,000     | -50% fine if caught\n\n` +

            `**━━━ 🛡️ Defense Items ━━━**\n` +
            `🐕 \`guard_dog\`     — 💰 3,000     | 25% block rob\n` +
            `🔒 \`safe\`          — 💰 5,000     | Protects 5,000 coins\n` +
            `🚨 \`alarm\`         — 💰 2,000     | DM alert on rob\n` +
            `🏛️ \`vault\`         — 💰 20,000    | Blocks 40% stolen\n\n` +

            `**━━━ 🎣 Fishing Gear ━━━**\n` +
            `🎋 \`bamboo_rod\`    — 💰 500       | Basic rod\n` +
            `⚙️ \`iron_rod\`      — 💰 2,000     | +5% catch rate\n` +
            `✨ \`golden_rod\`    — 💰 8,000     | +12% rarity bonus\n` +
            `💎 \`crystal_rod\`   — 💰 25,000    | 30% double catch chance\n` +
            `🪱 \`worm_bait\`     — 💰 300      | +7% catch bonus (consumable)\n` +
            `✨ \`magic_bait\`    — 💰 1,200     | +10% catch & +20% rarity\n\n` +

            `**━━━ 🎲 Consumables ━━━**\n` +
            `🍀 \`lucky_charm\`   — 💰 1,500     | +10% gamble luck (1 use)\n` +
            `⚡ \`energy_drink\`  — 💰 3,000     | Skip next cooldown (1 use)\n` +
            `🎟️ \`lottery_ticket\`— 💰 500       | Scratch for random prize\n\n` +

            `**━━━ 👑 Legendary ━━━**\n` +
            `👑 \`shadow_crown\`  — 💰 5,000,000 | 1 per server · 24hr expiry\n` +
            `                      Steal ALL coins & items from any player\n\n` +

            `🌟 Prestige items → \`wpshop\``
        );
    }
};
