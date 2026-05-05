const db = require("../database/db");

const NEGLECT_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 1 week

const PET_TYPES = {
    // ── Starter Tier ──
    hamster:  { emoji: "🐹", cost: 3_000,   description: "Tiny & energetic" },
    rabbit:   { emoji: "🐰", cost: 8_000,   description: "Cute & quick" },
    fish:     { emoji: "🐠", cost: 8_000,   description: "Calm & colourful" },
    cat:      { emoji: "🐱", cost: 10_000,  description: "Independent & mysterious" },
    dog:      { emoji: "🐶", cost: 12_000,  description: "Loyal & playful" },
    // ── Mid Tier ──
    parrot:   { emoji: "🦜", cost: 18_000,  description: "Chatty & clever" },
    fox:      { emoji: "🦊", cost: 25_000,  description: "Cunning & sly" },
    owl:      { emoji: "🦉", cost: 30_000,  description: "Wise & nocturnal" },
    penguin:  { emoji: "🐧", cost: 35_000,  description: "Clumsy & adorable" },
    bear:     { emoji: "🐻", cost: 45_000,  description: "Powerful & gentle" },
    // ── Rare Tier ──
    wolf:     { emoji: "🐺", cost: 60_000,  description: "Wild & fierce" },
    panda:    { emoji: "🐼", cost: 75_000,  description: "Rare & peaceful" },
    // ── Legendary Tier ──
    dragon:   { emoji: "🐉", cost: 150_000, description: "Majestic & ancient" },
    phoenix:  { emoji: "🔥", cost: 200_000, description: "Reborn from ashes" },
    unicorn:  { emoji: "🦄", cost: 300_000, description: "Pure & mythical" },
};

const CARE_INTERVAL_HOURS = 6;
const NEGLECT_TIMEOUT_HOURS = 24;

module.exports = {
    name: "pet",
    execute(message, args) {
        const user = message.author.id;
        const action = args[0]?.toLowerCase() || "view";

        if (action === "adopt")    return adoptPet(user, message, args);
        if (action === "view")     return viewPet(user, message);
        if (action === "feed")     return feedPet(user, message);
        if (action === "play")     return playPet(user, message);
        if (action === "list")     return listPets(message);
        if (action === "abandon")  return abandonPet(user, message);

        message.reply(
            `🐾 **Pet Commands**\n\n` +
            `\`wpet view\`          — Check your pet's stats\n` +
            `\`wpet list\`          — Browse all adoptable pets\n` +
            `\`wpet adopt <type>\`  — Adopt a pet\n` +
            `\`wpet feed\`          — Feed your pet (200 coins)\n` +
            `\`wpet play\`          — Play with your pet (100 coins)\n` +
            `\`wpet abandon\`       — Release your pet`
        );
    }
};

// ─────────────────────────────────────────
//  ADOPT
// ─────────────────────────────────────────
function adoptPet(user, message, args) {
    const petType = args[1]?.toLowerCase();

    if (!petType || !PET_TYPES[petType]) {
        const list = Object.entries(PET_TYPES)
            .map(([t, d]) => `${d.emoji} **${t}** — ${d.description} (${d.cost.toLocaleString()} coins)`)
            .join("\n");
        return message.reply(`❌ Unknown pet type!\n\n${list}`);
    }

    // 1️⃣ Neglect cooldown check
    db.get(`SELECT ran_away_at FROM pet_neglect_log WHERE user_id=?`, [user], (err, log) => {
        if (log && Date.now() - log.ran_away_at < NEGLECT_COOLDOWN_MS) {
            const daysLeft = Math.ceil((NEGLECT_COOLDOWN_MS - (Date.now() - log.ran_away_at)) / (24 * 60 * 60 * 1000));
            return message.reply(
                `💀 **Adoption Banned!**\n\n` +
                `Your last pet ran away because you neglected it.\n` +
                `⏳ You must wait **${daysLeft}** more day(s) before adopting again.\n` +
                `*Take better care of your pets next time...*`
            );
        }

        // 2️⃣ Already owns a pet?
        db.get(`SELECT * FROM pets WHERE user_id=?`, [user], (err, existing) => {
            if (existing) {
                return message.reply(`❌ You already have a pet! Use \`wpet abandon\` first.`);
            }

            // 3️⃣ Wallet check
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

                const petName = petType.charAt(0).toUpperCase() + petType.slice(1);
                const now = Date.now();

                db.run(
                    `INSERT INTO pets (user_id, pet_name, pet_type, hunger, happiness, last_fed, last_played, last_action, created_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [user, petName, petType, 0, 100, now, now, now, now],
                    (err) => {
                        if (err) return message.reply("❌ Database error");

                        db.run(`UPDATE users SET wallet = wallet - ? WHERE user_id=?`, [cost, user]);

                        // Clear any old neglect log on fresh adoption
                        db.run(`DELETE FROM pet_neglect_log WHERE user_id=?`, [user]);

                        message.reply(
                            `🎉 **Welcome ${petName}!**\n\n` +
                            `${PET_TYPES[petType].emoji} You adopted a **${petType}**!\n` +
                            `💸 Cost: **${cost.toLocaleString()}** coins\n\n` +
                            `💬 Use \`wpet view\` to check stats\n` +
                            `⚠️ Feed & play every **${CARE_INTERVAL_HOURS}h** or your pet will leave!`
                        );
                    }
                );
            });
        });
    });
}

