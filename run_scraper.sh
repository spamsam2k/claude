#!/bin/bash

# Zillow Phone Scraper Launcher
# Usage: Place your agents.csv file in this directory, then run this script

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CSV_FILE="$SCRIPT_DIR/agents.csv"
OUTPUT_FILE="$SCRIPT_DIR/agents_with_phones.csv"
DASHBOARD="$SCRIPT_DIR/dashboard.html"

echo "🔍 Zillow Agent Phone Scraper"
echo "=============================="
echo ""

# Check if input CSV exists
if [ ! -f "$CSV_FILE" ]; then
    echo "❌ Error: agents.csv not found in $SCRIPT_DIR"
    echo ""
    echo "Please place your agents.csv file in the same directory as this script."
    exit 1
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: Python 3 is not installed"
    exit 1
fi

# Count agents
AGENT_COUNT=$(tail -n +2 "$CSV_FILE" | wc -l)
echo "📋 Found $AGENT_COUNT agents in agents.csv"
echo "📂 Input:  $CSV_FILE"
echo "📂 Output: $OUTPUT_FILE"
echo "📊 Dashboard: $DASHBOARD"
echo ""

# Run the scraper
echo "⏳ Starting extraction (this may take a while)..."
echo ""

python3 "$SCRIPT_DIR/scrape_phones.py"

if [ -f "$OUTPUT_FILE" ]; then
    PHONES_FOUND=$(tail -n +2 "$OUTPUT_FILE" | awk -F$'\t' '{if($NF ~ /[0-9-]/){count++}} END {print count}')
    echo ""
    echo "✅ Complete!"
    echo "   Extracted phone numbers: $PHONES_FOUND / $AGENT_COUNT"
    echo ""
    echo "🌐 Open dashboard.html in your browser to view results"
else
    echo "❌ Output file was not created"
    exit 1
fi
