#!/bin/bash
echo ""
echo "╔════════════════════════════════════════╗"
echo "║    📚 CampusMart — Setup Script        ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Check Node
if ! command -v node &> /dev/null; then
  echo "❌ Node.js not found!"
  echo "   Download from: https://nodejs.org (LTS version)"
  exit 1
fi
echo "✅ Node.js $(node -v) found"

# Check npm
if ! command -v npm &> /dev/null; then
  echo "❌ npm not found. Reinstall Node.js"
  exit 1
fi
echo "✅ npm $(npm -v) found"

# Install dependencies
echo ""
echo "📦 Installing all dependencies (React, Firebase, etc.)..."
npm install

echo ""
echo "✅ All packages installed!"
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
  echo "⚙️  Creating .env file from template..."
  cp .env.example .env
  echo ""
  echo "┌─────────────────────────────────────────────────┐"
  echo "│  ⚠️  IMPORTANT: Open .env and fill in your keys  │"
  echo "│                                                   │"
  echo "│  Firebase keys → Firebase Console               │"
  echo "│    console.firebase.google.com                  │"
  echo "│    Project Settings → Your Apps → Web           │"
  echo "│                                                   │"
  echo "│  Cloudinary keys → Cloudinary Dashboard         │"
  echo "│    cloudinary.com → Dashboard                   │"
  echo "│    Settings → Upload → Upload Presets           │"
  echo "└─────────────────────────────────────────────────┘"
  echo ""
  read -p "Press Enter after you've filled in .env to start the app..."
fi

echo ""
echo "🚀 Starting CampusMart..."
echo "   App will open at → http://localhost:3000"
echo ""
npm start
