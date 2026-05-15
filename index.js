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

/* ================= ALIAS LOADER ================= */
const ALIASES = require("./core/aliases");
for (const [alias, cmdName] of Object.entries(ALIASES)) {
    const cmd = client.commands.get(cmdName);
    if (cmd) {
        client.commands.set(alias, cmd);
        console.log(`🔗 Alias: w${alias} → w${cmdName}`);
    }
}

/* ================= READY ================= */
client.on("clientReady", () => {
    console.log(`🚀 Logged in as ${client.user.tag}`);
    console.log(`📦 Loaded ${client.commands.size} commands (incl. aliases)`);

    // Shadow Broker
    const { startShadowBroker } = require("./core/events");
    startShadowBroker(client);
    console.log("🕵️ Shadow Broker started");

    // Drop event system (wclaim — 10B-600B, max 32/day)
    const { initDropEvents } = require("./core/dropEvents");
    initDropEvents(client);
    console.log("🎁 Drop event system started");
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

/* ================= PASSIVE INCOME ================= */
const ITEM_INCOME = {
    printer:        50,
    factory:        300,
    lab:            1200,
    quantum_core:   5000,
    warehouse:      15000,
    gold_printer:   500,
    ai_factory:     2000,
    dark_lab:       10000,
    gold_mine:      25000,
    diamond_mine:   60000,
    power_plant:    120000,
    oil_refinery:   250000,
    offshore_drill: 500000,
    bank:           1000000,
    oil_rig:        2500000,
    frey:           5000000
};

setInterval(() => {
    console.log("💸 Passive tick");

    db.all(`SELECT * FROM inventory`, [], (err, rows) => {
        if (err || !rows) return;

        rows.forEach(entry => {
            const base = ITEM_INCOME[entry.item];
            if (!base) return;

            const level = entry.level || 1;

            db.get(`SELECT prestige FROM users WHERE user_id=?`, [entry.user_id], (err, user) => {
                if (err || !user) return;

                const bonus  = 1 + (user.prestige * config.prestige.income_bonus_per_level);
                const income = Math.floor(base * level * bonus);

                db.run(
                    `UPDATE users SET pending_income = pending_income + ? WHERE user_id=?`,
                    [income, entry.user_id]
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

/* ================= MEMBER LEAVE - DELETE DATA ================= */
client.on("guildMemberRemove", (member) => {
    const userId = member.id;

    db.serialize(() => {
        db.run(`DELETE FROM users WHERE user_id=?`, [userId], (err) => {
            if (err) {
                console.error(`Error deleting user ${userId}:`, err);
                return;
            }
            console.log(`🗑️ Deleted all data for user ${userId} (${member.user.username})`);
        });

        db.run(`DELETE FROM inventory WHERE user_id=?`,        [userId]);
        db.run(`DELETE FROM skills WHERE user_id=?`,           [userId]);
        db.run(`DELETE FROM fishing_log WHERE user_id=?`,      [userId]);
        db.run(`DELETE FROM duel_log WHERE user_id=?`,         [userId]);
        db.run(`DELETE FROM buffs WHERE user_id=?`,            [userId]);
        db.run(`DELETE FROM shadow_crown_log WHERE user_id=?`, [userId]);
        db.run(`DELETE FROM pets WHERE user_id=?`,             [userId]);
        db.run(`DELETE FROM pet_neglect_log WHERE user_id=?`,  [userId]);
    });
});

/* ================= PET NEGLECT CHECK ================= */
const PET_NEGLECT_TIMEOUT = 24 * 60 * 60 * 1000;
setInterval(() => {
    const now    = Date.now();
    const cutoff = now - PET_NEGLECT_TIMEOUT;

    db.all(
        `SELECT user_id, pet_name, pet_type FROM pets WHERE last_action < ?`,
        [cutoff],
        (err, pets) => {
            if (!pets || pets.length === 0) return;

            pets.forEach(pet => {
                db.run(`DELETE FROM pets WHERE user_id=?`, [pet.user_id], (err) => {
                    if (err) return;

                    db.run(
                        `INSERT INTO pet_neglect_log (user_id, ran_away_at) VALUES (?, ?)
                         ON CONFLICT(user_id) DO UPDATE SET ran_away_at = ?`,
                        [pet.user_id, now, now]
                    );

                    console.log(`💀 Pet "${pet.pet_name}" (${pet.pet_type}) ran away from ${pet.user_id} — 1-week ban applied`);

                    client.users.fetch(pet.user_id).then(user => {
                        user.send(
                            `💀 **Your pet ran away!**\n\n` +
                            `**${pet.pet_name}** left because you didn't care for them for 24 hours.\n\n` +
                            `⏳ You are **banned from adopting** for **7 days**.\n` +
                            `*Next time, feed and play with your pet regularly...*`
                        ).catch(() => {});
                    }).catch(() => {});
                });
            });
        }
    );
}, 600000);


client.login(config.token);
