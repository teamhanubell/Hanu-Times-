const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs').promises;

class Database {
  constructor() {
    this.db = null;
    this.dbPath = path.join(__dirname, '../../db/hanuplanner.db');
    this.schemaPath = path.join(__dirname, '../../db/schema.sql');
  }

  async initialize() {
    try {
      // Ensure db directory exists
      const dbDir = path.dirname(this.dbPath);
      await fs.mkdir(dbDir, { recursive: true });

      // Connect to database
      this.db = new sqlite3.Database(this.dbPath);
      
      // Enable foreign keys
      await this.run('PRAGMA foreign_keys = ON');
      
      // Initialize schema
      await this.initializeSchema();
      
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Database initialization error:', error);
      throw error;
    }
  }

  async initializeSchema() {
    try {
      const schema = await fs.readFile(this.schemaPath, 'utf8');
      const statements = schema.split(';').filter(stmt => stmt.trim());
      
      for (const statement of statements) {
        if (statement.trim()) {
          await this.run(statement);
        }
      }
    } catch (error) {
      console.error('Schema initialization error:', error);
      throw error;
    }
  }

  // Promisified database operations
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  // User operations
  async getUserById(id) {
    return this.get('SELECT * FROM users WHERE id = ?', [id]);
  }

  async createUser(userData) {
    const { name, email, preferences } = userData;
    const result = await this.run(
      'INSERT INTO users (name, email, preferences) VALUES (?, ?, ?)',
      [name, email, JSON.stringify(preferences || {})]
    );
    return result.id;
  }

  // Course operations
  async getCoursesByUser(userId) {
    return this.all('SELECT * FROM courses WHERE user_id = ? ORDER BY priority, name', [userId]);
  }

  async getCourseById(id) {
    return this.get('SELECT * FROM courses WHERE id = ?', [id]);
  }

  async createCourse(courseData) {
    const { userId, name, code, priority, credits, color, description } = courseData;
    const result = await this.run(
      'INSERT INTO courses (user_id, name, code, priority, credits, color, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, name, code, priority, credits, color, description]
    );
    return result.id;
  }

