const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('./models/Database');
const ChatBot = require('./services/ChatBot');
const TimetableGenerator = require('./services/TimetableGenerator');
const CacheManager = require('./services/CacheManager');

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize services
const db = new Database();
const chatBot = new ChatBot(db);
const timetableGenerator = new TimetableGenerator(db);
const cache = new CacheManager(db);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend/build')));

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: {
      message: 'Internal server error',
      code: 'SERVER_ERROR'
    }
  });
};

// Response helper
const sendResponse = (res, success, data = null, message = null, statusCode = 200) => {
  res.status(statusCode).json({
    success,
    data,
    message,
    timestamp: new Date().toISOString()
  });
};

// Health check endpoint
app.get('/api/health', (req, res) => {
  sendResponse(res, true, { status: 'healthy', database: db.isConnected() }, 'Server is running');
});

// Chat endpoints
app.post('/api/chat', async (req, res) => {
  try {
    const { message, userId = 1 } = req.body;
    
    if (!message || typeof message !== 'string') {
      return sendResponse(res, false, null, 'Message is required', 400);
    }

    const response = await chatBot.processMessage(message, userId);
    sendResponse(res, true, response, 'Message processed');
  } catch (error) {
    console.error('Chat error:', error);
    sendResponse(res, false, null, 'Failed to process message', 500);
  }
});

app.get('/api/chat/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50 } = req.query;
    
    const history = await chatBot.getChatHistory(userId, parseInt(limit));
    sendResponse(res, true, history, 'Chat history retrieved');
  } catch (error) {
    console.error('Chat history error:', error);
    sendResponse(res, false, null, 'Failed to retrieve chat history', 500);
  }
});

// Course endpoints
app.get('/api/courses/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const courses = await db.getCoursesByUser(userId);
    sendResponse(res, true, courses, 'Courses retrieved');
  } catch (error) {
    console.error('Get courses error:', error);
    sendResponse(res, false, null, 'Failed to retrieve courses', 500);
  }
});

app.post('/api/courses', async (req, res) => {
  try {
    const { userId = 1, name, code, priority = 1, credits = 3, color = '#3B82F6', description } = req.body;
    
    if (!name) {
      return sendResponse(res, false, null, 'Course name is required', 400);
    }

    const courseId = await db.createCourse({
      userId,
      name,
      code,
      priority,
      credits,
      color,
      description
    });

    // Invalidate cache
    await cache.invalidate(`courses_${userId}`);
    
    sendResponse(res, true, { id: courseId }, 'Course created successfully');
  } catch (error) {
    console.error('Create course error:', error);
    sendResponse(res, false, null, 'Failed to create course', 500);
  }
});

app.put('/api/courses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    await db.updateCourse(id, updates);
    
    // Invalidate related cache
    const course = await db.getCourseById(id);
    if (course) {
      await cache.invalidate(`courses_${course.user_id}`);
    }
    
    sendResponse(res, true, null, 'Course updated successfully');
  } catch (error) {
    console.error('Update course error:', error);
    sendResponse(res, false, null, 'Failed to update course', 500);
  }
});

app.delete('/api/courses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const course = await db.getCourseById(id);
    if (!course) {
      return sendResponse(res, false, null, 'Course not found', 404);
    }
    
    await db.deleteCourse(id);
    await cache.invalidate(`courses_${course.user_id}`);
    
    sendResponse(res, true, null, 'Course deleted successfully');
  } catch (error) {
    console.error('Delete course error:', error);
    sendResponse(res, false, null, 'Failed to delete course', 500);
  }
});

// Session endpoints
app.get('/api/sessions/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { courseId, dayOfWeek } = req.query;
    
    const sessions = await db.getSessionsByUser(userId, { courseId, dayOfWeek });
    sendResponse(res, true, sessions, 'Sessions retrieved');
  } catch (error) {
    console.error('Get sessions error:', error);
    sendResponse(res, false, null, 'Failed to retrieve sessions', 500);
  }
});