// ─────────────────────────────────────────
//  VIEW
// ─────────────────────────────────────────
function viewPet(user, message) {
    db.get(`SELECT * FROM pets WHERE user_id=?`, [user], (err, pet) => {
        if (!pet) {
            // Check if banned
            db.get(`SELECT ran_away_at FROM pet_neglect_log WHERE user_id=?`, [user], (err, log) => {
                if (log && Date.now() - log.ran_away_at < NEGLECT_COOLDOWN_MS) {
                    const daysLeft = Math.ceil((NEGLECT_COOLDOWN_MS - (Date.now() - log.ran_away_at)) / (24 * 60 * 60 * 1000));
                    return message.reply(
                        `🐾 No pet.\n\n` +
                        `💀 Adoption ban active — **${daysLeft}** day(s) remaining.\n` +
                        `*You neglected your last pet...*`
                    );
                }
                return message.reply(
                    `🐾 No pet yet!\n\n` +
                    `Use \`wpet list\` to browse available pets, then \`wpet adopt <type>\``
                );
            });
            return;
        }

        const now = Date.now();
        const hoursSinceAction = Math.floor((now - (pet.last_action || 0)) / 3_600_000);
        const hungerLevel  = getHungerStatus(pet.hunger);
        const happyLevel   = getHappinessStatus(pet.happiness);

        let status = "🟢 Healthy";
        if (hoursSinceAction > NEGLECT_TIMEOUT_HOURS) status = "💀 Critically neglected!";
        else if (hoursSinceAction > CARE_INTERVAL_HOURS) status = "😢 Sad (needs care)";
        else if (pet.hunger > 60) status = "🤢 Hungry";

        const typeData = PET_TYPES[pet.pet_type];

        message.reply(
            `${typeData?.emoji || "🐾"} **${pet.pet_name}** (${pet.pet_type})\n\n` +
            `**Status:** ${status}\n` +
            `**Hunger:** ${hungerLevel} (${pet.hunger}/100)\n` +
            `**Happiness:** ${happyLevel} (${pet.happiness}/100)\n\n` +
            `⏱️ Last cared for: **${hoursSinceAction}h** ago\n` +
            (hoursSinceAction > CARE_INTERVAL_HOURS
                ? `⚠️ **Your pet needs attention soon!**`
                : `✅ Your pet is happy!`)
        );
    });
}

// ─────────────────────────────────────────
//  FEED
// ─────────────────────────────────────────
function feedPet(user, message) {
    const cost = 200;

    db.get(`SELECT * FROM pets WHERE user_id=?`, [user], (err, pet) => {
        if (!pet) return message.reply(`❌ You don't have a pet! Use \`wpet adopt <type>\``);

        db.get(`SELECT wallet FROM users WHERE user_id=?`, [user], (err, row) => {
            if (!row || row.wallet < cost) {
                return message.reply(`❌ Not enough money!\n💸 Cost: **${cost}** coins`);
            }

            const now = Date.now();
            const newHunger    = Math.max(0, pet.hunger - 40);
            const newHappiness = Math.min(100, pet.happiness + 5);

            db.run(`UPDATE pets SET hunger=?, happiness=?, last_fed=?, last_action=? WHERE user_id=?`,
                [newHunger, newHappiness, now, now, user]);
            db.run(`UPDATE users SET wallet = wallet - ? WHERE user_id=?`, [cost, user]);

            message.reply(
                `😋 **${pet.pet_name}** enjoyed the meal!\n\n` +
                `🍖 Hunger: ${pet.hunger} → ${newHunger}\n` +
                `😊 Happiness: ${pet.happiness} → ${newHappiness}\n` +
                `💸 Cost: **${cost}** coins`
            );
        });
    });
}

