const nlp = require('compromise');

class ChatBot {
  constructor(database) {
    this.db = database;
    this.intents = this.initializeIntents();
    this.context = new Map(); // Store conversation context per user
  }

  initializeIntents() {
    return {
      // Course management
      add_course: {
        patterns: [
          /add.*course/i,
          /create.*course/i,
          /new.*course/i,
          /course.*add/i
        ],
        entities: ['course_name', 'course_code', 'priority', 'credits']
      },
      
      // Session scheduling
      schedule_session: {
        patterns: [
          /schedule.*class/i,
          /add.*session/i,
          /class.*on/i,
          /lab.*on/i,
          /lecture.*at/i
        ],
        entities: ['course_name', 'session_type', 'day', 'time', 'location']
      },
      
      // Timetable operations
      generate_timetable: {
        patterns: [
          /generate.*timetable/i,
          /create.*schedule/i,
          /make.*timetable/i,
          /build.*schedule/i
        ],
        entities: []
      },
      
      // Constraints
      add_constraint: {
        patterns: [
          /can't.*on/i,
          /unavailable.*on/i,
          /busy.*on/i,
          /no.*class.*after/i,
          /break.*between/i
        ],
        entities: ['constraint_type', 'day', 'time']
      },
      
      // Information queries
      show_schedule: {
        patterns: [
          /show.*schedule/i,
          /view.*timetable/i,
          /what.*today/i,
          /schedule.*for/i
        ],
        entities: ['day']
      },
      
      // Modifications
      modify_session: {
        patterns: [
          /change.*time/i,
          /move.*class/i,
          /reschedule/i,
          /update.*session/i
        ],
        entities: ['course_name', 'new_time', 'new_day']
      },
      
      // General help
      help: {
        patterns: [
          /help/i,
          /what.*can.*do/i,
          /how.*work/i,
          /commands/i
        ],
        entities: []
      }
    };
  }

  async processMessage(message, userId) {
    try {
      // Detect intent and extract entities
      const analysis = this.analyzeMessage(message);
      
      // Generate response based on intent
      const response = await this.generateResponse(analysis, userId);
      
      // Save to chat history
      await this.db.saveChatMessage(userId, message, response.text, analysis.intent, analysis.entities);
      
      // Update context
      this.updateContext(userId, analysis, response);
      
      return response;
    } catch (error) {
      console.error('ChatBot processing error:', error);
      return {
        text: "I'm sorry, I encountered an error processing your message. Please try again.",
        intent: 'error',
        entities: {},
        actions: []
      };
    }
  }

  analyzeMessage(message) {
    const doc = nlp(message);
    let detectedIntent = 'unknown';
    let confidence = 0;
    
    // Intent detection
    for (const [intent, config] of Object.entries(this.intents)) {
      for (const pattern of config.patterns) {
        if (pattern.test(message)) {
          detectedIntent = intent;
          confidence = 0.8;
          break;
        }
      }
      if (confidence > 0) break;
    }
    
    // Entity extraction
    const entities = this.extractEntities(doc, message, detectedIntent);
    
    return {
      intent: detectedIntent,
      confidence,
      entities,
      originalMessage: message
    };
  }

  extractEntities(doc, message, intent) {
    const entities = {};
    
    // Extract course names (proper nouns, capitalized words)
    const courseNames = doc.match('#ProperNoun+').out('array');
    if (courseNames.length > 0) {
      entities.course_name = courseNames[0];
    }
    
    // Extract days
    const dayPattern = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/gi;
    const dayMatch = message.match(dayPattern);
    if (dayMatch) {
      entities.day = this.normalizeDayName(dayMatch[0]);
    }
    
    // Extract times
    const timePattern = /\b(\d{1,2}):?(\d{2})?\s*(am|pm)?\b/gi;
    const timeMatches = message.match(timePattern);
    if (timeMatches) {
      entities.time = this.normalizeTime(timeMatches[0]);
    }
    
    // Extract time ranges
    const rangePattern = /(\d{1,2}):?(\d{2})?\s*(am|pm)?\s*(?:to|-|until)\s*(\d{1,2}):?(\d{2})?\s*(am|pm)?/gi;
    const rangeMatch = message.match(rangePattern);
    if (rangeMatch) {
      const times = this.parseTimeRange(rangeMatch[0]);
      entities.start_time = times.start;
      entities.end_time = times.end;
    }
    
    // Extract session types
    const typePattern = /\b(lecture|lab|tutorial|seminar|class)\b/gi;
    const typeMatch = message.match(typePattern);
    if (typeMatch) {
      entities.session_type = typeMatch[0].toLowerCase();
    }
    
    // Extract locations
    const locationPattern = /\b(?:room|hall|lab|building)\s+([A-Z0-9]+)\b/gi;
    const locationMatch = message.match(locationPattern);
    if (locationMatch) {
      entities.location = locationMatch[0];
    }
    
    // Extract priorities
    const priorityPattern = /\b(high|medium|low|important|urgent)\b/gi;
    const priorityMatch = message.match(priorityPattern);
    if (priorityMatch) {
      entities.priority = this.normalizePriority(priorityMatch[0]);
    }
    
    return entities;
  }

