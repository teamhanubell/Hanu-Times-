import React, { useState } from 'react';

const ConstraintsManager = ({ userData, onDataUpdate, showNotification, apiBase }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    type: 'unavailable',
    dayOfWeek: '',
    startTime: '',
    endTime: '',
    description: ''
  });

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const constraintTypes = {
    unavailable: { label: 'Unavailable', icon: '🚫', color: 'text-red-600' },
    preferred: { label: 'Preferred Time', icon: '⭐', color: 'text-green-600' },
    break: { label: 'Break Time', icon: '☕', color: 'text-blue-600' },
    no_back_to_back: { label: 'No Back-to-Back', icon: '⏸️', color: 'text-yellow-600' }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.type) {
      showNotification('Constraint type is required', 'error');
      return;
    }

    try {
      const response = await fetch(`${apiBase}/constraints`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          userId: 1,
          dayOfWeek: formData.dayOfWeek ? parseInt(formData.dayOfWeek) : null
        })
      });

      const result = await response.json();
      
      if (result.success) {
        await onDataUpdate('constraints');
        showNotification('Constraint added successfully!', 'success');
        resetForm();
      } else {
        showNotification('Failed to add constraint', 'error');
      }
    } catch (error) {
      showNotification('Error adding constraint', 'error');
    }
  };

  const handleDelete = async (constraintId) => {
    if (!window.confirm('Are you sure you want to delete this constraint?')) {
      return;
    }

    try {
      const response = await fetch(`${apiBase}/constraints/${constraintId}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      
      if (result.success) {
        await onDataUpdate('constraints');
        showNotification('Constraint deleted successfully!', 'success');
      } else {
        showNotification('Failed to delete constraint', 'error');
      }
    } catch (error) {
      showNotification('Error deleting constraint', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      type: 'unavailable',
      dayOfWeek: '',
      startTime: '',
      endTime: '',
      description: ''
    });
    setShowAddForm(false);
  };

  const formatConstraintTime = (constraint) => {
    if (constraint.start_time && constraint.end_time) {
      return `${constraint.start_time} - ${constraint.end_time}`;
    } else if (constraint.start_time) {
      return `from ${constraint.start_time}`;
    } else if (constraint.end_time) {
      return `until ${constraint.end_time}`;
    }
    return 'All day';
  };

  const groupedConstraints = userData.constraints?.reduce((groups, constraint) => {
    const day = constraint.day_of_week !== null ? dayNames[constraint.day_of_week] : 'All Days';
    if (!groups[day]) groups[day] = [];
    groups[day].push(constraint);
    return groups;
  }, {}) || {};

  return (
    <div className="grid gap-6">
      {/* Header */}
      <div className="card">
        <div className="card-header">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="card-title">⚠️ Schedule Constraints</h3>
              <p className="card-subtitle">Set your availability and scheduling preferences</p>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => setShowAddForm(true)}
            >
              ➕ Add Constraint
            </button>
          </div>
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="card">
          <div className="card-header">
            <h4 className="card-title">Add New Constraint</h4>
          </div>
          <div className="card-content">
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">Constraint Type *</label>
                <select
                  className="form-select"
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                  required
                >
                  {Object.entries(constraintTypes).map(([key, type]) => (
                    <option key={key} value={key}>
                      {type.icon} {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Day (Optional)</label>
                <select
                  className="form-select"
                  value={formData.dayOfWeek}
                  onChange={(e) => setFormData(prev => ({ ...prev, dayOfWeek: e.target.value }))}
                >
                  <option value="">All Days</option>
                  {dayNames.map((day, index) => (
                    <option key={day} value={index}>{day}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Start Time (Optional)</label>
                <input
                  type="time"
                  className="form-input"
                  value={formData.startTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">End Time (Optional)</label>
                <input
                  type="time"
                  className="form-input"
                  value={formData.endTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                />
              </div>

              <div className="form-group md:col-span-2">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  placeholder="Optional description for this constraint..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="md:col-span-2 flex gap-3">
                <button type="submit" className="btn btn-primary">
                  Add Constraint
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={resetForm}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Constraint Templates */}
      <div className="card">
        <div className="card-header">
          <h4 className="card-title">Quick Templates</h4>
          <p className="card-subtitle">Common constraint patterns</p>
        </div>
        <div className="card-content">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { label: 'No Friday Afternoons', type: 'unavailable', day: 5, start: '12:00', end: '18:00' },
              { label: 'Lunch Break Daily', type: 'break', day: null, start: '12:00', end: '13:00' },
              { label: 'No Early Morning', type: 'unavailable', day: null, start: '06:00', end: '09:00' },
              { label: 'No Evening Classes', type: 'unavailable', day: null, start: '18:00', end: '22:00' },
              { label: 'Weekend Free', type: 'unavailable', day: 0, start: '', end: '' },
              { label: 'Preferred Morning', type: 'preferred', day: null, start: '09:00', end: '12:00' }
            ].map((template, index) => (
              <button
                key={index}
                className="btn btn-secondary btn-sm text-left justify-start"
                onClick={() => {
                  setFormData({
                    type: template.type,
                    dayOfWeek: template.day?.toString() || '',
                    startTime: template.start,
                    endTime: template.end,
                    description: template.label
                  });
                  setShowAddForm(true);
                }}
              >
                {constraintTypes[template.type].icon} {template.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Constraints List */}
      {Object.keys(groupedConstraints).length > 0 ? (
        <div className="grid gap-4">
          {Object.entries(groupedConstraints).map(([day, constraints]) => (
            <div key={day} className="card">
              <div className="card-header">
                <h4 className="card-title">{day}</h4>
                <p className="card-subtitle">{constraints.length} constraint{constraints.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="card-content">
                <div className="space-y-3">
                  {constraints.map(constraint => {
                    const typeInfo = constraintTypes[constraint.type];
                    return (
                      <div key={constraint.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{typeInfo.icon}</span>
                          <div>
                            <div className="font-medium text-sm">
                              <span className={typeInfo.color}>{typeInfo.label}</span>
                              {constraint.start_time || constraint.end_time ? (
                                <span className="ml-2 text-gray-600">
                                  {formatConstraintTime(constraint)}
                                </span>
                              ) : null}
                            </div>
                            {constraint.description && (
                              <div className="text-xs text-gray-500">{constraint.description}</div>
                            )}
                          </div>
                        </div>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(constraint.id)}
                          title="Delete constraint"
                        >
                          🗑️
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card">
          <div className="card-content text-center py-12">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="text-lg font-semibold mb-2">No Constraints Set</h3>
            <p className="text-muted mb-4">
              Add scheduling constraints to help the AI generate better timetables that fit your availability.
            </p>
            <button
              className="btn btn-primary"
              onClick={() => setShowAddForm(true)}
            >
              ➕ Add Your First Constraint
            </button>
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="card">
        <div className="card-header">
          <h4 className="card-title">💡 Tips</h4>
        </div>
        <div className="card-content">
          <div className="space-y-2 text-sm">
            <div>• <strong>Unavailable:</strong> Times when you cannot have classes</div>
            <div>• <strong>Preferred:</strong> Times when you'd like to have classes</div>
            <div>• <strong>Break Time:</strong> Mandatory break periods</div>
            <div>• <strong>No Back-to-Back:</strong> Prevent consecutive sessions</div>
            <div>• Leave day blank to apply constraint to all days</div>
            <div>• Leave times blank for all-day constraints</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConstraintsManager;
