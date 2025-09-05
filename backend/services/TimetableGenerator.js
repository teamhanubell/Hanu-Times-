class TimetableGenerator {
  constructor(database) {
    this.db = database;
    this.dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    this.timeSlots = this.generateTimeSlots();
  }

  generateTimeSlots() {
    const slots = [];
    for (let hour = 8; hour <= 20; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(time);
      }
    }
    return slots;
  }

  async generateTimetable(userId) {
    try {
      const [courses, sessions, constraints] = await Promise.all([
        this.db.getCoursesByUser(userId),
        this.db.getSessionsByUser(userId),
        this.db.getConstraintsByUser(userId)
      ]);

      if (sessions.length === 0) {
        return {
          schedule: this.createEmptySchedule(),
          conflicts: [],
          suggestions: ['Add some courses and sessions to generate your timetable'],
          score: 0,
          stats: { totalSessions: 0, totalHours: 0, averageHoursPerDay: 0 }
        };
      }

      // Create base schedule
      const schedule = this.createEmptySchedule();
      const conflicts = [];
      const placedSessions = [];

      // Sort sessions by priority (course priority, then session type)
      const sortedSessions = this.prioritizeSessions(sessions, courses);

      // Place sessions in schedule
      for (const session of sortedSessions) {
        const placement = this.findBestPlacement(session, schedule, constraints, placedSessions);
        
        if (placement.success) {
          this.placeSession(schedule, session, placement);
          placedSessions.push({ ...session, ...placement });
        } else {
          conflicts.push({
            session,
            reason: placement.reason,
            suggestions: placement.suggestions
          });
        }
      }

      // Generate suggestions for optimization
      const suggestions = this.generateSuggestions(schedule, conflicts, constraints);
      
      // Calculate score
      const score = this.calculateScore(schedule, conflicts, constraints);
      
      // Generate statistics
      const stats = this.calculateStats(schedule);

      return {
        schedule,
        conflicts,
        suggestions,
        score,
        stats,
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('Timetable generation error:', error);
      throw error;
    }
  }

  createEmptySchedule() {
    const schedule = {};
    for (let day = 0; day <= 6; day++) {
      schedule[day] = {
        dayName: this.dayNames[day],
        sessions: [],
        totalHours: 0
      };
    }
    return schedule;
  }

  prioritizeSessions(sessions, courses) {
    const courseMap = new Map(courses.map(c => [c.id, c]));
    
    return sessions.sort((a, b) => {
      const courseA = courseMap.get(a.course_id);
      const courseB = courseMap.get(b.course_id);
      
      // Priority by course priority (1 = high, 2 = medium, 3 = low)
      if (courseA.priority !== courseB.priority) {
        return courseA.priority - courseB.priority;
      }
      
      // Priority by session type (labs are harder to reschedule)
      const typeOrder = { lab: 1, tutorial: 2, lecture: 3, seminar: 4 };
      const typeA = typeOrder[a.type] || 5;
      const typeB = typeOrder[b.type] || 5;
      
      if (typeA !== typeB) {
        return typeA - typeB;
      }
      
      // Priority by duration (longer sessions first)
      const durationA = this.calculateDuration(a.start_time, a.end_time);
      const durationB = this.calculateDuration(b.start_time, b.end_time);
      
      return durationB - durationA;
    });
  }

  findBestPlacement(session, schedule, constraints, placedSessions) {
    const dayOfWeek = session.day_of_week;
    const startTime = session.start_time;
    const endTime = session.end_time;

    // Check if the preferred time slot is available
    if (this.isTimeSlotAvailable(dayOfWeek, startTime, endTime, schedule, constraints)) {
      return {
        success: true,
        dayOfWeek,
        startTime,
        endTime
      };
    }

    // Try to find alternative slots on the same day
    const alternatives = this.findAlternativeSlots(session, dayOfWeek, schedule, constraints);
    if (alternatives.length > 0) {
      return {
        success: true,
        dayOfWeek,
        startTime: alternatives[0].startTime,
        endTime: alternatives[0].endTime,
        isAlternative: true
      };
    }

    // Try other days if flexible
    for (let day = 1; day <= 5; day++) { // Monday to Friday
      if (day === dayOfWeek) continue;
      
      const dayAlternatives = this.findAlternativeSlots(session, day, schedule, constraints);
      if (dayAlternatives.length > 0) {
        return {
          success: true,
          dayOfWeek: day,
          startTime: dayAlternatives[0].startTime,
          endTime: dayAlternatives[0].endTime,
          isDifferentDay: true
        };
      }
    }

    // Could not place session
    return {
      success: false,
      reason: 'No available time slots found',
      suggestions: [
        'Consider adjusting session timing',
        'Check for conflicting constraints',
        'Review other sessions on this day'
      ]
    };
  }

  isTimeSlotAvailable(dayOfWeek, startTime, endTime, schedule, constraints) {
    // Check for conflicts with existing sessions
    const daySchedule = schedule[dayOfWeek];
    for (const existingSession of daySchedule.sessions) {
      if (this.timesOverlap(startTime, endTime, existingSession.start_time, existingSession.end_time)) {
        return false;
      }
    }

    // Check constraints
    for (const constraint of constraints) {
      if (constraint.day_of_week === null || constraint.day_of_week === dayOfWeek) {
        if (constraint.type === 'unavailable') {
          if (this.timesOverlap(startTime, endTime, constraint.start_time, constraint.end_time)) {
            return false;
          }
        }
      }
    }

    return true;
  }

  findAlternativeSlots(session, dayOfWeek, schedule, constraints) {
    const duration = this.calculateDuration(session.start_time, session.end_time);
    const alternatives = [];

    for (let i = 0; i < this.timeSlots.length - 1; i++) {
      const startTime = this.timeSlots[i];
      const endTime = this.addMinutes(startTime, duration);
      
      if (endTime && this.isTimeSlotAvailable(dayOfWeek, startTime, endTime, schedule, constraints)) {
        alternatives.push({ startTime, endTime });
      }
    }

    return alternatives;
  }

  placeSession(schedule, session, placement) {
    const daySchedule = schedule[placement.dayOfWeek];
    const duration = this.calculateDuration(placement.startTime, placement.endTime);
    
    daySchedule.sessions.push({
      ...session,
      start_time: placement.startTime,
      end_time: placement.endTime,
      duration: duration,
      isAlternative: placement.isAlternative || false,
      isDifferentDay: placement.isDifferentDay || false
    });

    daySchedule.sessions.sort((a, b) => a.start_time.localeCompare(b.start_time));
    daySchedule.totalHours += duration / 60;
  }

  timesOverlap(start1, end1, start2, end2) {
    return start1 < end2 && end1 > start2;
  }

  calculateDuration(startTime, endTime) {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    return endMinutes - startMinutes;
  }

  addMinutes(time, minutes) {
    const [hour, min] = time.split(':').map(Number);
    const totalMinutes = hour * 60 + min + minutes;
    
    if (totalMinutes >= 21 * 60) return null; // Don't schedule after 9 PM
    
    const newHour = Math.floor(totalMinutes / 60);
    const newMin = totalMinutes % 60;
    
    return `${newHour.toString().padStart(2, '0')}:${newMin.toString().padStart(2, '0')}`;
  }

  generateSuggestions(schedule, conflicts, constraints) {
    const suggestions = [];

    // Analyze schedule balance
    const dailyHours = Object.values(schedule).map(day => day.totalHours);
    const maxHours = Math.max(...dailyHours);
    const minHours = Math.min(...dailyHours);
    
    if (maxHours - minHours > 3) {
      suggestions.push('Consider redistributing sessions for better daily balance');
    }

    // Check for gaps
    Object.entries(schedule).forEach(([dayNum, dayData]) => {
      if (dayData.sessions.length > 1) {
        const gaps = this.findGaps(dayData.sessions);
        if (gaps.some(gap => gap > 120)) { // 2+ hour gaps
          suggestions.push(`Consider filling large gaps on ${dayData.dayName}`);
        }
      }
    });

    // Conflict-based suggestions
    if (conflicts.length > 0) {
      suggestions.push(`Resolve ${conflicts.length} scheduling conflict${conflicts.length > 1 ? 's' : ''}`);
    }

    // Back-to-back sessions check
    Object.values(schedule).forEach(dayData => {
      let consecutiveCount = 0;
      for (let i = 0; i < dayData.sessions.length - 1; i++) {
        if (dayData.sessions[i].end_time === dayData.sessions[i + 1].start_time) {
          consecutiveCount++;
        }
      }
      if (consecutiveCount > 2) {
        suggestions.push(`Consider adding breaks on ${dayData.dayName}`);
      }
    });

    return suggestions.length > 0 ? suggestions : ['Your timetable looks well optimized!'];
  }

  findGaps(sessions) {
    const gaps = [];
    for (let i = 0; i < sessions.length - 1; i++) {
      const gap = this.calculateDuration(sessions[i].end_time, sessions[i + 1].start_time);
      gaps.push(gap);
    }
    return gaps;
  }

  calculateScore(schedule, conflicts, constraints) {
    let score = 100;

    // Deduct points for conflicts
    score -= conflicts.length * 20;

    // Deduct points for imbalanced schedule
    const dailyHours = Object.values(schedule).map(day => day.totalHours);
    const maxHours = Math.max(...dailyHours);
    const minHours = Math.min(...dailyHours);
    const imbalance = maxHours - minHours;
    score -= imbalance * 5;

    // Deduct points for large gaps
    Object.values(schedule).forEach(dayData => {
      if (dayData.sessions.length > 1) {
        const gaps = this.findGaps(dayData.sessions);
        gaps.forEach(gap => {
          if (gap > 120) score -= 5; // 2+ hour gap
          if (gap > 180) score -= 10; // 3+ hour gap
        });
      }
    });

    // Bonus for preferred times (9 AM - 5 PM)
    Object.values(schedule).forEach(dayData => {
      dayData.sessions.forEach(session => {
        const startHour = parseInt(session.start_time.split(':')[0]);
        if (startHour >= 9 && startHour <= 17) {
          score += 2;
        }
      });
    });

    return Math.max(0, Math.min(100, score));
  }

  calculateStats(schedule) {
    let totalSessions = 0;
    let totalHours = 0;
    const sessionsByType = {};
    const sessionsByDay = {};

    Object.entries(schedule).forEach(([dayNum, dayData]) => {
      totalSessions += dayData.sessions.length;
      totalHours += dayData.totalHours;
      sessionsByDay[dayData.dayName] = dayData.sessions.length;

      dayData.sessions.forEach(session => {
        sessionsByType[session.type] = (sessionsByType[session.type] || 0) + 1;
      });
    });

    const workingDays = Object.values(schedule).filter(day => day.sessions.length > 0).length;
    const averageHoursPerDay = workingDays > 0 ? totalHours / workingDays : 0;

    return {
      totalSessions,
      totalHours: Math.round(totalHours * 10) / 10,
      averageHoursPerDay: Math.round(averageHoursPerDay * 10) / 10,
      workingDays,
      sessionsByType,
      sessionsByDay
    };
  }

  // Optimize existing timetable
  async optimizeTimetable(userId, currentTimetable) {
    try {
      const constraints = await this.db.getConstraintsByUser(userId);
      
      // Try to improve the current schedule
      const optimized = this.localOptimization(currentTimetable.schedule, constraints);
      
      return {
        ...currentTimetable,
        schedule: optimized.schedule,
        score: this.calculateScore(optimized.schedule, [], constraints),
        suggestions: this.generateSuggestions(optimized.schedule, [], constraints),
        optimizedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Timetable optimization error:', error);
      throw error;
    }
  }

  localOptimization(schedule, constraints) {
    // Simple local optimization: try to move sessions to better time slots
    const optimizedSchedule = JSON.parse(JSON.stringify(schedule));
    
    Object.values(optimizedSchedule).forEach(dayData => {
      // Sort sessions to minimize gaps
      dayData.sessions.sort((a, b) => {
        const aStart = a.start_time;
        const bStart = b.start_time;
        return aStart.localeCompare(bStart);
      });
    });

    return { schedule: optimizedSchedule };
  }
}

module.exports = TimetableGenerator;
