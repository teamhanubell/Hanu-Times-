import React, { useState } from 'react';

// Generate a consistent color based on subject name
const getSubjectColor = (subject) => {
  let hash = 0;
  for (let i = 0; i < subject.length; i++) {
    hash = subject.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 85%)`;
};

const Timetable = ({ data, onUpdateEntry, onDeleteEntry, onClearAll, onRefresh, disabled }) => {
  const [editingEntry, setEditingEntry] = useState(null);
  const [editForm, setEditForm] = useState({});

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const hours = Array.from({ length: 16 }, (_, i) => i + 7); // 7 AM to 10 PM

  // Filter days that have entries
  const activeDays = days.filter(day => 
    data.some(entry => entry.day === day)
  );

  const displayDays = activeDays.length > 0 ? activeDays : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  const handleEdit = (entry) => {
    setEditingEntry(entry.id);
    setEditForm({
      day: entry.day,
      start_time: entry.start_time,
      end_time: entry.end_time,
      type: entry.type,
      subject: entry.subject
    });
  };

  const handleSaveEdit = () => {
    if (editForm.start_time >= editForm.end_time) {
      alert('End time must be after start time');
      return;
    }
    
    onUpdateEntry(editingEntry, editForm);
    setEditingEntry(null);
    setEditForm({});
  };

  const handleCancelEdit = () => {
    setEditingEntry(null);
    setEditForm({});
  };

  const formatTime = (time) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getEntryPosition = (startTime, endTime) => {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const startMinutes = (startHour - 7) * 60 + startMin;
    const endMinutes = (endHour - 7) * 60 + endMin;
    
    const top = (startMinutes / 60) * 60; // 60px per hour
    const height = ((endMinutes - startMinutes) / 60) * 60;
    
    return { top, height };
  };

  if (data.length === 0) {
    return (
      <div className="timetable">
        <div className="timetable-header">
          <h2>Weekly Timetable</h2>
          <div className="timetable-actions">
            <button onClick={onRefresh} disabled={disabled} className="refresh-btn">
              Refresh
            </button>
          </div>
        </div>
        <div className="empty-state">
          <p>No schedule entries found. Add some entries to see your timetable.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="timetable">
      <div className="timetable-header">
        <h2>Weekly Timetable</h2>
        <div className="timetable-actions">
          <button onClick={onRefresh} disabled={disabled} className="refresh-btn">
            Refresh
          </button>
          <button onClick={onClearAll} disabled={disabled} className="clear-btn">
            Clear All
          </button>
        </div>
      </div>

      {/* Desktop Grid View */}
      <div className="timetable-grid desktop-view">
        <div className="time-column">
          <div className="time-header"></div>
          {hours.map(hour => (
            <div key={hour} className="time-slot">
              {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
            </div>
          ))}
        </div>

        {displayDays.map(day => (
          <div key={day} className="day-column">
            <div className="day-header">{day}</div>
            <div className="day-slots">
              {hours.map(hour => (
                <div key={hour} className="hour-slot"></div>
              ))}
              
              {/* Render entries for this day */}
              {data
                .filter(entry => entry.day === day)
                .map(entry => {
                  const position = getEntryPosition(entry.start_time, entry.end_time);
                  const isEditing = editingEntry === entry.id;
                  
                  return (
                    <div
                      key={entry.id}
                      className={`entry-block ${entry.type}`}
                      style={{
                        top: `${position.top + 40}px`, // +40 for header
                        height: `${position.height}px`,
                        backgroundColor: getSubjectColor(entry.subject),
                        minHeight: '40px'
                      }}
                    >
                      {isEditing ? (
                        <div className="edit-form">
                          <input
                            type="text"
                            value={editForm.subject}
                            onChange={(e) => setEditForm({...editForm, subject: e.target.value})}
                            className="edit-subject"
                          />
                          <div className="edit-times">
                            <input
                              type="time"
                              value={editForm.start_time}
                              onChange={(e) => setEditForm({...editForm, start_time: e.target.value})}
                            />
                            <input
                              type="time"
                              value={editForm.end_time}
                              onChange={(e) => setEditForm({...editForm, end_time: e.target.value})}
                            />
                          </div>
                          <select
                            value={editForm.type}
                            onChange={(e) => setEditForm({...editForm, type: e.target.value})}
                          >
                            <option value="class">Class</option>
                            <option value="lab">Lab</option>
                          </select>
                          <div className="edit-actions">
                            <button onClick={handleSaveEdit} className="save-btn">Save</button>
                            <button onClick={handleCancelEdit} className="cancel-btn">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="entry-content">
                          <div className="entry-subject">{entry.subject}</div>
                          <div className="entry-time">
                            {formatTime(entry.start_time)} - {formatTime(entry.end_time)}
                          </div>
                          <div className="entry-type">{entry.type}</div>
                          <div className="entry-actions">
                            <button 
                              onClick={() => handleEdit(entry)} 
                              className="edit-btn"
                              disabled={disabled}
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => onDeleteEntry(entry.id)} 
                              className="delete-btn"
                              disabled={disabled}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>

      {/* Mobile Card View */}
      <div className="timetable-cards mobile-view">
        {displayDays.map(day => {
          const dayEntries = data.filter(entry => entry.day === day);
          
          if (dayEntries.length === 0) return null;
          
          return (
            <div key={day} className="day-card">
              <h3 className="day-title">{day}</h3>
              <div className="day-entries">
                {dayEntries
                  .sort((a, b) => a.start_time.localeCompare(b.start_time))
                  .map(entry => {
                    const isEditing = editingEntry === entry.id;
                    
                    return (
                      <div
                        key={entry.id}
                        className={`entry-card ${entry.type}`}
                        style={{ backgroundColor: getSubjectColor(entry.subject) }}
                      >
                        {isEditing ? (
                          <div className="edit-form">
                            <input
                              type="text"
                              value={editForm.subject}
                              onChange={(e) => setEditForm({...editForm, subject: e.target.value})}
                              className="edit-subject"
                            />
                            <div className="edit-times">
                              <input
                                type="time"
                                value={editForm.start_time}
                                onChange={(e) => setEditForm({...editForm, start_time: e.target.value})}
                              />
                              <span>to</span>
                              <input
                                type="time"
                                value={editForm.end_time}
                                onChange={(e) => setEditForm({...editForm, end_time: e.target.value})}
                              />
                            </div>
                            <select
                              value={editForm.type}
                              onChange={(e) => setEditForm({...editForm, type: e.target.value})}
                            >
                              <option value="class">Class</option>
                              <option value="lab">Lab</option>
                            </select>
                            <div className="edit-actions">
                              <button onClick={handleSaveEdit} className="save-btn">Save</button>
                              <button onClick={handleCancelEdit} className="cancel-btn">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div className="entry-content">
                            <div className="entry-header">
                              <span className="entry-subject">{entry.subject}</span>
                              <span className="entry-type-badge">{entry.type}</span>
                            </div>
                            <div className="entry-time">
                              {formatTime(entry.start_time)} - {formatTime(entry.end_time)}
                            </div>
                            <div className="entry-actions">
                              <button 
                                onClick={() => handleEdit(entry)} 
                                className="edit-btn"
                                disabled={disabled}
                              >
                                Edit
                              </button>
                              <button 
                                onClick={() => onDeleteEntry(entry.id)} 
                                className="delete-btn"
                                disabled={disabled}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Timetable;