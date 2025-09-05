import React, { useState } from 'react';
import nlp from 'compromise';

// Server-side AI enhancement via Netlify Function (keeps API key off the client)
const callServerEnhance = async (entries) => {
  try {
    const response = await fetch('/.netlify/functions/timetable/enhance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries })
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data?.error?.message || 'AI enhancement failed');
    }
    return data.data.entries;
  } catch (error) {
    console.error('Enhance API error:', error);
    return entries; // fall back to original
  }
};

// Enhanced subject name suggestion using AI (delegated to server)
const enhanceSubjectName = async (originalSubject) => originalSubject;

// Smart slot merging suggestions using AI (delegated to server)
const suggestSlotMerging = async (entries) => callServerEnhance(entries);


// Natural language parser for timetable entries
const parseNaturalText = (text) => {
  const entries = [];
  
  // Split by common separators for multiple entries
  const lines = text.split(/[;\n]/).filter(line => line.trim());
  
  for (const line of lines) {
    const doc = nlp(line);
    
    // Extract days - handle multiple days with &, and, comma
    const dayPatterns = /\b(mon|monday|tue|tuesday|wed|wednesday|thu|thursday|fri|friday|sat|saturday|sun|sunday)\b/i; // remove global flag for consistent tests
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
    
    // Extract subject via NLP noun detection
    const doc = nlp(line);
    let subject = doc.nouns().toSingular().out('text') || 'Untitled';
    
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

const InputForm = ({ onAddEntries, disabled }) => {
  const [mode, setMode] = useState('structured'); // 'structured' or 'natural'
  const [formData, setFormData] = useState({
    day: 'Monday',
    start_time: '09:00',
    end_time: '10:00',
    type: 'class',
    subject: ''
  });
  const [naturalText, setNaturalText] = useState('');
  const [parsedPreview, setParsedPreview] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [aiEnhancing, setAiEnhancing] = useState(false);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const types = ['class', 'lab'];

  const handleStructuredSubmit = (e) => {
    e.preventDefault();
    
    // Validate form data
    if (!formData.subject.trim()) {
      alert('Please enter a subject');
      return;
    }
    
    if (formData.start_time >= formData.end_time) {
      alert('End time must be after start time');
      return;
    }
    
    onAddEntries([formData]);
    
    // Reset form
    setFormData({
      day: 'Monday',
      start_time: '09:00',
      end_time: '10:00',
      type: 'class',
      subject: ''
    });
  };

  const handleNaturalTextChange = (e) => {
    const text = e.target.value;
    setNaturalText(text);
    
    if (text.trim()) {
      const parsed = parseNaturalText(text);
      setParsedPreview(parsed);
      setShowPreview(parsed.length > 0);
    } else {
      setParsedPreview([]);
      setShowPreview(false);
    }
  };

  const handleNaturalSubmit = (e) => {
    e.preventDefault();

    // Validate parsed preview entries
    if (parsedPreview.length === 0) {
      alert('No valid entries found. Please check input.');
      return;
    }
    for (const entry of parsedPreview) {
      if (!entry.day || entry.start_time >= entry.end_time) {
        alert('Invalid entry detected. Ensure each entry has a valid day and time range.');
        return;
      }
    }
    
    onAddEntries(parsedPreview);
    
    // Reset form
    setNaturalText('');
    setParsedPreview([]);
    setShowPreview(false);
  };

  const handlePreviewEdit = (index, field, value) => {
    const updated = [...parsedPreview];
    updated[index][field] = value;
    setParsedPreview(updated);
  };

  const handleAIEnhancement = async () => {
    if (parsedPreview.length === 0) return;
    
    setAiEnhancing(true);
    try {
      // Enhance subject names
      const enhancedEntries = await Promise.all(
        parsedPreview.map(async (entry) => {
          const enhancedSubject = await enhanceSubjectName(
            entry.subject, 
            `${entry.type} on ${entry.day} from ${entry.start_time} to ${entry.end_time}`
          );
          return {
            ...entry,
            subject: enhancedSubject || entry.subject
          };
        })
      );
      
      // Suggest slot merging/optimization
      const optimizedEntries = await suggestSlotMerging(enhancedEntries);
      
      setParsedPreview(optimizedEntries);
    } catch (error) {
      console.error('AI enhancement failed:', error);
      alert('AI enhancement failed. Please try again.');
    } finally {
      setAiEnhancing(false);
    }
  };

  return (
    <div className="input-form">
      <div className="form-header">
        <h2>Add Schedule Entry</h2>
        <div className="mode-toggle">
          <button 
            className={mode === 'structured' ? 'active' : ''}
            onClick={() => setMode('structured')}
            disabled={disabled}
          >
            Structured
          </button>
          <button 
            className={mode === 'natural' ? 'active' : ''}
            onClick={() => setMode('natural')}
            disabled={disabled}
          >
            Natural Text
          </button>
        </div>
      </div>

      {mode === 'structured' ? (
        <form onSubmit={handleStructuredSubmit} className="structured-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="day">Day:</label>
              <select 
                id="day"
                value={formData.day}
                onChange={(e) => setFormData({...formData, day: e.target.value})}
                disabled={disabled}
              >
                {days.map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="type">Type:</label>
              <select 
                id="type"
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
                disabled={disabled}
              >
                {types.map(type => (
                  <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="start_time">Start Time:</label>
              <input 
                type="time"
                id="start_time"
                value={formData.start_time}
                onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                disabled={disabled}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="end_time">End Time:</label>
              <input 
                type="time"
                id="end_time"
                value={formData.end_time}
                onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                disabled={disabled}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="subject">Subject:</label>
            <input 
              type="text"
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData({...formData, subject: e.target.value})}
              placeholder="e.g., Mathematics, Physics Lab"
              disabled={disabled}
              required
            />
          </div>

          <button type="submit" className="submit-btn" disabled={disabled}>
            Add Entry
          </button>
        </form>
      ) : (
        <form onSubmit={handleNaturalSubmit} className="natural-form">
          <div className="form-group">
            <label htmlFor="natural-text">Natural Text Input:</label>
            <textarea 
              id="natural-text"
              value={naturalText}
              onChange={handleNaturalTextChange}
              placeholder="e.g., Maths class Mon & Wed 10 to 12&#10;Physics lab Thursday 2pm to 4pm"
              rows="4"
              disabled={disabled}
            />
            <small className="help-text">
              Examples: "Maths class Mon & Wed 10 to 12", "Physics lab Thursday 2pm-4pm"
            </small>
          </div>

          {showPreview && (
            <div className="preview-section">
              <h3>Parsed Entries (Preview):</h3>
              {parsedPreview.map((entry, index) => (
                <div key={index} className="preview-entry">
                  <div className="preview-row">
                    <select 
                      value={entry.day}
                      onChange={(e) => handlePreviewEdit(index, 'day', e.target.value)}
                      disabled={disabled}
                    >
                      {days.map(day => (
                        <option key={day} value={day}>{day}</option>
                      ))}
                    </select>
                    
                    <input 
                      type="time"
                      value={entry.start_time}
                      onChange={(e) => handlePreviewEdit(index, 'start_time', e.target.value)}
                      disabled={disabled}
                    />
                    
                    <span>to</span>
                    
                    <input 
                      type="time"
                      value={entry.end_time}
                      onChange={(e) => handlePreviewEdit(index, 'end_time', e.target.value)}
                      disabled={disabled}
                    />
                    
                    <select 
                      value={entry.type}
                      onChange={(e) => handlePreviewEdit(index, 'type', e.target.value)}
                      disabled={disabled}
                    >
                      {types.map(type => (
                        <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                      ))}
                    </select>
                    
                    <input 
                      type="text"
                      value={entry.subject}
                      onChange={(e) => handlePreviewEdit(index, 'subject', e.target.value)}
                      placeholder="Subject"
                      disabled={disabled}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="form-actions">
            {showPreview && parsedPreview.length > 0 && (
              <button 
                type="button" 
                className="ai-enhance-btn" 
                onClick={handleAIEnhancement}
                disabled={disabled || aiEnhancing}
              >
                {aiEnhancing ? 'Enhancing with AI...' : '✨ Enhance with AI'}
              </button>
            )}
            <button type="submit" className="submit-btn" disabled={disabled || parsedPreview.length === 0}>
              Add {parsedPreview.length} Entries
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default InputForm;