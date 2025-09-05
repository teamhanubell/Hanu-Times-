# Hanu-Planner

AI-Assisted Offline Timetable Planner with Local Data Caching

A professional, stable, offline-first timetable chatbot that uses local data and caching to generate optimal academic schedules. No external API keys required.

- Clean, white Amazon Q–inspired theme with high contrast and accessible typography
- Colorful, minimal 3D buttons and cards; responsive layout across devices
- Fast local parsing and generation; robust caching and graceful error handling


## Table of Contents

- Features
- Architecture Overview
- Tech Stack
- Project Structure
- Getting Started
- Scripts & Development Workflow
- Configuration
- Frontend UI Guide
- Chatbot Capabilities
- Timetable API (Serverless)
- Data Model Summary
- Caching Strategy
- Accessibility & Theming
- Testing & Troubleshooting
- Deployment
- Roadmap
- Contributing
- License


## Features

- Offline AI assistant for natural-language timetable entry
- Conflict-free, optimized schedule generation
- Local SQLite database for persistence
- JSON/memory hybrid cache for ultra-fast reads
- Robust validation, overlap detection, and error handling
- Responsive React UI with clean white background, high contrast, and minimal 3D effects
- Colorful button system and subtle depth for modern look and feel


## Architecture Overview

- Frontend (React): modern component-based UI with chat, forms, and timetable visualization
- Serverless Functions (Netlify): CRUD for timetable entries + optional enhancement endpoint
- Backend (Local Services): Models and services for DB and caching utilities used locally and by functions
- Database: SQLite (file-based), portable and reliable
- Cache: In-memory + JSON cache with invalidation on mutations


## Tech Stack

- Frontend: React 18, modern hooks and context
- Styling: Custom CSS with variables (CSS Custom Properties)
- Backend/Functions: Node.js, Express-like handlers (Netlify Functions)
- Database: SQLite
- NLP: Lightweight parsing utilities for time/day/subject extraction


## Project Structure

```
hanuplanner/
├── backend/
│   ├── models/
│   │   └── Database.js
│   ├── services/
│   │   ├── CacheManager.js
│   │   ├── ChatBot.js
│   │   └── TimetableGenerator.js
│   ├── cache.js
│   ├── db.js
│   └── ...
├── db/
│   └── schema.sql
├── frontend/
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── App.js
│       ├── App.css
│       └── components/
│           ├── Dashboard.js
│           ├── InputForm.js
│           ├── LoadingSpinner.js
│           ├── NotificationToast.js
│           └── ...
├── netlify/
│   └── functions/
│       ├── package.json
│       └── timetable.js
├── netlify.toml
├── package.json
└── README.md
```


## Getting Started

Prerequisites

- Node.js 18+
- npm (or yarn/pnpm)
- No API keys required

Install dependencies

```bash
# From repository root
npm install

# Install frontend deps
cd frontend && npm install

# Install serverless function deps
cd ../netlify/functions && npm install
```

Run locally

```bash
# Terminal 1: Frontend (React)
cd frontend
npm start
# Runs on http://localhost:3000

# Terminal 2: Netlify functions (optional)
# If using Netlify CLI:
netlify dev
# or serve functions via your preferred local setup
```

Build

```bash
cd frontend
npm run build
```


## Scripts & Development Workflow

Common commands (root and workspace-specific):

- Frontend
  - npm start – starts React dev server
  - npm run build – production build to frontend/build
- Netlify Functions
  - netlify dev – runs functions locally (requires Netlify CLI)
- Linting/Format
  - Add and run linters/prettier as desired; repo is compatible


## Configuration

- Environment variables
  - Copy .env.example to .env where needed (frontend or functions)
  - Typical values: API base URLs for functions if not using relative paths
- Netlify
  - netlify.toml holds function settings and redirects


## Frontend UI Guide

- Theme: White background (bg-primary), light grays for sections, strong contrast text
- Buttons: Colorful gradients (primary orange, secondary blue, success green, danger red)
- Cards: Subtle shadows with minimal 3D lift on hover
- Forms: Generous padding, focus rings with theme accent, accessible labels
- Chat UI: Distinct bot vs user bubbles; clear contrast and readable fonts

Key CSS variables (in frontend/src/App.css)

```css
:root {
  --primary-color: #FF9900;
  --secondary-color: #5466c1;
  --bg-primary: #FFFFFF;
  --bg-secondary: #F8F9FA;
  --bg-tertiary: #F1F3F4;
  --bg-card: #FFFFFF;
  --text-primary: #1A1A1A;
  --text-secondary: #333333;
  --text-muted: #666666;
}
```


## Chatbot Capabilities

- Natural-language parsing for day/time/subject/type
- Intelligent grouping of multiple lines into entries
- Suggestions for resolving conflicts or merging sessions
- Local-only processing for privacy and speed


## Timetable API (Serverless)

Base Path: /.netlify/functions/timetable

- GET /.netlify/functions/timetable
  - Returns all entries (optionally filter by ?day=Monday)
- POST /.netlify/functions/timetable
  - Creates one or more entries (send entries array)
- PUT /.netlify/functions/timetable?id={id}
  - Updates an entry by ID
- DELETE /.netlify/functions/timetable?id={id}
  - Deletes an entry by ID
- POST /.netlify/functions/timetable/enhance
  - Optional enhancement/suggestion endpoint

Example: Create entries

```bash
curl -X POST "https://your-app.netlify.app/.netlify/functions/timetable" \
  -H "Content-Type: application/json" \
  -d '{
    "entries": [
      {"day":"Monday","start_time":"10:00","end_time":"12:00","type":"class","subject":"Math"}
    ]
  }'
```


## Data Model Summary

- Users – preferences and identity (if applicable)
- Courses – metadata, priority, type
- Sessions – day/time windows, type (class/lab/tutorial)
- Constraints – user availability windows and rules
- Cache – persisted JSON for rapid lookups
- Chat History – optional persistence for conversational continuity


## Caching Strategy

- Read-through cache: responses cached after DB hit
- Invalidation: POST/PUT/DELETE operations invalidate impacted keys
- TTL support: ensures stale entries eventually refresh


## Accessibility & Theming

- High-contrast text colors on all backgrounds
- Focus-visible outlines and large click targets
- Keyboard accessible controls and logical tab order
- Color system centralized via CSS variables for easy theming


## Testing & Troubleshooting

Checklist

- npm install runs without errors at root, frontend, and netlify/functions
- Frontend runs locally on http://localhost:3000
- Functions work locally via Netlify CLI (netlify dev)
- Timetable CRUD works end-to-end
- Cache invalidates on mutations and expires on TTL

Common issues

- CORS: Ensure all function responses include correct headers
- Function timeouts: Optimize queries and reduce payload size
- Build failures: Verify dependency versions and Node runtime


## Deployment

Netlify

- Push to main; Netlify builds frontend and deploys functions
- Configure environment variables in the Netlify dashboard if needed
- Monitor function logs and execution time in Netlify UI

Other options

- Render.com for a persistent Node backend
- Vercel/Cloudflare Workers for serverless alternatives


## Roadmap

- User auth and multi-tenant support
- Calendar integrations (iCal/Google Calendar export)
- Advanced constraint solver and preferences weighting
- Offline-first PWA with service workers


## Contributing

- Fork the repo and create a feature branch
- Write clean, documented code with meaningful commits
- Test using the checklist above
- Open a pull request with a clear description


## License

MIT License – see LICENSE for details.
