const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Server-side fallback parser (mirrors frontend logic)
const parseNaturalTextServer = (text) => {
  const entries = [];
  
  // Split by common separators for multiple entries
  const lines = text.split(/[;\n]/).filter(line => line.trim());
  
  for (const line of lines) {
    // Extract days - handle multiple days with &, and, comma
    const dayPatterns = /\b(mon|monday|tue|tuesday|wed|wednesday|thu|thursday|fri|friday|sat|saturday|sun|sunday)\b/gi;
    const dayMatches = line.match(dayPatterns) || [];
    
    // Normalize day names
    const normalizedDays = dayMatches.map(day => {
      const d = day.toLowerCase();
      if (d.startsWith('mon')) return 'Monday';
      if (d.startsWith('tue')) return 'Tuesday';
      if (d.startsWith('wed')) return 'Wednesday';
      if (d.startsWith('thu')) return 'Thursday';
      if (d.startsWith('fri')) return 'Friday';
      if (d.startsWith('sat')) return 'Saturday';
      if (d.startsWith('sun')) return 'Sunday';
      return day;
    });
    
    // Extract times - handle various formats
    const timePatterns = /(\d{1,2}):?(\d{2})?\s*(am|pm)?\s*(?:to|-|–|until)\s*(\d{1,2}):?(\d{2})?\s*(am|pm)?/gi;
    const simpleTimePattern = /(\d{1,2})\s*(?:to|-|–|until)\s*(\d{1,2})/gi;
    
    let startTime = '', endTime = '';
    
    const timeMatch = timePatterns.exec(line) || simpleTimePattern.exec(line);
    if (timeMatch) {
      let start = parseInt(timeMatch[1]);
      let startMin = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      const startPeriod = timeMatch[3]?.toLowerCase();
      
      let end = parseInt(timeMatch[4] || timeMatch[2]);
      let endMin = timeMatch[5] ? parseInt(timeMatch[5]) : 0;
      const endPeriod = timeMatch[6]?.toLowerCase() || startPeriod;
      
      // Convert to 24-hour format
      if (startPeriod === 'pm' && start !== 12) start += 12;
      if (startPeriod === 'am' && start === 12) start = 0;
      if (endPeriod === 'pm' && end !== 12) end += 12;
      if (endPeriod === 'am' && end === 12) end = 0;
      
      // If no period specified, assume reasonable times
      if (!startPeriod && !endPeriod) {
        if (start < 8) start += 12; // Assume PM for early hours
        if (end < start) end += 12; // End time should be after start
      }
      
      startTime = `${start.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`;
      endTime = `${end.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
    }
    
    // Extract subject - usually the first noun phrase before time or day
    let subject = '';
    const words = line.split(/\s+/);
    for (let i = 0; i < words.length; i++) {
      const word = words[i].toLowerCase();
      if (!dayPatterns.test(word) && !word.match(/\d/) && !['to', 'and', '&', 'class', 'lab'].includes(word)) {
        subject = words[i];
        break;
      }
    }
    
    // Determine type - lab/practical vs class
    const type = /\b(lab|practical|laboratory)\b/i.test(line) ? 'lab' : 'class';
    
    // Create entries for each day
    const days = normalizedDays.length > 0 ? normalizedDays : ['Monday']; // Default to Monday
    
    for (const day of days) {
      if (startTime && endTime) {
        entries.push({
          day,
          start_time: startTime,
          end_time: endTime,
          type,
          subject: subject || 'Untitled'
        });
      }
    }
  }
  
  return entries;
};

// Database file path - use /tmp for serverless environments
const DB_PATH = process.env.NODE_ENV === 'production' 
  ? '/tmp/timetable.db' 
  : path.join(__dirname, 'timetable.db');

let db = null;

// Initialize database connection
const initDB = () => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
      if (err) {
        console.error('Error opening database:', err);
        reject(err);
        return;
      }

      // Create table if it doesn't exist
      db.run(`
        CREATE TABLE IF NOT EXISTS timetable (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          day TEXT NOT NULL,
          start_time TEXT NOT NULL,
          end_time TEXT NOT NULL,
          type TEXT NOT NULL,
          subject TEXT
        )
      `, (err) => {
        if (err) {
          console.error('Error creating table:', err);
          reject(err);
        } else {
          console.log('Database initialized successfully');
          resolve(db);
        }
      });
    });
  });
};

// Validate entry data
const validateEntry = (entry) => {
  const errors = [];
  
  const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  if (!entry.day || !validDays.includes(entry.day)) {
    errors.push('Invalid day. Must be a full weekday name (e.g., Monday)');
  }
  
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!entry.start_time || !timeRegex.test(entry.start_time)) {
    errors.push('Invalid start_time. Must be in HH:MM format');
  }
  
  if (!entry.end_time || !timeRegex.test(entry.end_time)) {
    errors.push('Invalid end_time. Must be in HH:MM format');
  }
  
  if (entry.start_time && entry.end_time && entry.start_time >= entry.end_time) {
    errors.push('start_time must be before end_time');
  }
  
  const validTypes = ['class', 'lab'];
  if (!entry.type || !validTypes.includes(entry.type)) {
    errors.push('Invalid type. Must be either "class" or "lab"');
  }
  
  return errors;
};

// Check for overlapping entries
const checkOverlap = (entry, excludeId = null) => {
  return new Promise((resolve, reject) => {
    const query = excludeId 
      ? 'SELECT * FROM timetable WHERE day = ? AND id != ?'
      : 'SELECT * FROM timetable WHERE day = ?';
    
    const params = excludeId ? [entry.day, excludeId] : [entry.day];
    
    db.all(query, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      
      const hasOverlap = rows.some(existing => {
        return (
          (entry.start_time >= existing.start_time && entry.start_time < existing.end_time) ||
          (entry.end_time > existing.start_time && entry.end_time <= existing.end_time) ||
          (entry.start_time <= existing.start_time && entry.end_time >= existing.end_time)
        );
      });
      
      resolve(hasOverlap);
    });
  });
};

// Database operations
const dbOperations = {
  // Get all timetable entries
  getAllEntries: (day = null) => {
    return new Promise(async (resolve, reject) => {
      try {
        await initDB();
        
        const query = day 
          ? 'SELECT * FROM timetable WHERE day = ? ORDER BY start_time'
          : 'SELECT * FROM timetable ORDER BY day, start_time';
        
        const params = day ? [day] : [];
        
        db.all(query, params, (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  },

  // Create new entries
  createEntries: (entries) => {
    return new Promise(async (resolve, reject) => {
      try {
        await initDB();
        
        // Validate all entries first
        const allErrors = [];
        for (let i = 0; i < entries.length; i++) {
          const errors = validateEntry(entries[i]);
          if (errors.length > 0) {
            allErrors.push(`Entry ${i + 1}: ${errors.join(', ')}`);
          }
        }
        
        if (allErrors.length > 0) {
          reject(new Error(allErrors.join('; ')));
          return;
        }
        
        // Check for overlaps
        for (const entry of entries) {
          const hasOverlap = await checkOverlap(entry);
          if (hasOverlap) {
            reject(new Error(`Overlapping entry found for ${entry.day} ${entry.start_time}-${entry.end_time}`));
            return;
          }
        }
        
        // Insert all entries
        const stmt = db.prepare('INSERT INTO timetable (day, start_time, end_time, type, subject) VALUES (?, ?, ?, ?, ?)');
        const insertedIds = [];
        
        let completed = 0;
        let hasError = false;
        
        entries.forEach((entry, index) => {
          stmt.run([entry.day, entry.start_time, entry.end_time, entry.type, entry.subject || null], function(err) {
            if (err && !hasError) {
              hasError = true;
              stmt.finalize();
              reject(err);
              return;
            }
            
            if (!hasError) {
              insertedIds[index] = this.lastID;
              completed++;
              
              if (completed === entries.length) {
                stmt.finalize();
                resolve(insertedIds);
              }
            }
          });
        });
      } catch (error) {
        reject(error);
      }
    });
  },

  // Update entry
  updateEntry: (id, entry) => {
    return new Promise(async (resolve, reject) => {
      try {
        await initDB();
        
        const errors = validateEntry(entry);
        if (errors.length > 0) {
          reject(new Error(errors.join(', ')));
          return;
        }
        
        // Check for overlaps (excluding current entry)
        const hasOverlap = await checkOverlap(entry, id);
        if (hasOverlap) {
          reject(new Error(`Overlapping entry found for ${entry.day} ${entry.start_time}-${entry.end_time}`));
          return;
        }
        
        db.run(
          'UPDATE timetable SET day = ?, start_time = ?, end_time = ?, type = ?, subject = ? WHERE id = ?',
          [entry.day, entry.start_time, entry.end_time, entry.type, entry.subject || null, id],
          function(err) {
            if (err) {
              reject(err);
            } else if (this.changes === 0) {
              reject(new Error('Entry not found'));
            } else {
              resolve(this.changes);
            }
          }
        );
      } catch (error) {
        reject(error);
      }
    });
  },

  // Delete entry
  deleteEntry: (id) => {
    return new Promise(async (resolve, reject) => {
      try {
        await initDB();
        
        db.run('DELETE FROM timetable WHERE id = ?', [id], function(err) {
          if (err) {
            reject(err);
          } else if (this.changes === 0) {
            reject(new Error('Entry not found'));
          } else {
            resolve(this.changes);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }
};

module.exports = {
  ...dbOperations,
  parseNaturalTextServer
};