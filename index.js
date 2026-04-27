const { Client, GatewayIntentBits } = require("discord.js");
const fs = require("fs");
const path = require("path");
const config = require("./config.json");
const db = require("./database/db");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.commands = new Map();

/* ================= COMMAND LOADER ================= */
function loadCommands(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            loadCommands(fullPath);
        } else if (file.endsWith(".js")) {
            const command = require(fullPath);
            if (!command.name || !command.execute) {
                console.log(`❌ Skipping invalid command file: ${file}`);
                continue;
            }
            client.commands.set(command.name, command);
            console.log(`✅ Loaded command: ${command.name}`);
        }
    }
}

loadCommands(path.join(__dirname, "commands"));

/* ================= READY ================= */
client.on("clientReady", () => {
    console.log(`🚀 Logged in as ${client.user.tag}`);
    console.log(`📦 Loaded ${client.commands.size} commands`);

    // ✅ Start events AFTER bot is ready and client is available
    const { startEvents } = require("./core/events");
    startEvents(client);
    console.log("🎲 Event system started");
});

/* ================= MESSAGE ================= */
client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith(config.prefix)) return;

    const args = message.content.slice(config.prefix.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();

    const command = client.commands.get(cmd);
    if (!command) return;

    try {
        command.execute(message, args);
    } catch (err) {
        console.error("Command error:", err);
        message.reply("❌ Error executing command");
    }
});

/* ================= PASSIVE INCOME (every 10 mins) ================= */
const MAX_PENDING_INCOME = 100000000; // 100M cap per tick
setInterval(() => {
    console.log("💸 Passive tick");

    db.all(`SELECT * FROM inventory`, [], (err, rows) => {
        if (err || !rows) return;

        rows.forEach(entry => {
            const itemData = config.items[entry.item];
            if (!itemData || !itemData.income) return;

            const level = entry.level || 1;

            db.get(`SELECT prestige, pending_income FROM users WHERE user_id=?`, [entry.user_id], (err, user) => {
                if (err || !user) return;

                const bonus = 1 + (user.prestige * config.prestige.income_bonus_per_level);
                const income = Math.floor(itemData.income * level * bonus);
                const newPending = Math.min((user.pending_income || 0) + income, MAX_PENDING_INCOME);

                db.run(
                    `UPDATE users SET pending_income = ? WHERE user_id=?`,
                    [newPending, entry.user_id]
                );
            });
        });
    });
}, 600000);

/* ================= SHADOW CROWN EXPIRY CLEANUP ================= */
const CROWN_EXPIRY = 24 * 60 * 60 * 1000;
setInterval(() => {
    const expiryCutoff = Date.now() - CROWN_EXPIRY;
    db.all(
        `SELECT user_id, level FROM inventory WHERE item='shadow_crown'`,
        [],
        (err, rows) => {
            if (!rows) return;
            rows.forEach(row => {
                if (row.level && row.level < expiryCutoff) {
                    db.run(`DELETE FROM inventory WHERE user_id=? AND item='shadow_crown'`, [row.user_id]);
                    db.run(
                        `INSERT INTO shadow_crown_log (user_id, used_at) VALUES (?, ?)
                         ON CONFLICT(user_id) DO UPDATE SET used_at = ?`,
                        [row.user_id, Date.now(), Date.now()]
                    );
                    console.log(`👑 Shadow Crown expired for ${row.user_id}`);
                }
            });
        }
    );
}, 300000);

/* ================= HEAT DECAY ================= */
setInterval(() => {
    db.run(`
        UPDATE users
        SET heat = CASE
            WHEN heat > 0 THEN heat - 1
            ELSE 0
        END
    `);
    console.log("🚓 Heat cooled down");
}, 300000);

/* ================= AI ROB SYSTEM — Every 30 mins ================= */
setInterval(() => {
    db.all(`SELECT user_id, wallet FROM users WHERE wallet > 1000 LIMIT 1`, [], (err, users) => {
        if (err || !users || users.length === 0) return;

        const victim = users[0];
        const robAmount = Math.floor(victim.wallet * (Math.random() * 0.3 + 0.1));

        db.run(`UPDATE users SET wallet = wallet - ? WHERE user_id=?`, [robAmount, victim.user_id]);

        const eventChannel = client.channels.cache.get(config.eventChannel);
        if (eventChannel) {
            eventChannel.send(
                `🤖 **AI ROB ATTEMPT!**\n\n` +
                `<@${victim.user_id}> was targeted by a rogue AI!\n` +
                `💸 Stolen: **${robAmount}** coins\n\n` +
                `⚔️ **FIGHT BACK?** Type \`wfight\` to counter-attack the AI and reclaim your coins!`
            ).catch(() => {});

            client.users.fetch(victim.user_id).then(u => {
                u.send(
                    `🤖 **YOU WERE ROBBED BY AN AI!**\n\n` +
                    `💸 Lost: **${robAmount}** coins\n` +
                    `🛡️ You have **5 minutes** to fight back!\n\n` +
                    `Type \`wfight\` in any server to counter-attack!`
                ).catch(() => {});
            }).catch(() => {});

            db.run(
                `INSERT INTO ai_rob_log (user_id, amount, time) VALUES (?, ?, ?)
                 ON CONFLICT(user_id) DO UPDATE SET amount = ?, time = ?`,
                [victim.user_id, robAmount, Date.now(), robAmount, Date.now()]
            );
        }
    });
}, 1800000);

client.login(config.token);
