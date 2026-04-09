# Zillow Agent Scraper - Claude Code Configuration

## Project Structure

```
/home/user/claude/
├── extension/              # Chrome extension for Zillow scraping
├── minervia-starter-kit/   # Knowledge management skills
├── claude-lessons-learned/ # Systematic debugging & retrospectives
├── agents.csv              # Exported agent data
├── dashboard.html          # Results dashboard
└── scrape_phones.py        # Legacy Python scraper
```

## Available Skills

### Debugging & Problem-Solving
- `/systematic-debugging` - Four-phase root cause analysis for bugs
- `/verification-before-completion` - Verify fixes work before declaring done
- `/think-first` - Apply mental models before major decisions

### Project Management
- `/start-project` - Initialize new projects
- `/log-to-daily` - Capture session work to daily notes
- `/lessons-learned` - Structured retrospectives for failures & wins

### Code Quality
- `/antislop` - Detect AI-generated patterns
- `/extract-wisdom` - Distill insights from content
- `/creation-guard` - Prevent duplicate work

## Current Issue: Zillow Extension Not Connecting

**Branch:** `claude/extract-zillow-phone-numbers-1GWtv`

The Chrome extension fails with "Could not establish connection" error when extracting agents. 

**Last actions:**
1. Simplified content.js to remove complex JSON-LD logic
2. Added global error handling
3. Created working selectors

**Next:** Use `/systematic-debugging` to properly diagnose the actual page structure.

## How to Use These Skills

Invoke any skill with `/skill-name` in Claude Code. Example:

```
/systematic-debugging
What's wrong with the Zillow extension?
```

## Installation Notes

- Skills installed to: `~/.claude/skills/`
- Minervia kit provides knowledge management integration
- Lessons-learned skill provides structured problem-solving
- Both are MIT-licensed and free to use
