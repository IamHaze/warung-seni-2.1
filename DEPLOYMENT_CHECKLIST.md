# Deployment Checklist

## Pre-Deployment Verification

### Database
- [x] `fish_streak` column added to users table (auto-patched on startup)
- [x] `pending_income` capped at 100M per tick
- [x] AI_rob_log table created
- [x] Fishing items added to config.json
- [x] All item prices set correctly

### Code Syntax
- [x] fish.js — async/await properly structured
- [x] farm.js — difficulty reduced (0.3/0.5/0.8)
- [x] fight.js — new command ready
- [x] index.js — passive income uses config.json, AI robbery system added
- [x] buy.js — rods in SINGLE_ONLY, prestige items updated
- [x] shop.js — fishing gear section added

### Config
- [x] Fishing rods: bamboo (500), iron (2k), golden (8k), crystal (25k)
- [x] Bait: worm (300), magic (1.2k)
- [x] Prestige multiplier: 0.05 (was 0.2)
- [x] Prestige items nerfed: ~60% income reduction

---

## Post-Deployment Testing

### Player Commands to Test:
1. `wshop` — Should show fishing gear section
2. `wbuy bamboo_rod` — Buy first rod
3. `wbuy iron_rod` — Should say "You can only own 1x bamboo_rod at a time"
4. `wbuy worm_bait 5` — Buy stackable bait
5. `wfish` — Cast line, press button within 10s
6. `wfight` — Should say "You haven't been robbed by an AI"
7. `wfarm` — Should say codes hard to type (3 codes medium difficulty)
8. `wcollect` — Collect pending_income (now capped at 100M)

### Backend Checks:
1. Bot startup: Should log `✅ Added column fish_streak` (if column was missing)
2. Every 30 mins: Should see `🤖 AI ROB ATTEMPT!` in event channel
3. Every 10 mins: Should see `💸 Passive tick` in console (if income items exist)
4. Database: Run `sqlite3 database.db "SELECT fish_streak FROM users LIMIT 1"` — should work

---

## Quick Rollback Plan

If issues occur:

### Immediate:
1. Disable fish command: Comment out in command loader (index.js line 18-35)
2. Disable AI robbery: Comment out setInterval at line 152-179 in index.js
3. Disable farm nerf: Revert multipliers to 1.0/1.5/2.5 in commands/farm.js line 8

### Data Safe:
- All data is backward compatible (added columns, not removed)
- Existing players keep their money/items
- No destructive migrations

---

## Feature Summary

| Feature | Status | Key File |
|---------|--------|----------|
| wfarm nerfed | ✅ Done | commands/farm.js |
| wfish reworked | ✅ Done | commands/fish.js |
| wfight added | ✅ Done | commands/fight.js |
| AI robbery | ✅ Done | index.js |
| Prestige nerfed | ✅ Done | config.json |
| Super-rich bug fixed | ✅ Done | index.js + config.json |
| Database updated | ✅ Done | database/db.js |
| Shop updated | ✅ Done | commands/shop.js |

---

## Known Limitations

1. Fishing items (rods/bait) must be bought from regular shop, not prestige shop
2. AI robbery is random player selection (could target very poor players)
3. Fish streak resets on timeout or failure (no persistence across sessions)
4. Magic bait is rare but consumable (could be expensive for casual players)

---

## Future Improvements (Optional)

- Add fishing leaderboard (top fish caught)
- Add rod upgrade/durability system
- Add trophy system for rare catches
- Add fishing tournaments
- Add prestige-only fishing locations
