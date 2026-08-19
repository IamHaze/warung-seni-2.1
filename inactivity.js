const db = require("../../database/db");
const isAdmin = require("../../utils/isAdmin");
const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    AttachmentBuilder
} = require("discord.js");

function csvEscape(val) {
    const str = String(val ?? "");
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

function buildCSV(list) {
    const header = "Rank,Username,User ID,Message Count,Last Seen (UTC),Last Seen (Unix ms)\n";
    const rows = list.map((u, i) => {
        const lastSeenUTC = u.lastMessage ? new Date(u.lastMessage).toISOString() : "Never spoken";
        const lastSeenUnix = u.lastMessage || "";
        return [
            i + 1,
            csvEscape(u.username),
            u.id,
            u.messageCount,
            lastSeenUTC,
            lastSeenUnix
        ].join(",");
    });
    return header + rows.join("\n");
}

function buildTXT(list, guildName) {
    const lines = [
        `Inactivity Report — ${guildName}`,
        `Generated: ${new Date().toISOString()}`,
        `Total members tracked: ${list.length}`,
        "=".repeat(50),
        ""
    ];

    list.forEach((u, i) => {
        const lastSeen = u.lastMessage
            ? new Date(u.lastMessage).toISOString()
            : "Never spoken (tracked)";
        lines.push(`#${i + 1}  ${u.username} (${u.id})`);
        lines.push(`    Messages: ${u.messageCount} | Last seen: ${lastSeen}`);
        lines.push("");
    });

    return lines.join("\n");
}

module.exports = {
    name: "inactivity",
    async execute(message) {
        if (!isAdmin(message.author.id)) {
            return message.reply("❌ No permission");
        }

        const guild = message.guild;
        if (!guild) return message.reply("❌ This command only works in a server");

        const loadingMsg = await message.reply("🔍 Scanning member activity, this may take a moment...");

        async function buildList() {
            let members;
            try {
                members = await guild.members.fetch();
            } catch (err) {
                console.error("Member fetch error:", err);
                return null;
            }

            const rows = await new Promise(resolve => {
                db.all(`SELECT * FROM activity_log`, [], (err, rows) => resolve(rows || []));
            });

            const activityMap = new Map();
            rows.forEach(r => activityMap.set(r.user_id, r));

            return members
                .filter(m => !m.user.bot)
                .map(m => {
                    const a = activityMap.get(m.id);
                    return {
                        id: m.id,
                        username: m.user.username,
                        messageCount: a?.message_count || 0,
                        lastMessage: a?.last_message_at || null
                    };
                })
                .sort((a, b) => {
                    if (!a.lastMessage && !b.lastMessage) return a.messageCount - b.messageCount;
                    if (!a.lastMessage) return -1;
                    if (!b.lastMessage) return 1;
                    return a.lastMessage - b.lastMessage;
                });
        }

        let list = await buildList();
        if (!list) {
            return loadingMsg.edit(
                "❌ Couldn't fetch the member list.\n" +
                "Make sure **Server Members Intent** is enabled in the Discord Developer Portal " +
                "(Bot page → Privileged Gateway Intents)."
            );
        }

        const pageSize = 10;
        let page = 0;

        function totalPages() {
            return Math.max(1, Math.ceil(list.length / pageSize));
        }

        function buildPage(p) {
            const tp = totalPages();
            const slice = list.slice(p * pageSize, p * pageSize + pageSize);
            let msg = `📊 **Least Active Members** — Page ${p + 1}/${tp}\n\n`;

            slice.forEach((u, i) => {
                const rank = p * pageSize + i + 1;
                const lastSeen = u.lastMessage
                    ? `<t:${Math.floor(u.lastMessage / 1000)}:R>`
                    : "**never spoken (tracked)**";

                msg += `**#${rank}** <@${u.id}>\n`;
                msg += `　💬 Messages: **${u.messageCount}** | 🕒 Last seen: ${lastSeen}\n`;
            });

            msg += `\n📈 Total members tracked: **${list.length}**`;
            msg += `\n⚠️ Tracking only covers activity since this feature was installed.`;
            msg += `\n🔄 Data as of <t:${Math.floor(Date.now() / 1000)}:R>`;
            return msg;
        }

        function buildRows(p) {
            const tp = totalPages();
            const navRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("inact_first").setLabel("⏮ First").setStyle(ButtonStyle.Secondary).setDisabled(p === 0),
                new ButtonBuilder().setCustomId("inact_prev").setLabel("◀ Prev").setStyle(ButtonStyle.Secondary).setDisabled(p === 0),
                new ButtonBuilder().setCustomId("inact_next").setLabel("Next ▶").setStyle(ButtonStyle.Primary).setDisabled(p >= tp - 1),
                new ButtonBuilder().setCustomId("inact_last").setLabel("Last ⏭").setStyle(ButtonStyle.Secondary).setDisabled(p >= tp - 1),
                new ButtonBuilder().setCustomId("inact_refresh").setLabel("🔄 Refresh").setStyle(ButtonStyle.Success)
            );
            const exportRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("inact_export_csv").setLabel("📄 Export CSV").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId("inact_export_txt").setLabel("📄 Export TXT").setStyle(ButtonStyle.Secondary)
            );
            return [navRow, exportRow];
        }

        const sentMsg = await loadingMsg.edit({ content: buildPage(page), components: buildRows(page) });

        const collector = sentMsg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            idle: 300000,   // ends after 5 min of no clicks
            time: 1800000   // hard cap of 30 min regardless of activity
        });

        collector.on("collect", async interaction => {
            if (interaction.user.id !== message.author.id) {
                return interaction.reply({ content: "❌ Not your report", flags: 64 });
            }

            const tp = totalPages();

            if (interaction.customId === "inact_first") page = 0;
            if (interaction.customId === "inact_prev")  page = Math.max(0, page - 1);
            if (interaction.customId === "inact_next")  page = Math.min(tp - 1, page + 1);
            if (interaction.customId === "inact_last")  page = tp - 1;

            if (interaction.customId === "inact_refresh") {
                await interaction.deferUpdate();
                const fresh = await buildList();
                if (fresh) {
                    list = fresh;
                    page = Math.min(page, totalPages() - 1);
                }
                return interaction.editReply({ content: buildPage(page), components: buildRows(page) });
            }

            if (interaction.customId === "inact_export_csv") {
                await interaction.deferReply({ flags: 64 });
                const csv = buildCSV(list);
                const file = new AttachmentBuilder(Buffer.from(csv, "utf-8"), {
                    name: `inactivity-report-${Date.now()}.csv`
                });
                return interaction.editReply({ content: `📄 Full report (${list.length} members):`, files: [file] });
            }

            if (interaction.customId === "inact_export_txt") {
                await interaction.deferReply({ flags: 64 });
                const txt = buildTXT(list, guild.name);
                const file = new AttachmentBuilder(Buffer.from(txt, "utf-8"), {
                    name: `inactivity-report-${Date.now()}.txt`
                });
                return interaction.editReply({ content: `📄 Full report (${list.length} members):`, files: [file] });
            }

            await interaction.update({ content: buildPage(page), components: buildRows(page) });
        });

        collector.on("end", () => {
            sentMsg.edit({ components: [] }).catch(() => {});
        });
    }
};
