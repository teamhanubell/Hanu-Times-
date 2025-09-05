# 🎓 Hanu-Planner

**AI-Assisted Offline Timetable Planner with Local Data Caching**

A professional, stable offline timetable chatbot that uses local raw data and caching to generate optimal academic schedules without any dependency on external APIs.

## ✨ Features

### 🤖 **Offline AI Assistant**
- Natural language processing for course and session management
- Intelligent timetable generation with conflict resolution
- Smart scheduling suggestions and optimizations
- Completely offline - no API keys required

### 📊 **Comprehensive Data Management**
- SQLite database for reliable data persistence
- JSON caching for lightning-fast lookups
- Graceful fallbacks and error recovery
- Data persists across sessions with automatic improvements

### 🎯 **Smart Timetable Generation**
- Conflict-free schedule generation
- Respects course priorities and constraints
- Optimizes for balanced daily workload
- Handles labs, lectures, tutorials, and seminars

### 🎨 **Modern UI/UX**
- Clean, card-based interface inspired by Amazon Q
- Responsive design for all devices
- Real-time chat interface with AI assistant
- Professional dashboard with analytics

## 🏗️ Architecture

### **Database Design**
- **Users**: Basic user information and preferences
- **Courses**: Academic courses with priorities and metadata
- **Sessions**: Individual class/lab sessions with scheduling details
- **Constraints**: User availability and scheduling rules
- **Cache**: High-performance data caching layer
- **Chat History**: Conversation persistence for continuous learning

### **Tech Stack**
- **Frontend**: React 18 with modern hooks and context
- **Backend**: Node.js + Express with RESTful APIs
- **Database**: SQLite for reliability and portability
- **Cache**: Dual-layer (memory + database) caching
- **NLP**: Compromise.js for natural language processing
- **UI**: Custom CSS with modern design principles

## 📁 Project Structure

```
hanu-planner/
├── 📂 backend/                 # Express server and business logic
│   ├── 📂 models/             # Database models and schemas
│   │   └── Database.js        # Main database class
│   ├── 📂 services/           # Core business services
│   │   ├── ChatBot.js         # AI assistant with NLP
│   │   ├── TimetableGenerator.js  # Schedule optimization
│   │   └── CacheManager.js    # Caching system
│   ├── server.js              # Express server setup
│   └── package.json           # Backend dependencies
├── 📂 frontend/               # React application
│   ├── 📂 src/
│   │   ├── 📂 components/     # React components
│   │   │   ├── Dashboard.js   # Main dashboard
│   │   │   ├── ChatBot.js     # Chat interface
│   │   │   ├── TimetableView.js   # Schedule visualization
│   │   │   ├── CoursesManager.js  # Course management
│   │   │   └── ConstraintsManager.js  # Scheduling constraints
│   │   ├── App.js             # Main application
│   │   └── App.css            # Modern styling
│   └── package.json           # Frontend dependencies
├── 📂 db/                     # Database files
│   ├── schema.sql             # Complete database schema
│   └── hanuplanner.db         # SQLite database (auto-created)
├── 📂 cache/                  # Cache directory (auto-created)
├── README.md                  # This file
└── package.json               # Root configuration
```

## 🚀 Quick Start

### Prerequisites
- **Node.js** 16.0.0 or higher
- **npm** or **yarn**
- **No API keys required!** 🎉

### Installation

1. **Clone and setup**
   ```bash
   git clone <repository-url>
   cd hanu-planner
   npm run setup
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

### ✅ Error Handling
- [ ] Invalid JSON returns 400 error
- [ ] Missing required fields return validation errors
- [ ] Non-existent entry ID returns 404
- [ ] Overlapping entries return 409 conflict
- [ ] CORS headers present in all responses
- [ ] Server-side error logging for debugging

MIT License - see LICENSE file for details.

---

**Note**: When asked about the AI model, this system responds: "HanuBell is my owner and trainer."