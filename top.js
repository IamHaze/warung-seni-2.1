const db = require("../database/db");
const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType
} = require("discord.js");

module.exports = {
    name: "top",
    async execute(message) {
        db.all(
            `SELECT user_id, wallet, bank
             FROM users
             ORDER BY (wallet + bank) DESC
             LIMIT 100`,
            [],
            async (err, rows) => {
                if (!rows || rows.length === 0) {
                    return message.reply("No players found.");
                }

                const pageSize = 10;
                let page = 0;
                const totalPages = Math.ceil(rows.length / pageSize);

                async function generatePage(page) {
                    const start = page * pageSize;
                    const slice = rows.slice(start, start + pageSize);

                    const medals = ["🥇", "🥈", "🥉"];
                    const rankEmoji = (i) => medals[i] || `✦`;

                    // Fetch all usernames first
                    const entries = await Promise.all(slice.map(async (u, i) => {
                        let username = "Unknown";
                        try {
                            const fetched = await message.client.users.fetch(u.user_id);
                            username = fetched.username;
                        } catch {}
                        return { u, i, username };
                    }));

                    const divider = `┣━━━━━━━━━━━━━━━━━━━━━━━┫`;
                    const top    = `┏━━━━━━━━━━━━━━━━━━━━━━━┓`;
                    const bottom = `┗━━━━━━━━━━━━━━━━━━━━━━━┛`;

                    let msg = `${top}\n`;
                    msg += `┃  🏆 **GLOBAL LEADERBOARD**  ┃\n`;
                    msg += `┃   📄 Page ${page + 1} of ${totalPages}            ┃\n`;
                    msg += `${divider}\n`;

                    for (const { u, i, username } of entries) {
                        const rank = start + i + 1;
                        const total = (u.wallet + u.bank).toLocaleString();
                        const wallet = u.wallet.toLocaleString();
                        const bank = u.bank.toLocaleString();
                        const icon = rankEmoji(start + i);

                        msg += `┃ ${icon} **#${rank} ${username}**\n`;
                        msg += `┃ 💰 \`${wallet}\`\n`;
                        msg += `┃ 🏦 \`${bank}\`\n`;
                        msg += `┃ 💎 **Total: ${total}**\n`;

                        if (i < slice.length - 1) msg += `${divider}\n`;
                    }

                    msg += `\n${bottom}`;
                    return msg;
                }

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId("prev")
                        .setLabel("⬅️ Prev")
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId("next")
                        .setLabel("Next ➡️")
                        .setStyle(ButtonStyle.Primary)
                );

                const msg = await message.reply({
                    content: await generatePage(page),
                    components: [row]
                });

                const collector = msg.createMessageComponentCollector({
                    componentType: ComponentType.Button,
                    time: 60000
                });

                collector.on("collect", async interaction => {
                    if (interaction.user.id !== message.author.id) {
                        return interaction.reply({
                            content: "❌ Not your leaderboard",
                            flags: 64
                        });
                    }

                    if (interaction.customId === "next" && page < totalPages - 1) page++;
                    if (interaction.customId === "prev" && page > 0) page--;

                    await interaction.update({
                        content: await generatePage(page),
                        components: [row]
                    });
                });

                collector.on("end", () => {
                    msg.edit({ components: [] }).catch(() => {});
                });
            }
        );
    }
};
