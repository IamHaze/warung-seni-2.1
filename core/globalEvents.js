const db = require("../database/db");

let globalMultiplier = 1;
let activeEvent = null;

function startGlobalEvents(client, channelId) {
    setInterval(async () => {

        // prevent stacking events
        if (activeEvent) return;

        // 10% chance
        if (Math.random() > 0.10) return;

        const channel = await client.channels.fetch(channelId).catch(() => null);
        if (!channel) return;

        const roll = Math.random();

        if (roll < 0.5) {
            globalMultiplier = 2;
            activeEvent = "🎉 GLOBAL BOOST! All income x2 for 60 seconds!";
        } else {
            globalMultiplier = 0.5;
            activeEvent = "💥 GLOBAL TAX! Income halved for 60 seconds!";
        }

        channel.send(activeEvent);

        setTimeout(() => {
            globalMultiplier = 1;
            activeEvent = null;
            channel.send("⏳ Global event ended");
        }, 60000);

    }, 30000);
}

function getGlobalMultiplier() {
    return globalMultiplier;
}

function getActiveEvent() {
    return activeEvent;
}

module.exports = {
    startGlobalEvents,
    getGlobalMultiplier,
    getActiveEvent
};
