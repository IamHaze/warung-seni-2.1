const db = require("../database/db");

const PET_TYPES = {
    cat: { emoji: "🐱", cost: 10000, description: "Independent & mysterious" },
    dog: { emoji: "🐶", cost: 12000, description: "Loyal & playful" },
    rabbit: { emoji: "🐰", cost: 8000, description: "Cute & quick" },
    dragon: { emoji: "🐉", cost: 50000, description: "Rare & majestic" }
};

const CARE_INTERVAL_HOURS = 6;
const NEGLECT_TIMEOUT_HOURS = 24;

module.exports = {
    name: "pet",
    execute(message, args) {
        const user = message.author.id;
        const action = args[0]?.toLowerCase() || "view";

        if (action === "adopt") {
            adoptPet(user, message, args);
        } else if (action === "view") {
            viewPet(user, message);
        } else if (action === "feed") {
            feedPet(user, message);
        } else if (action === "play") {
            playPet(user, message);
        } else if (action === "list") {
            listPets(message);
        } else if (action === "abandon") {
            abandonPet(user, message);
        } else {
            message.reply(
                `🐾 **Pet Commands**\n\n` +
                `\`wpet view\` - Check your pet's stats\n` +
                `\`wpet list\` - Available pet types\n` +
                `\`wpet adopt <type>\` - Adopt a pet\n` +
                `\`wpet feed\` - Feed your pet (200 coins)\n` +
                `\`wpet play\` - Play with your pet (100 coins)\n` +
                `\`wpet abandon\` - Release your pet`
            );
        }
    }
};

function adoptPet(user, message, args) {
    const petType = args[1]?.toLowerCase();

    if (!petType || !PET_TYPES[petType]) {
        return message.reply(
            `❌ Unknown pet type!\n\n` +
            Object.entries(PET_TYPES)
                .map(([type, data]) => `**${type}** ${data.emoji} - ${data.description} (${data.cost.toLocaleString()} coins)`)
                .join("\n")
        );
    }

    db.get(`SELECT * FROM pets WHERE user_id=?`, [user], (err, existing) => {
        if (existing) {
            return message.reply(`❌ You already have a pet! Use \`wabandon\` first.`);
        }

        db.get(`SELECT wallet FROM users WHERE user_id=?`, [user], (err, row) => {
            if (!row) return message.reply("❌ User error");

            const cost = PET_TYPES[petType].cost;
            if (row.wallet < cost) {
                return message.reply(
                    `❌ Not enough money!\n` +
                    `💸 Cost: **${cost.toLocaleString()}**\n` +
                    `💰 Your wallet: **${row.wallet.toLocaleString()}**`
                );
            }

            const petName = `${petType.charAt(0).toUpperCase() + petType.slice(1)}`;
            const now = Date.now();

            db.run(
                `INSERT INTO pets (user_id, pet_name, pet_type, hunger, happiness, last_fed, last_played, last_action, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [user, petName, petType, 0, 100, now, now, now, now],
                (err) => {
                    if (err) return message.reply("❌ Database error");

                    db.run(`UPDATE users SET wallet = wallet - ? WHERE user_id=?`, [cost, user]);

                    message.reply(
                        `🎉 **Welcome ${petName}!**\n\n` +
                        `${PET_TYPES[petType].emoji} You adopted a **${petType}**!\n` +
                        `💸 Cost: **${cost.toLocaleString()}** coins\n` +
                        `💬 Use \`wpet view\` to check stats\n` +
                        `💬 Use \`wpet feed\` or \`wpet play\` to care for them!`
                    );
                }
            );
        });
    });
}

function viewPet(user, message) {
    db.get(`SELECT * FROM pets WHERE user_id=?`, [user], (err, pet) => {
        if (!pet) {
            return message.reply(
                `🐾 No pet yet!\n\n` +
                `Use \`wpet adopt <type>\` to get one:\n` +
                Object.entries(PET_TYPES)
                    .map(([type, data]) => `**${type}** ${data.emoji}`)
                    .join(", ")
            );
        }

        const now = Date.now();
        const lastAction = pet.last_action || 0;
        const hoursSinceAction = Math.floor((now - lastAction) / (1000 * 60 * 60));

        const hungerLevel = getHungerStatus(pet.hunger);
        const happinessLevel = getHappinessStatus(pet.happiness);

        let status = "🟢 Healthy";
        if (hoursSinceAction > NEGLECT_TIMEOUT_HOURS) {
            status = "💀 Left (neglected)";
        } else if (hoursSinceAction > CARE_INTERVAL_HOURS) {
            status = "😢 Sad (needs care)";
        } else if (pet.hunger > 60) {
            status = "🤢 Hungry";
        }

        message.reply(
            `🐾 **${pet.pet_name}** ${PET_TYPES[pet.pet_type]?.emoji || "🐾"}\n\n` +
            `**Type:** ${pet.pet_type}\n` +
            `**Status:** ${status}\n\n` +
            `**Hunger:** ${hungerLevel} (${pet.hunger}/100)\n` +
            `**Happiness:** ${happinessLevel} (${pet.happiness}/100)\n\n` +
            `⏱️ Last cared for: **${hoursSinceAction}h** ago\n` +
            (hoursSinceAction > CARE_INTERVAL_HOURS ? `⚠️ Your pet needs attention soon!` : `✅ Your pet is happy!`)
        );
    });
}