app.post('/api/sessions', async (req, res) => {
  try {
    const { courseId, type, dayOfWeek, startTime, endTime, location, instructor } = req.body;
    
    if (!courseId || !type || dayOfWeek === undefined || !startTime || !endTime) {
      return sendResponse(res, false, null, 'Missing required fields', 400);
    }

    // Validate time format and logic
    if (startTime >= endTime) {
      return sendResponse(res, false, null, 'End time must be after start time', 400);
    }

    const sessionId = await db.createSession({
      courseId,
      type,
      dayOfWeek,
      startTime,
      endTime,
      location,
      instructor
    });

    // Invalidate timetable cache
    const course = await db.getCourseById(courseId);
    if (course) {
      await cache.invalidate(`timetable_${course.user_id}`);
    }
    
    sendResponse(res, true, { id: sessionId }, 'Session created successfully');
  } catch (error) {
    console.error('Create session error:', error);
    sendResponse(res, false, null, 'Failed to create session', 500);
  }
});

// Timetable endpoints
app.get('/api/timetable/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Try cache first
    const cached = await cache.get(`timetable_${userId}`);
    if (cached) {
      return sendResponse(res, true, cached, 'Timetable retrieved from cache');
    }

    const timetable = await timetableGenerator.generateTimetable(userId);
    
    // Cache the result
    await cache.set(`timetable_${userId}`, timetable, 3600); // 1 hour
    
    sendResponse(res, true, timetable, 'Timetable generated');
  } catch (error) {
    console.error('Timetable generation error:', error);
    sendResponse(res, false, null, 'Failed to generate timetable', 500);
  }
});

app.post('/api/timetable/regenerate/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Clear cache and regenerate
    await cache.invalidate(`timetable_${userId}`);
    const timetable = await timetableGenerator.generateTimetable(userId);
    
    // Save to database
    await db.saveTimetable(userId, 'Auto-generated', timetable);
    
    // Cache the new result
    await cache.set(`timetable_${userId}`, timetable, 3600);
    
    sendResponse(res, true, timetable, 'Timetable regenerated successfully');
  } catch (error) {
    console.error('Timetable regeneration error:', error);
    sendResponse(res, false, null, 'Failed to regenerate timetable', 500);
  }
});

// Constraints endpoints
app.get('/api/constraints/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const constraints = await db.getConstraintsByUser(userId);
    sendResponse(res, true, constraints, 'Constraints retrieved');
  } catch (error) {
    console.error('Get constraints error:', error);
    sendResponse(res, false, null, 'Failed to retrieve constraints', 500);
  }
});

app.post('/api/constraints', async (req, res) => {
  try {
    const { userId = 1, type, dayOfWeek, startTime, endTime, description } = req.body;
    
    if (!type) {
      return sendResponse(res, false, null, 'Constraint type is required', 400);
    }

    const constraintId = await db.createConstraint({
      userId,
      type,
      dayOfWeek,
      startTime,
      endTime,
      description
    });

    // Invalidate timetable cache
    await cache.invalidate(`timetable_${userId}`);
    
    sendResponse(res, true, { id: constraintId }, 'Constraint created successfully');
  } catch (error) {
    console.error('Create constraint error:', error);
    sendResponse(res, false, null, 'Failed to create constraint', 500);
  }
});

app.delete('/api/constraints/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await db.deleteConstraint(id);
    
    // Invalidate timetable cache for all users (simple approach)
    await cache.invalidatePattern('timetable_');
    
    sendResponse(res, true, null, 'Constraint deleted successfully');
  } catch (error) {
    console.error('Delete constraint error:', error);
    sendResponse(res, false, null, 'Failed to delete constraint', 500);
  }
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
});

// Error handling
app.use(errorHandler);

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  await db.close();
  process.exit(0);
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Hanu-Planner server running on port ${PORT}`);
  
  try {
    await db.initialize();
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
});

module.exports = app;
