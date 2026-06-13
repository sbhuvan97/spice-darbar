#!/bin/bash
# Run this ONCE after first deploy on Railway
# Railway Shell → bash setup.sh

echo "🚀 Setting up Spice Darbar database..."
cd backend
node db/migrate.js && echo "✅ Migration done" || exit 1
node db/seed.js    && echo "✅ Seed done"      || exit 1
echo ""
echo "🎉 Setup complete!"
echo "   Kitchen login: kitchen / kitchen123"
echo "   Manager login: manager / manager123"
echo "   ⚠️  Change passwords in production!"
