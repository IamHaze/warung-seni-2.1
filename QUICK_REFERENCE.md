# Quick Reference — Database & Config Updates

## What Changed

### Database (db.js)
```
✅ New column: fish_streak (INTEGER DEFAULT 0)
✅ New table: ai_rob_log
✅ Existing columns auto-patched (heat, prestige, last_rob, etc.)
✅ No data deleted, all changes are additive
```

### Config (config.json)
```
✅ Added 6 fishing items (rods & bait)
✅ Prestige multiplier: 0.2 → 0.05 (4x nerf)
✅ P20-45 items income: Reduced ~60%
```

### Code Changes
```
✅ index.js: AI robbery every 30 mins, dynamic income from config
✅ commands/fish.js: Complete rework (rods, bait, weather, streak)
✅ commands/farm.js: Multipliers 1.0/1.5/2.5 → 0.3/0.5/0.8
✅ commands/fight.js: NEW — Counter AI robbery attacks
✅ commands/buy.js: Rods as single-only items
✅ commands/shop.js: Added fishing gear section
```

---

## How to Add More Fishing Items

### 1. Add to config.json:
```json
"my_rod": {
  "base_price": 50000,
  "income": 0,
  "volatility": 0
}
```

### 2. Add to fish.js RODS object (if rod):
```javascript
const RODS = {
    my_rod: { name: "My Rod", emoji: "🎯", catchRate: 0.95, rarityMult: 0.3, multiChance: 0.4, valueMult: 2.5 }
};
```

### 3. Add to ROD_ORDER (if rod):
```javascript
const ROD_ORDER = ["my_rod", "crystal_rod", ...];
```

### 4. Make single-only (if rod):
```javascript
const SINGLE_ONLY = [..., "my_rod"];
```

### 5. Update shop.js to display it

---

## How to Adjust Prestige Income

Edit `config.json` prestige section:
```json
"prestige": {
  "income_bonus_per_level": 0.05  // Change this: higher = more bonus per level
}
```

Current: P10 = 1.5x, P45 = 3.25x
If changed to 0.10: P10 = 2x, P45 = 5.5x

---

## How to Adjust Passive Income Cap

Edit `index.js` line 71:
```javascript
const MAX_PENDING_INCOME = 100000000; // Change this number
```

Current: 100M cap per 10-min tick
If set to 50000000: 50M cap per tick

---

## How to Adjust AI Robbery Frequency

Edit `index.js` line 199:
```javascript
}, 1800000);  // milliseconds
```

Current: 30 mins (1800000 ms)
- 10 mins = 600000
- 20 mins = 1200000
- 60 mins = 3600000

---

## How to Disable Features

### Disable Fishing:
Comment out in index.js loadCommands loop (line 18-35)

### Disable AI Robbery:
Comment out entire setInterval block (line 152-179)

### Disable Farm Nerf:
Revert farm.js multipliers back to 1.0/1.5/2.5

---

## Database Column Reference

### Users Table
```
fish_streak       — Current fishing streak (0-N)
heat              — Police heat level (0-N)
prestige          — Prestige level (0-45)
last_rob          — Timestamp of last robbery
pending_income    — Accumulated income (capped at 100M)
```

### Inventory Table
```
level             — Item level/quality multiplier
```

---

## Common Issues & Fixes

**Issue**: "Unknown column 'fish_streak'"
- **Fix**: Make sure bot starts fresh to auto-patch. Restart bot.

**Issue**: Fish buttons don't appear
- **Fix**: Ensure discord.js v14+ with ButtonBuilder imported
- **Check**: `npm list discord.js` should show v14.x

**Issue**: Prestige items still give too much income
- **Fix**: Check config.json has `"income_bonus_per_level": 0.05` (not 0.2)

**Issue**: Players get super rich too fast
- **Fix**: Check MAX_PENDING_INCOME cap exists in index.js
- **Fix**: Verify prestige multiplier is 0.05 not 0.2

---

## Testing Commands

```bash
# Test syntax
node -c commands/fish.js
node -c commands/farm.js
node -c commands/fight.js

# Test config
node -e "require('./config.json')" && echo "OK"

# Test database
sqlite3 database.db "SELECT fish_streak FROM users LIMIT 1"

# Start bot
npm start
```

---

## Files Modified

- `database/db.js` — Added fish_streak column
- `database/schema.sql` — Documentation updated
- `config.json` — Fishing items, prestige nerf
- `index.js` — AI robbery, dynamic income
- `commands/fish.js` — Complete rework
- `commands/farm.js` — Difficulty nerfed
- `commands/fight.js` — NEW command
- `commands/buy.js` — Rod restrictions
- `commands/shop.js` — Fishing section added

## New Files
- `UPDATE_SUMMARY.md` — Detailed changes
- `DEPLOYMENT_CHECKLIST.md` — Testing checklist
- `QUICK_REFERENCE.md` — This file