  async updateCourse(id, updates) {
    const fields = [];
    const values = [];
    
    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });
    
    if (fields.length === 0) return;
    
    values.push(id);
    await this.run(
      `UPDATE courses SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );
  }

  async deleteCourse(id) {
    await this.run('DELETE FROM courses WHERE id = ?', [id]);
  }

  // Session operations
  async getSessionsByUser(userId, filters = {}) {
    let sql = `
      SELECT s.*, c.name as course_name, c.code as course_code, c.color as course_color
      FROM sessions s
      JOIN courses c ON s.course_id = c.id
      WHERE c.user_id = ? AND s.is_active = 1
    `;
    const params = [userId];

    if (filters.courseId) {
      sql += ' AND s.course_id = ?';
      params.push(filters.courseId);
    }

    if (filters.dayOfWeek !== undefined) {
      sql += ' AND s.day_of_week = ?';
      params.push(filters.dayOfWeek);
    }

    sql += ' ORDER BY s.day_of_week, s.start_time';
    
    return this.all(sql, params);
  }

  async getSessionById(id) {
    return this.get('SELECT * FROM sessions WHERE id = ?', [id]);
  }

  async createSession(sessionData) {
    const { courseId, type, dayOfWeek, startTime, endTime, location, instructor } = sessionData;
    const result = await this.run(
      'INSERT INTO sessions (course_id, type, day_of_week, start_time, end_time, location, instructor) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [courseId, type, dayOfWeek, startTime, endTime, location, instructor]
    );
    return result.id;
  }

  async updateSession(id, updates) {
    const fields = [];
    const values = [];
    
    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });
    
    if (fields.length === 0) return;
    
    values.push(id);
    await this.run(
      `UPDATE sessions SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  async deleteSession(id) {
    await this.run('DELETE FROM sessions WHERE id = ?', [id]);
  }

  // Constraint operations
  async getConstraintsByUser(userId) {
    return this.all('SELECT * FROM constraints WHERE user_id = ? AND is_active = 1 ORDER BY day_of_week, start_time', [userId]);
  }

  async createConstraint(constraintData) {
    const { userId, type, dayOfWeek, startTime, endTime, description } = constraintData;
    const result = await this.run(
      'INSERT INTO constraints (user_id, type, day_of_week, start_time, end_time, description) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, type, dayOfWeek, startTime, endTime, description]
    );
    return result.id;
  }

  async deleteConstraint(id) {
    await this.run('DELETE FROM constraints WHERE id = ?', [id]);
  }

  // Timetable operations
  async saveTimetable(userId, name, timetableData) {
    // Mark all existing timetables as not current
    await this.run('UPDATE timetables SET is_current = 0 WHERE user_id = ?', [userId]);
    
    // Insert new timetable as current
    const result = await this.run(
      'INSERT INTO timetables (user_id, name, data, is_current, score) VALUES (?, ?, ?, 1, ?)',
      [userId, name, JSON.stringify(timetableData), timetableData.score || 0]
    );
    return result.id;
  }

  async getCurrentTimetable(userId) {
    const row = await this.get('SELECT * FROM timetables WHERE user_id = ? AND is_current = 1', [userId]);
    if (row) {
      row.data = JSON.parse(row.data);
    }
    return row;
  }

  async getTimetableHistory(userId, limit = 10) {
    const rows = await this.all(
      'SELECT * FROM timetables WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
      [userId, limit]
    );
    return rows.map(row => ({
      ...row,
      data: JSON.parse(row.data)
    }));
  }

  // Chat history operations
  async saveChatMessage(userId, message, response, intent = null, entities = null) {
    const result = await this.run(
      'INSERT INTO chat_history (user_id, message, response, intent, entities) VALUES (?, ?, ?, ?, ?)',
      [userId, message, response, intent, JSON.stringify(entities || {})]
    );
    return result.id;
  }

  async getChatHistory(userId, limit = 50) {
    const rows = await this.all(
      'SELECT * FROM chat_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
      [userId, limit]
    );
    return rows.map(row => ({
      ...row,
      entities: JSON.parse(row.entities || '{}')
    })).reverse();
  }

  // Cache operations
  async getCache(key) {
    const row = await this.get('SELECT * FROM cache WHERE key = ? AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)', [key]);
    return row ? JSON.parse(row.value) : null;
  }

  async setCache(key, value, ttlSeconds = null) {
    const expiresAt = ttlSeconds ? new Date(Date.now() + ttlSeconds * 1000).toISOString() : null;
    await this.run(
      'INSERT OR REPLACE INTO cache (key, value, expires_at) VALUES (?, ?, ?)',
      [key, JSON.stringify(value), expiresAt]
    );
  }

  async deleteCache(key) {
    await this.run('DELETE FROM cache WHERE key = ?', [key]);
  }

  async clearExpiredCache() {
    await this.run('DELETE FROM cache WHERE expires_at IS NOT NULL AND expires_at <= CURRENT_TIMESTAMP');
  }

  // Utility methods
  isConnected() {
    return this.db !== null;
  }

  async close() {
    if (this.db) {
      return new Promise((resolve) => {
        this.db.close((err) => {
          if (err) console.error('Error closing database:', err);
          else console.log('Database connection closed');
          resolve();
        });
      });
    }
  }

  // Analytics and insights
  async getScheduleStats(userId) {
    const stats = {};
    
    // Total courses
    const courseCount = await this.get('SELECT COUNT(*) as count FROM courses WHERE user_id = ?', [userId]);
    stats.totalCourses = courseCount.count;
    
    // Total sessions
    const sessionCount = await this.get(`
      SELECT COUNT(*) as count FROM sessions s
      JOIN courses c ON s.course_id = c.id
      WHERE c.user_id = ? AND s.is_active = 1
    `, [userId]);
    stats.totalSessions = sessionCount.count;
    
    // Sessions by day
    const sessionsByDay = await this.all(`
      SELECT s.day_of_week, COUNT(*) as count
      FROM sessions s
      JOIN courses c ON s.course_id = c.id
      WHERE c.user_id = ? AND s.is_active = 1
      GROUP BY s.day_of_week
      ORDER BY s.day_of_week
    `, [userId]);
    stats.sessionsByDay = sessionsByDay;
    
    // Sessions by type
    const sessionsByType = await this.all(`
      SELECT s.type, COUNT(*) as count
      FROM sessions s
      JOIN courses c ON s.course_id = c.id
      WHERE c.user_id = ? AND s.is_active = 1
      GROUP BY s.type
    `, [userId]);
    stats.sessionsByType = sessionsByType;
    
    return stats;
  }
}

module.exports = Database;