  async generateResponse(analysis, userId) {
    const { intent, entities } = analysis;
    
    switch (intent) {
      case 'add_course':
        return await this.handleAddCourse(entities, userId);
      
      case 'schedule_session':
        return await this.handleScheduleSession(entities, userId);
      
      case 'generate_timetable':
        return await this.handleGenerateTimetable(userId);
      
      case 'add_constraint':
        return await this.handleAddConstraint(entities, userId);
      
      case 'show_schedule':
        return await this.handleShowSchedule(entities, userId);
      
      case 'modify_session':
        return await this.handleModifySession(entities, userId);
      
      case 'help':
        return this.handleHelp();
      
      default:
        return this.handleUnknown(analysis);
    }
  }

  async handleAddCourse(entities, userId) {
    try {
      if (!entities.course_name) {
        return {
          text: "I'd be happy to help you add a course! What's the name of the course you want to add?",
          intent: 'add_course',
          entities,
          actions: ['request_course_name']
        };
      }

      const courseData = {
        userId,
        name: entities.course_name,
        code: entities.course_code || '',
        priority: entities.priority || 1,
        credits: entities.credits || 3,
        color: this.generateCourseColor(),
        description: ''
      };

      const courseId = await this.db.createCourse(courseData);
      
      return {
        text: `Great! I've added "${entities.course_name}" to your courses. Would you like to schedule some sessions for this course?`,
        intent: 'add_course',
        entities: { ...entities, course_id: courseId },
        actions: ['course_created', 'suggest_schedule_session']
      };
    } catch (error) {
      return {
        text: `I encountered an error adding the course: ${error.message}. Please try again.`,
        intent: 'add_course',
        entities,
        actions: ['error']
      };
    }
  }

  async handleScheduleSession(entities, userId) {
    try {
      if (!entities.course_name) {
        const courses = await this.db.getCoursesByUser(userId);
        if (courses.length === 0) {
          return {
            text: "You don't have any courses yet. Would you like to add a course first?",
            intent: 'schedule_session',
            entities,
            actions: ['suggest_add_course']
          };
        }
        
        const courseList = courses.map(c => c.name).join(', ');
        return {
          text: `Which course would you like to schedule? Your courses: ${courseList}`,
          intent: 'schedule_session',
          entities,
          actions: ['request_course_selection']
        };
      }

      // Find the course
      const courses = await this.db.getCoursesByUser(userId);
      const course = courses.find(c => 
        c.name.toLowerCase().includes(entities.course_name.toLowerCase()) ||
        c.code.toLowerCase() === entities.course_name.toLowerCase()
      );

      if (!course) {
        return {
          text: `I couldn't find a course named "${entities.course_name}". Would you like to add it first?`,
          intent: 'schedule_session',
          entities,
          actions: ['suggest_add_course']
        };
      }

      if (!entities.day || !entities.start_time || !entities.end_time) {
        return {
          text: `To schedule a session for ${course.name}, I need the day and time. For example: "Schedule Python Lab on Tuesday 2-4 PM"`,
          intent: 'schedule_session',
          entities: { ...entities, course_id: course.id },
          actions: ['request_schedule_details']
        };
      }

      const sessionData = {
        courseId: course.id,
        type: entities.session_type || 'lecture',
        dayOfWeek: this.dayNameToNumber(entities.day),
        startTime: entities.start_time,
        endTime: entities.end_time,
        location: entities.location || '',
        instructor: entities.instructor || ''
      };

      const sessionId = await this.db.createSession(sessionData);
      
      return {
        text: `Perfect! I've scheduled a ${sessionData.type} for ${course.name} on ${entities.day} from ${entities.start_time} to ${entities.end_time}. Would you like me to regenerate your timetable?`,
        intent: 'schedule_session',
        entities: { ...entities, session_id: sessionId },
        actions: ['session_created', 'suggest_regenerate_timetable']
      };
    } catch (error) {
      return {
        text: `I encountered an error scheduling the session: ${error.message}. Please try again.`,
        intent: 'schedule_session',
        entities,
        actions: ['error']
      };
    }
  }

