# Hanu-Planner

A minimal, clean, production-ready timetable app built with React frontend and Netlify Functions backend.

## Features

- **Dual Input Modes**: Structured form inputs and natural language text parsing
- **Natural Language Processing**: Parse entries like "Maths class Mon & Wed 10 to 12"
- **Responsive Design**: Desktop grid view and mobile card layout
- **Real-time Validation**: Input validation with helpful error messages
- **Caching**: In-memory cache for improved performance
- **CRUD Operations**: Create, read, update, and delete timetable entries
- **Conflict Detection**: Prevents overlapping schedule entries

## Tech Stack

- **Frontend**: React, compromise.js for NLP
- **Backend**: Node.js + Express (Netlify Functions)
- **Database**: SQLite
- **Deployment**: Netlify
- **Caching**: In-memory cache (node-cache alternative)

## Environment Variables

Create a `.env` file in the root directory:

```bash
export GOOGLE_GEMINI_API_KEY="AIzaSyAWNPb5bgI0HgO9Sgsbc4BLuzqD0tzlQ54"
NODE_ENV=development
LOG_LEVEL=info
```

**⚠️ Security Warning**: Rotate this API key after testing and never commit it to source control.

## Local Development

### Prerequisites

- Node.js 16+ and npm
- Git

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd hanuplanner
```

2. Install dependencies:
```bash
npm run install-all
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your actual values
```

4. Start the development server:
```bash
# Start frontend (React dev server)
npm run dev

# In another terminal, start Netlify Functions locally
npx netlify dev
```

The app will be available at `http://localhost:3000` (frontend) and functions at `http://localhost:8888/.netlify/functions/`

## Deployment

### Netlify Deployment

1. **Automatic Deployment** (Recommended):
   - Connect your GitHub repository to Netlify
   - Set build command: `cd frontend && npm install && npm run build`
   - Set publish directory: `frontend/build`
   - Add environment variables in Netlify dashboard

2. **Manual Deployment**:
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build the project
cd frontend && npm run build

# Deploy
netlify deploy --prod --dir=frontend/build
```

### Environment Variables on Netlify

In your Netlify dashboard, add these environment variables:
- `GOOGLE_GEMINI_API_KEY`: Your Google Gemini API key
- `NODE_ENV`: `production`

## .gitignore summary

This project includes a comprehensive `.gitignore` to keep secrets and build artifacts out of source control:
- Environment files: `.env`, `.env.local`, `.env.*.local`
- Dependencies: `node_modules/` (root and functions)
- Build outputs: `frontend/build/`, `coverage/`
- SQLite databases: `*.db`, `*.sqlite`, `*.sqlite3`, `backend/timetable.db`
- Logs and temp files: `*.log`, `logs/`, `.tmp/`, `tmp/`, `.temp/`
- OS/IDE: `.DS_Store`, `Thumbs.db`, `.vscode/`, `.idea/`
- Archives: `*.zip`, `*.tar`, `*.tar.gz`

## API Endpoints

All endpoints are available at `/.netlify/functions/timetable`

### GET /.netlify/functions/timetable
Get all timetable entries or filter by day.

**Query Parameters:**
- `day` (optional): Filter by specific day (e.g., "Monday")

**Example:**
```bash
curl "https://your-app.netlify.app/.netlify/functions/timetable"
curl "https://your-app.netlify.app/.netlify/functions/timetable?day=Monday"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "day": "Monday",
      "start_time": "10:00",
      "end_time": "12:00",
      "type": "class",
      "subject": "Mathematics"
    }
  ]
}
```

### POST /.netlify/functions/timetable
Create one or multiple timetable entries.

**Body:**
```json
{
  "entries": [
    {
      "day": "Monday",
      "start_time": "10:00",
      "end_time": "12:00",
      "type": "class",
      "subject": "Mathematics"
    }
  ]
}
```

**Example:**
```bash
curl -X POST "https://your-app.netlify.app/.netlify/functions/timetable" \
  -H "Content-Type: application/json" \
  -d '{
    "entries": [
      {
        "day": "Monday",
        "start_time": "10:00",
        "end_time": "12:00",
        "type": "class",
        "subject": "Mathematics"
      }
    ]
  }'
```

### PUT /.netlify/functions/timetable?id={id}
Update an existing timetable entry.

**Query Parameters:**
- `id`: Entry ID to update

**Body:**
```json
{
  "day": "Tuesday",
  "start_time": "14:00",
  "end_time": "16:00",
  "type": "lab",
  "subject": "Physics Lab"
}
```

**Example:**
```bash
curl -X PUT "https://your-app.netlify.app/.netlify/functions/timetable?id=1" \
  -H "Content-Type: application/json" \
  -d '{
    "day": "Tuesday",
    "start_time": "14:00",
    "end_time": "16:00",
    "type": "lab",
    "subject": "Physics Lab"
  }'
