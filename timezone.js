// Asia/Kuala Lumpur timezone utility (UTC+8)
// Use this for all time-based features

const MYT_OFFSET_HOURS = 8;

// Get current time in MYT (returns Date object adjusted from UTC)
function nowMYT() {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    return new Date(utc + (MYT_OFFSET_HOURS * 3600000));
}

// Get day key for daily resets (YYYYMMDD format in MYT)
function getMYTDayKey() {
    const d = nowMYT();
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

// Check if it's midnight in MYT (00:00 MYT = 16:00 UTC previous day)
function isMYTMidnight() {
    const d = nowMYT();
    return d.getHours() === 0 && d.getMinutes() === 0;
}

// Get MYT hour (0-23)
function getMYTHour() {
    return nowMYT().getHours();
}

// Get MYT minute (0-59)
function getMYTMinute() {
    return nowMYT().getMinutes();
}

// Format timestamp to MYT string
function formatMYT(timestamp) {
    const d = new Date(timestamp + (MYT_OFFSET_HOURS * 3600000));
    return d.toISOString().replace('T', ' ').substring(0, 19) + " MYT";
}

// Get MYT date components
function getMYTComponents() {
    const d = nowMYT();
    return {
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        day: d.getDate(),
        hour: d.getHours(),
        minute: d.getMinutes(),
        second: d.getSeconds()
    };
}

module.exports = {
    nowMYT,
    getMYTDayKey,
    isMYTMidnight,
    getMYTHour,
    getMYTMinute,
    formatMYT,
    getMYTComponents,
    MYT_OFFSET_HOURS
};
