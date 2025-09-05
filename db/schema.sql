-- Hanu-Planner Database Schema
-- SQLite database for offline timetable management

-- Users table - basic user information
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    preferences TEXT, -- JSON string for user preferences
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Courses table - academic courses/subjects
CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    code TEXT,
    priority INTEGER DEFAULT 1, -- 1=high, 2=medium, 3=low
    credits INTEGER DEFAULT 3,
    color TEXT DEFAULT '#3B82F6', -- hex color for UI
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Sessions table - individual class/lab sessions
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('lecture', 'lab', 'tutorial', 'seminar')),
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 1=Monday, etc.
    start_time TEXT NOT NULL, -- HH:MM format
    end_time TEXT NOT NULL, -- HH:MM format
    location TEXT,
    instructor TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- Constraints table - user scheduling constraints
CREATE TABLE IF NOT EXISTS constraints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('unavailable', 'preferred', 'break', 'no_back_to_back')),
    day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6), -- NULL for all days
    start_time TEXT, -- HH:MM format, NULL for all-day constraints
    end_time TEXT, -- HH:MM format
    description TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Timetables table - generated timetable versions
CREATE TABLE IF NOT EXISTS timetables (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    data TEXT NOT NULL, -- JSON string of the complete timetable
    is_current BOOLEAN DEFAULT 0,
    score REAL, -- optimization score
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Cache table - quick lookup cache
CREATE TABLE IF NOT EXISTS cache (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL, -- JSON string
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Chat history table - chatbot conversation history
CREATE TABLE IF NOT EXISTS chat_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    response TEXT NOT NULL,
    intent TEXT, -- detected intent (add_course, schedule_session, etc.)
    entities TEXT, -- JSON string of extracted entities
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sessions_course_day ON sessions(course_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_sessions_time ON sessions(day_of_week, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_constraints_user_day ON constraints(user_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_timetables_user_current ON timetables(user_id, is_current);
CREATE INDEX IF NOT EXISTS idx_cache_expires ON cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_chat_history_user ON chat_history(user_id, created_at);

-- Insert default user for single-user mode
INSERT OR IGNORE INTO users (id, name, email) VALUES (1, 'Default User', 'user@hanuplanner.local');