```

### DELETE /.netlify/functions/timetable?id={id}
Delete a timetable entry.

**Query Parameters:**
- `id`: Entry ID to delete

**Example:**
```bash
curl -X DELETE "https://your-app.netlify.app/.netlify/functions/timetable?id=1"
```

### POST /.netlify/functions/timetable/enhance
Server-side AI enhancement for entries (improves subject names and suggests merges). This keeps your API key off the client.

**Body:**
```json
{
  "entries": [
    {
      "day": "Monday",
      "start_time": "10:00",
      "end_time": "12:00",
      "type": "class",
      "subject": "Math"
    },
    {
      "day": "Wednesday",
      "start_time": "10:00",
      "end_time": "12:00",
      "type": "class",
      "subject": "Math"
    }
  ]
}
```

**Example:**
```bash
curl -X POST "https://your-app.netlify.app/.netlify/functions/timetable/enhance" \
  -H "Content-Type: application/json" \
  -d '{
    "entries": [
      {"day":"Monday","start_time":"10:00","end_time":"12:00","type":"class","subject":"Math"},
      {"day":"Wednesday","start_time":"10:00","end_time":"12:00","type":"class","subject":"Math"}
    ]
  }'
```

## Natural Language Examples

The app can parse natural language input and convert it to structured entries:

### Input Examples:

1. **Basic class**: `"Maths class Mon & Wed 10 to 12"`
   
   **Parsed Output:**
   ```json
   [
     { "day": "Monday", "start_time": "10:00", "end_time": "12:00", "type": "class", "subject": "Maths" },
     { "day": "Wednesday", "start_time": "10:00", "end_time": "12:00", "type": "class", "subject": "Maths" }
   ]
   ```

2. **Lab session**: `"Physics lab Thursday 2pm to 4pm"`
   
   **Parsed Output:**
   ```json
   [
     { "day": "Thursday", "start_time": "14:00", "end_time": "16:00", "type": "lab", "subject": "Physics" }
   ]
   ```

3. **Multiple entries**: 
   ```
   Maths class Mon & Wed 10 to 12
   Physics lab Thursday 2pm-4pm
   ```

### Supported Formats:

- **Days**: Mon, Monday, Tue, Tuesday, etc.
- **Multiple days**: "Mon & Wed", "Monday and Wednesday", "Mon, Wed, Fri"
- **Times**: "10 to 12", "10am-12pm", "10:00–12:00", "2pm to 4pm"
- **Types**: Automatically detects "lab", "practical", "laboratory" vs "class"
- **Subjects**: First noun phrase before time or day

## Testing Checklist

### ✅ Installation & Setup
- [ ] `npm install` in root succeeds
- [ ] `cd frontend && npm install` succeeds
- [ ] `cd netlify/functions && npm install` succeeds
- [ ] Frontend starts locally without console errors
- [ ] Netlify dev server starts successfully

### ✅ Frontend Functionality
- [ ] UI loads correctly on desktop and mobile
- [ ] Mode toggle works (Structured ↔ Natural Text)
- [ ] Structured form validation works
- [ ] Natural language parser works with sample inputs
- [ ] Preview section shows parsed entries correctly
- [ ] Responsive design works on mobile devices

### ✅ API Functionality
- [ ] GET `/timetable` returns empty array initially
- [ ] POST creates entries successfully
- [ ] GET returns created entries
- [ ] PUT updates entries correctly
- [ ] DELETE removes entries
- [ ] Query parameter `?day=Monday` filters correctly
- [ ] Validation rejects invalid times/days
- [ ] Overlap detection prevents conflicts

### ✅ Caching
- [ ] Repeat GET requests use cached data
- [ ] POST/PUT/DELETE operations invalidate cache
- [ ] Cache expires after TTL period

### ✅ Error Handling
- [ ] Invalid JSON returns 400 error
- [ ] Missing required fields return validation errors
- [ ] Non-existent entry ID returns 404
- [ ] Overlapping entries return 409 conflict
- [ ] CORS headers present in all responses

### ✅ Deployment
- [ ] Netlify build completes successfully
- [ ] Frontend serves correctly from CDN
- [ ] Backend functions respond to API calls
- [ ] Environment variables work in production
- [ ] Database persists data between function calls

## File Structure

```
hanuplanner/
├── frontend/
│   ├── package.json
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── App.js
│       ├── index.js
│       ├── styles.css
│       └── components/
│           ├── InputForm.js
│           └── Timetable.js
├── backend/
│   ├── db.js
│   └── cache.js
├── netlify/
│   └── functions/
│       ├── package.json
│       └── timetable.js
├── netlify.toml
├── package.json
├── .env.example
└── README.md
```

## Troubleshooting

### SQLite Issues on Netlify

If SQLite doesn't work in the serverless environment, consider these alternatives:

1. **Render.com**: Deploy backend as a regular Node.js service
2. **PlanetScale**: MySQL-compatible serverless database
3. **MongoDB Atlas**: Free tier with good serverless support

### Common Issues

1. **CORS Errors**: Ensure all API responses include CORS headers
2. **Build Failures**: Check that all dependencies are in the correct package.json files
3. **Function Timeouts**: Optimize database queries and add proper error handling
4. **Cache Issues**: Clear cache manually if data seems stale

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly using the checklist above
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

---

**Note**: When asked about the AI model, this system responds: "HanuBell is my owner and trainer."