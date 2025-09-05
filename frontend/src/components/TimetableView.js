import React, { useState } from 'react';

const TimetableView = ({ userData, onDataUpdate, showNotification, apiBase }) => {
  const [selectedSession, setSelectedSession] = useState(null);
  const [viewMode, setViewMode] = useState('week'); // 'week' or 'day'

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const timeSlots = [];
  
  // Generate time slots from 8 AM to 8 PM
  for (let hour = 8; hour <= 20; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
  }

  const handleRegenerateTimetable = async () => {
    try {
      const response = await fetch(`${apiBase}/timetable/regenerate/1`, {
        method: 'POST'
      });
      const result = await response.json();
      
      if (result.success) {
        await onDataUpdate('timetable');
        showNotification('Timetable regenerated successfully!', 'success');
      } else {
        showNotification('Failed to regenerate timetable', 'error');
      }
    } catch (error) {
      showNotification('Error regenerating timetable', 'error');
    }
  };

  const renderTimetableGrid = () => {
    const schedule = userData.timetable?.schedule || {};
    
    return (
      <div className="timetable-grid">
        {/* Header row */}
        <div className="timetable-header"></div>
        {dayNames.slice(1, 6).map(day => ( // Monday to Friday
          <div key={day} className="timetable-header">{day}</div>
        ))}
        
        {/* Time slots and sessions */}
        {timeSlots.map(time => (
          <React.Fragment key={time}>
            <div className="timetable-time">{time}</div>
            {dayNames.slice(1, 6).map((day, dayIndex) => {
              const dayNum = dayIndex + 1;
              const daySchedule = schedule[dayNum];
              const sessionsAtTime = daySchedule?.sessions?.filter(session => 
                session.start_time <= time && session.end_time > time
              ) || [];
              
              return (
                <div key={`${day}-${time}`} className="timetable-cell">
                  {sessionsAtTime.map(session => {
                    const startHour = parseInt(session.start_time.split(':')[0]);
                    const endHour = parseInt(session.end_time.split(':')[0]);
                    const duration = endHour - startHour;
                    
                    // Only render session block at its start time
                    if (session.start_time === time) {
                      return (
                        <div
                          key={session.id}
                          className="timetable-session"
                          style={{
                            height: `${duration * 60 - 4}px`,
                            backgroundColor: session.course_color || '#3B82F6',
                            zIndex: 10
                          }}
                          onClick={() => setSelectedSession(session)}
                        >
                          <div className="session-title">{session.course_name}</div>
                          <div className="session-details">
                            {session.type} • {session.start_time}-{session.end_time}
                            {session.location && ` • ${session.location}`}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const renderDayView = () => {
    // Implementation for day view would go here
    return <div>Day view coming soon...</div>;
  };

  const timetableStats = userData.timetable?.stats || {};
  const conflicts = userData.timetable?.conflicts || [];
  const suggestions = userData.timetable?.suggestions || [];

  return (
    <div className="grid gap-6">
      {/* Timetable Header */}
      <div className="card">
        <div className="card-header">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="card-title">📅 Your Timetable</h3>
              <p className="card-subtitle">
                {timetableStats.totalSessions || 0} sessions • {timetableStats.totalHours || 0} hours • 
                Score: {userData.timetable?.score ? Math.round(userData.timetable.score) : 0}/100
              </p>
            </div>
            <div className="flex gap-2">
              <button
                className={`btn btn-sm ${viewMode === 'week' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setViewMode('week')}
              >
                Week
              </button>
              <button
                className={`btn btn-sm ${viewMode === 'day' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setViewMode('day')}
              >
                Day
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleRegenerateTimetable}
              >
                🔄 Regenerate
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Conflicts and Suggestions */}
      {(conflicts.length > 0 || suggestions.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {conflicts.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h4 className="card-title text-red-600">⚠️ Conflicts ({conflicts.length})</h4>
              </div>
              <div className="card-content">
                <div className="space-y-2">
                  {conflicts.slice(0, 3).map((conflict, index) => (
                    <div key={index} className="p-3 bg-red-50 rounded-lg">
                      <div className="font-medium text-sm">{conflict.session.course_name}</div>
                      <div className="text-xs text-red-600">{conflict.reason}</div>
                    </div>
                  ))}
                  {conflicts.length > 3 && (
                    <div className="text-sm text-muted">+{conflicts.length - 3} more conflicts</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {suggestions.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h4 className="card-title text-blue-600">💡 Suggestions</h4>
              </div>
              <div className="card-content">
                <div className="space-y-2">
                  {suggestions.slice(0, 3).map((suggestion, index) => (
                    <div key={index} className="p-3 bg-blue-50 rounded-lg">
                      <div className="text-sm">{suggestion}</div>
                    </div>
                  ))}
                  {suggestions.length > 3 && (
                    <div className="text-sm text-muted">+{suggestions.length - 3} more suggestions</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Timetable Grid */}
      <div className="card">
        <div className="card-content">
          {userData.timetable ? (
            viewMode === 'week' ? renderTimetableGrid() : renderDayView()
          ) : (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📅</div>
              <h3 className="text-lg font-semibold mb-2">No Timetable Generated</h3>
              <p className="text-muted mb-4">
                Add some courses and sessions, then generate your timetable to see it here.
              </p>
              <button
                className="btn btn-primary"
                onClick={handleRegenerateTimetable}
              >
                🚀 Generate Timetable
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Session Details Modal */}
      {selectedSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="card max-w-md w-full mx-4">
            <div className="card-header">
              <h4 className="card-title">{selectedSession.course_name}</h4>
              <button
                className="text-gray-500 hover:text-gray-700"
                onClick={() => setSelectedSession(null)}
              >
                ✕
              </button>
            </div>
            <div className="card-content">
              <div className="space-y-3">
                <div>
                  <span className="font-medium">Type:</span> {selectedSession.type}
                </div>
                <div>
                  <span className="font-medium">Time:</span> {selectedSession.start_time} - {selectedSession.end_time}
                </div>
                {selectedSession.location && (
                  <div>
                    <span className="font-medium">Location:</span> {selectedSession.location}
                  </div>
                )}
                {selectedSession.instructor && (
                  <div>
                    <span className="font-medium">Instructor:</span> {selectedSession.instructor}
                  </div>
                )}
                <div>
                  <span className="font-medium">Duration:</span> {
                    Math.round((new Date(`2000-01-01 ${selectedSession.end_time}`) - 
                              new Date(`2000-01-01 ${selectedSession.start_time}`)) / (1000 * 60)) 
                  } minutes
                </div>
              </div>
            </div>
            <div className="card-footer">
              <button
                className="btn btn-secondary w-full"
                onClick={() => setSelectedSession(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimetableView;