  async handleGenerateTimetable(userId) {
    try {
      const TimetableGenerator = require('./TimetableGenerator');
      const generator = new TimetableGenerator(this.db);
      
      const timetable = await generator.generateTimetable(userId);
      
      if (timetable.schedule && Object.values(timetable.schedule).some(day => day.sessions.length > 0)) {
        await this.db.saveTimetable(userId, 'AI Generated', timetable);
        
        const stats = timetable.stats;
        let response = `I've generated your timetable! Here's what I found:\n\n`;
        response += `📊 **Schedule Summary:**\n`;
        response += `• Total sessions: ${stats.totalSessions}\n`;
        response += `• Total hours: ${stats.totalHours}\n`;
        response += `• Working days: ${stats.workingDays}\n`;
        response += `• Score: ${Math.round(timetable.score)}/100\n\n`;
        
        if (timetable.conflicts.length > 0) {
          response += `⚠️ **Conflicts found:** ${timetable.conflicts.length}\n`;
        }
        
        if (timetable.suggestions.length > 0) {
          response += `💡 **Suggestions:**\n${timetable.suggestions.map(s => `• ${s}`).join('\n')}`;
        }
        
        return {
          text: response,
          intent: 'generate_timetable',
          entities: {},
          actions: ['timetable_generated'],
          data: timetable
        };
      } else {
        return {
          text: "I couldn't generate a timetable because you don't have any sessions scheduled yet. Would you like to add some courses and sessions first?",
          intent: 'generate_timetable',
          entities: {},
          actions: ['suggest_add_courses']
        };
      }
    } catch (error) {
      return {
        text: `I encountered an error generating your timetable: ${error.message}. Please try again.`,
        intent: 'generate_timetable',
        entities: {},
        actions: ['error']
      };
    }
  }

  async handleShowSchedule(entities, userId) {
    try {
      const sessions = await this.db.getSessionsByUser(userId);
      
      if (sessions.length === 0) {
        return {
          text: "You don't have any sessions scheduled yet. Would you like to add some?",
          intent: 'show_schedule',
          entities,
          actions: ['suggest_add_sessions']
        };
      }

      let response = "📅 **Your Current Schedule:**\n\n";
      
      // Group by day
      const sessionsByDay = {};
      sessions.forEach(session => {
        const dayName = this.dayNames[session.day_of_week];
        if (!sessionsByDay[dayName]) {
          sessionsByDay[dayName] = [];
        }
        sessionsByDay[dayName].push(session);
      });

      // Sort and display
      Object.entries(sessionsByDay).forEach(([day, daySessions]) => {
        response += `**${day}:**\n`;
        daySessions.sort((a, b) => a.start_time.localeCompare(b.start_time));
        daySessions.forEach(session => {
          response += `• ${session.start_time}-${session.end_time}: ${session.course_name} (${session.type})`;
          if (session.location) response += ` - ${session.location}`;
          response += '\n';
        });
        response += '\n';
      });

      return {
        text: response,
        intent: 'show_schedule',
        entities,
        actions: ['schedule_displayed'],
        data: sessionsByDay
      };
    } catch (error) {
      return {
        text: `I encountered an error showing your schedule: ${error.message}. Please try again.`,
        intent: 'show_schedule',
        entities,
        actions: ['error']
      };
    }
  }

