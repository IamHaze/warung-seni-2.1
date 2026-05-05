#!/bin/bash
# Run from your project root to delete unneeded files

# ── Root-level duplicates (superseded by commands/ versions) ──
rm -f bal.js
rm -f buy.js
rm -f collect.js
rm -f give.js
rm -f inv.js
rm -f prestige.js
rm -f pshop.js
rm -f shop.js
rm -f upgrade.js
rm -f scheduler.js
rm -f pbuy.js          # explicitly marked deprecated in the file itself

# ── Empty system stubs ──
rm -f systems/heist.js
rm -f systems/leaderboard.js
rm -f systems/marketplace.js
rm -f systems/pets.js
rm -f systems/skills.js

# ── Coming-soon stub (no logic) ──
rm -f commands/skills.js

echo "✅ Cleanup done"