function feedPet(user, message) {
    const cost = 200;

    db.get(`SELECT * FROM pets WHERE user_id=?`, [user], (err, pet) => {
        if (!pet) return message.reply(`❌ You don't have a pet!`);

        db.get(`SELECT wallet FROM users WHERE user_id=?`, [user], (err, row) => {
            if (!row || row.wallet < cost) {
                return message.reply(
                    `❌ Not enough money!\n` +
                    `💸 Cost: **${cost.toLocaleString()}** coins`
                );
            }

            const now = Date.now();
            const newHunger = Math.max(0, pet.hunger - 40);
            const newHappiness = Math.min(100, pet.happiness + 5);

            db.run(
                `UPDATE pets SET hunger=?, happiness=?, last_fed=?, last_action=? WHERE user_id=?`,
                [newHunger, newHappiness, now, now, user]
            );

            db.run(`UPDATE users SET wallet = wallet - ? WHERE user_id=?`, [cost, user]);

            message.reply(
                `😋 **${pet.pet_name}** enjoyed the meal!\n\n` +
                `🍖 Hunger: ${pet.hunger} → ${newHunger}\n` +
                `😊 Happiness: ${pet.happiness} → ${newHappiness}\n` +
                `💸 Cost: **${cost.toLocaleString()}** coins`
            );
        });
    });
}

function playPet(user, message) {
    const cost = 100;

    db.get(`SELECT * FROM pets WHERE user_id=?`, [user], (err, pet) => {
        if (!pet) return message.reply(`❌ You don't have a pet!`);

        db.get(`SELECT wallet FROM users WHERE user_id=?`, [user], (err, row) => {
            if (!row || row.wallet < cost) {
                return message.reply(
                    `❌ Not enough money!\n` +
                    `💸 Cost: **${cost.toLocaleString()}** coins`
                );
            }

            const now = Date.now();
            const activities = ["fetch", "tag", "dance", "jump"];
            const activity = activities[Math.floor(Math.random() * activities.length)];

            const hunger = Math.min(100, pet.hunger + 10);
            const happiness = Math.min(100, pet.happiness + 25);

            db.run(
                `UPDATE pets SET hunger=?, happiness=?, last_played=?, last_action=? WHERE user_id=?`,
                [hunger, happiness, now, now, user]
            );

            db.run(`UPDATE users SET wallet = wallet - ? WHERE user_id=?`, [cost, user]);

            message.reply(
                `🎮 **${pet.pet_name}** played ${activity} with you!\n\n` +
                `😄 Happiness: ${pet.happiness} → ${happiness}\n` +
                `🍖 Hunger: ${pet.hunger} → ${hunger}\n` +
                `💸 Cost: **${cost.toLocaleString()}** coins`
            );
        });
    });
}

function abandonPet(user, message) {
    db.get(`SELECT pet_name FROM pets WHERE user_id=?`, [user], (err, pet) => {
        if (!pet) return message.reply(`❌ You don't have a pet!`);

        db.run(`DELETE FROM pets WHERE user_id=?`, [user], (err) => {
            if (err) return message.reply("❌ Database error");

            message.reply(`😢 **${pet.pet_name}** has left sadly...`);
        });
    });
}

function listPets(message) {
    const petList = Object.entries(PET_TYPES)
        .map(([type, data]) => `${data.emoji} **${type}** - ${data.description}\n   💰 ${data.cost.toLocaleString()} coins`)
        .join("\n");

    message.reply(
        `🐾 **Available Pets**\n\n` +
        petList +
        `\n\nUse \`wpet adopt <type>\` to get a pet!`
    );
}

function getHungerStatus(hunger) {
    if (hunger <= 20) return "😋 Full";
    if (hunger <= 50) return "😊 Content";
    if (hunger <= 80) return "😐 Peckish";
    return "🤢 Starving";
}

function getHappinessStatus(happiness) {
    if (happiness >= 80) return "😄 Thrilled";
    if (happiness >= 50) return "😊 Happy";
    if (happiness >= 25) return "😐 Okay";
    return "😢 Sad";
}