  async handleAddConstraint(entities, userId) {
    try {
      const constraintData = {
        userId,
        type: 'unavailable',
        dayOfWeek: entities.day ? this.dayNameToNumber(entities.day) : null,
        startTime: entities.start_time || null,
        endTime: entities.end_time || null,
        description: entities.description || 'User constraint'
      };

      const constraintId = await this.db.createConstraint(constraintData);
      
      let response = "I've added your constraint! ";
      if (entities.day && entities.start_time && entities.end_time) {
        response += `You're marked as unavailable on ${entities.day} from ${entities.start_time} to ${entities.end_time}.`;
      } else if (entities.day) {
        response += `You're marked as unavailable on ${entities.day}.`;
      } else {
        response += "I've noted your scheduling preference.";
      }
      
      response += " Would you like me to regenerate your timetable to account for this?";

      return {
        text: response,
        intent: 'add_constraint',
        entities: { ...entities, constraint_id: constraintId },
        actions: ['constraint_added', 'suggest_regenerate_timetable']
      };
    } catch (error) {
      return {
        text: `I encountered an error adding the constraint: ${error.message}. Please try again.`,
        intent: 'add_constraint',
        entities,
        actions: ['error']
      };
    }
  }

  handleHelp() {
    const helpText = `🤖 **Hanu-Planner Assistant Help**

I can help you manage your academic timetable! Here's what I can do:

**📚 Course Management:**
• "Add Python Programming course"
• "Create a new course called Data Structures"

**📅 Session Scheduling:**
• "Schedule Python Lab on Tuesday 2-4 PM"
• "Add Math lecture on Monday at 9 AM"

**🗓️ Timetable Generation:**
• "Generate my timetable"
• "Create my schedule"

**⚠️ Constraints:**
• "I'm unavailable on Friday afternoons"
• "No classes after 6 PM"

**📊 Information:**
• "Show my schedule"
• "What do I have today?"

Just tell me what you'd like to do in natural language, and I'll help you out!`;

    return {
      text: helpText,
      intent: 'help',
      entities: {},
      actions: ['help_displayed']
    };
  }

  handleUnknown(analysis) {
    return {
      text: "I'm not sure I understand. Could you rephrase that? You can ask me to add courses, schedule sessions, generate timetables, or type 'help' for more options.",
      intent: 'unknown',
      entities: analysis.entities,
      actions: ['request_clarification']
    };
  }

  // Utility methods
  normalizeDayName(day) {
    const dayMap = {
      'mon': 'Monday', 'monday': 'Monday',
      'tue': 'Tuesday', 'tuesday': 'Tuesday',
      'wed': 'Wednesday', 'wednesday': 'Wednesday',
      'thu': 'Thursday', 'thursday': 'Thursday',
      'fri': 'Friday', 'friday': 'Friday',
      'sat': 'Saturday', 'saturday': 'Saturday',
      'sun': 'Sunday', 'sunday': 'Sunday'
    };
    return dayMap[day.toLowerCase()] || day;
  }

  dayNameToNumber(dayName) {
    const dayMap = {
      'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
      'Thursday': 4, 'Friday': 5, 'Saturday': 6
    };
    return dayMap[dayName] || 1;
  }

  normalizeTime(timeStr) {
    // Convert various time formats to HH:MM
    const match = timeStr.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
    if (!match) return timeStr;
    
    let hour = parseInt(match[1]);
    const minute = parseInt(match[2] || '0');
    const period = match[3]?.toLowerCase();
    
    if (period === 'pm' && hour !== 12) hour += 12;
    if (period === 'am' && hour === 12) hour = 0;
    
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  }

  parseTimeRange(rangeStr) {
    const match = rangeStr.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?\s*(?:to|-|until)\s*(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
    if (!match) return { start: '', end: '' };
    
    const start = this.normalizeTime(`${match[1]}:${match[2] || '00'} ${match[3] || ''}`);
    const end = this.normalizeTime(`${match[4]}:${match[5] || '00'} ${match[6] || match[3] || ''}`);
    
    return { start, end };
  }

  normalizePriority(priority) {
    const priorityMap = {
      'high': 1, 'important': 1, 'urgent': 1,
      'medium': 2, 'normal': 2,
      'low': 3
    };
    return priorityMap[priority.toLowerCase()] || 2;
  }

  generateCourseColor() {
    const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  updateContext(userId, analysis, response) {
    this.context.set(userId, {
      lastIntent: analysis.intent,
      lastEntities: analysis.entities,
      lastActions: response.actions,
      timestamp: Date.now()
    });
  }

  async getChatHistory(userId, limit = 50) {
    return await this.db.getChatHistory(userId, limit);
  }

  get dayNames() {
    return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  }
}

module.exports = ChatBot;