// ─────────────────────────────────────────
//  PLAY
// ─────────────────────────────────────────
function playPet(user, message) {
    const cost = 100;

    db.get(`SELECT * FROM pets WHERE user_id=?`, [user], (err, pet) => {
        if (!pet) return message.reply(`❌ You don't have a pet! Use \`wpet adopt <type>\``);

        db.get(`SELECT wallet FROM users WHERE user_id=?`, [user], (err, row) => {
            if (!row || row.wallet < cost) {
                return message.reply(`❌ Not enough money!\n💸 Cost: **${cost}** coins`);
            }

            const now = Date.now();
            const activities = {
                hamster: ["runs on its wheel", "stuffs its cheeks"],
                rabbit:  ["hops around", "binkies happily"],
                fish:    ["blows bubbles at you", "does a little lap"],
                cat:     ["knocks things off shelves", "sits on your keyboard"],
                dog:     ["fetches the ball", "zooms around the room"],
                parrot:  ["says a new word", "dances on your shoulder"],
                fox:     ["pounces on leaves", "somersaults"],
                owl:     ["hoots dramatically", "spins its head around"],
                penguin: ["waddles after you", "slides on its belly"],
                bear:    ["play-wrestles", "does a bear hug"],
                wolf:    ["howls at the moon", "chases its tail"],
                panda:   ["rolls around", "eats imaginary bamboo"],
                dragon:  ["breathes a small flame", "flaps its wings"],
                phoenix: ["creates a burst of sparks", "spins in a circle of light"],
                unicorn: ["gallops across rainbows", "makes flowers bloom"],
            };

            const petActivities = activities[pet.pet_type] || ["plays with you", "jumps around"];
            const activity = petActivities[Math.floor(Math.random() * petActivities.length)];

            const hunger      = Math.min(100, pet.hunger + 10);
            const happiness   = Math.min(100, pet.happiness + 25);

            db.run(`UPDATE pets SET hunger=?, happiness=?, last_played=?, last_action=? WHERE user_id=?`,
                [hunger, happiness, now, now, user]);
            db.run(`UPDATE users SET wallet = wallet - ? WHERE user_id=?`, [cost, user]);

            const typeData = PET_TYPES[pet.pet_type];
            message.reply(
                `${typeData?.emoji || "🐾"} **${pet.pet_name}** ${activity}!\n\n` +
                `😄 Happiness: ${pet.happiness} → ${happiness}\n` +
                `🍖 Hunger: ${pet.hunger} → ${hunger}\n` +
                `💸 Cost: **${cost}** coins`
            );
        });
    });
}

// ─────────────────────────────────────────
//  ABANDON
// ─────────────────────────────────────────
function abandonPet(user, message) {
    db.get(`SELECT pet_name, pet_type FROM pets WHERE user_id=?`, [user], (err, pet) => {
        if (!pet) return message.reply(`❌ You don't have a pet!`);

        db.run(`DELETE FROM pets WHERE user_id=?`, [user], (err) => {
            if (err) return message.reply("❌ Database error");
            const typeData = PET_TYPES[pet.pet_type];
            message.reply(`😢 **${pet.pet_name}** ${typeData?.emoji || "🐾"} has left sadly...`);
        });
    });
}

// ─────────────────────────────────────────
//  LIST
// ─────────────────────────────────────────
function listPets(message) {
    const tiers = [
        { label: "🟢 Starter",   pets: ["hamster","rabbit","fish","cat","dog"] },
        { label: "🔵 Mid",       pets: ["parrot","fox","owl","penguin","bear"] },
        { label: "🟣 Rare",      pets: ["wolf","panda"] },
        { label: "🟡 Legendary", pets: ["dragon","phoenix","unicorn"] },
    ];

    let msg = `🐾 **Available Pets** — \`wpet adopt <type>\`\n\n`;

    for (const tier of tiers) {
        msg += `**${tier.label}**\n`;
        for (const t of tier.pets) {
            const d = PET_TYPES[t];
            msg += `${d.emoji} \`${t}\` — ${d.description} · **${d.cost.toLocaleString()}** coins\n`;
        }
        msg += "\n";
    }

    message.reply(msg);
}

// ─────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────
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

// Export PET_TYPES so index.js neglect handler can use it if needed
module.exports.PET_TYPES = PET_TYPES;
