const cooldowns = new Map();

function checkCooldown(user, command, time) {
    const key = `${user}-${command}`;
    const now = Date.now();

    if (cooldowns.has(key)) {
        const expire = cooldowns.get(key);
        if (now < expire) {
            return Math.ceil((expire - now) / 1000);
        }
    }

    cooldowns.set(key, now + time);
    return 0;
}

module.exports = { checkCooldown };
