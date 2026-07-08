/**
 * dropEvents.js
 * Manages random money drops in the configured drop channel.
 *
 * - Max 32 spawns per day (resets at midnight MYT)
 * - Random amount: 10B – 600B
 * - Random spawn interval: 20–60 min between drops
 * - Drop expires after 10 minutes if unclaimed
 * - Only ONE active drop at a time
 *
 * Setup in index.js (after client is ready):
 *   const { initDropEvents } = require('./core/dropEvents');
 *   client.once('ready', () => initDropEvents(client));
 *
 * config.json must have:
 *   "dropChannelId": "YOUR_CHANNEL_ID_HERE"
 */

const db     = require("../database/db");
const config = require("../config.json");
const { getMYTDayKey } = require("./timezone");

const DROP_MIN      = 10_000_000_000;   // 10 Billion
const DROP_MAX      = 600_000_000_000;  // 600 Billion
const MAX_PER_DAY   = 32;
const EXPIRE_MS     = 10 * 60 * 1000;  // 10 minutes
const MIN_WAIT_MS   = 20 * 60 * 1000;  // 20 minutes minimum between drops
const MAX_WAIT_MS   = 60 * 60 * 1000;  // 60 minutes maximum between drops

// In-memory active drop — cleared immediately on claim or expiry
let activeDrop = null; // { id, amount, expiresAt }

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(n) {
    if (n >= 1e12) return (n / 1e12).toFixed(1).replace(/\.0$/, "") + "T";
    if (n >= 1e9)  return (n / 1e9).toFixed(1).replace(/\.0$/, "")  + "B";
    if (n >= 1e6)  return (n / 1e6).toFixed(1).replace(/\.0$/, "")  + "M";
    if (n >= 1e3)  return (n / 1e3).toFixed(1).replace(/\.0$/, "")  + "K";
    return n.toLocaleString();
}

function getDayKey() {
    return getMYTDayKey().toString();
}

function getRandomAmount() {
    return Math.floor(Math.random() * (DROP_MAX - DROP_MIN + 1)) + DROP_MIN;
}

function getRandomWait() {
    return Math.floor(Math.random() * (MAX_WAIT_MS - MIN_WAIT_MS)) + MIN_WAIT_MS;
}

// ── DB init ────────────────────────────────────────────────────────────────────

function initDropTable() {
    db.run(`
        CREATE TABLE IF NOT EXISTS drop_events (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            amount      INTEGER NOT NULL,
            spawned_at  INTEGER NOT NULL,
            claimed_by  TEXT    DEFAULT NULL,
            claimed_at  INTEGER DEFAULT NULL,
            day_key     TEXT    NOT NULL
        )
    `);
}

// ── Spawn a drop ──────────────────────────────────────────────────────────────

function spawnDrop(client) {
    if (activeDrop) return; // Already one active

    const day = getDayKey();

    db.get(`SELECT COUNT(*) as cnt FROM drop_events WHERE day_key=?`, [day], (err, row) => {
        if ((row?.cnt || 0) >= MAX_PER_DAY) return; // Daily cap hit

        const amount    = getRandomAmount();
        const now       = Date.now();
        const expiresAt = now + EXPIRE_MS;

        db.run(
            `INSERT INTO drop_events (amount, spawned_at, day_key) VALUES (?, ?, ?)`,
            [amount, now, day],
            function (err) {
                if (err) return;

                const dropId = this.lastID;
                activeDrop   = { id: dropId, amount, expiresAt };

                // Announce in drop channel
                const channelId = config.dropChannelId;
                const channel   = channelId ? client.channels.cache.get(channelId) : null;

                if (channel) {
                    channel.send(
                        `🎁 **Money Drop Appeared!**\n\n` +
                        `💰 **${fmt(amount)}** is up for grabs!\n` +
                        `⚡ First to type \`wclaim\` wins it!\n` +
                        `⏰ Expires <t:${Math.floor(expiresAt / 1000)}:R>`
                    );
                }

                // Auto-expire after EXPIRE_MS
                setTimeout(() => {
                    if (activeDrop && activeDrop.id === dropId) {
                        db.run(`DELETE FROM drop_events WHERE id=? AND claimed_by IS NULL`, [dropId]);
                        activeDrop = null;

                        if (channel) {
                            channel.send(`💨 The **${fmt(amount)}** drop expired — nobody claimed it!`);
                        }
                    }
                }, EXPIRE_MS);
            }
        );
    });
}

// ── Scheduler ─────────────────────────────────────────────────────────────────

function scheduleNextDrop(client) {
    const wait = getRandomWait();

    setTimeout(() => {
        const day = getDayKey();

        db.get(`SELECT COUNT(*) as cnt FROM drop_events WHERE day_key=?`, [day], (err, row) => {
            const count = row?.cnt || 0;

            if (count < MAX_PER_DAY) {
                spawnDrop(client);
            }

            // Always schedule the next check (daily cap just skips spawn)
            scheduleNextDrop(client);
        });
    }, wait);
}

// ── Public: claim a drop ──────────────────────────────────────────────────────

/**
 * Attempt to claim the active drop.
 * Callback: (err, { amount } | null)
 */
function claimDrop(userId, callback) {
    if (!activeDrop) return callback(null, null);
    if (Date.now() > activeDrop.expiresAt) {
        activeDrop = null;
        return callback(null, null);
    }

    const drop = activeDrop;
    activeDrop = null; // Immediately clear — prevents double-claim race

    db.run(
        `UPDATE drop_events SET claimed_by=?, claimed_at=? WHERE id=?`,
        [userId, Date.now(), drop.id],
        (err) => {
            if (err) {
                activeDrop = drop; // Restore on DB failure
                return callback(err, null);
            }
            callback(null, { amount: drop.amount });
        }
    );
}

// ── Public: check if a drop is active (for wdrop status etc.) ─────────────────

function getActiveDrop() {
    if (!activeDrop) return null;
    if (Date.now() > activeDrop.expiresAt) {
        activeDrop = null;
        return null;
    }
    return { ...activeDrop };
}

// ── Init ──────────────────────────────────────────────────────────────────────

function initDropEvents(client) {
    initDropTable();

    // Short initial delay (1–5 min) so bot fully loads first
    const startDelay = Math.floor(Math.random() * 4 * 60 * 1000) + 60_000;
    setTimeout(() => {
        scheduleNextDrop(client);
    }, startDelay);

    console.log(`[DropEvents] Initialized. First drop in ~${Math.round(startDelay / 60000)} min.`);
}

module.exports = { initDropEvents, claimDrop, getActiveDrop, fmt };
