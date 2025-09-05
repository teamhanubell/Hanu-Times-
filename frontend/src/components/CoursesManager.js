import React, { useState } from 'react';

const CoursesManager = ({ userData, onDataUpdate, showNotification, apiBase }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    priority: 1,
    credits: 3,
    color: '#3B82F6',
    description: ''
  });

  const priorityLabels = { 1: 'High', 2: 'Medium', 3: 'Low' };
  const colors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', 
    '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      showNotification('Course name is required', 'error');
      return;
    }

    try {
      const url = editingCourse 
        ? `${apiBase}/courses/${editingCourse.id}`
        : `${apiBase}/courses`;
      
      const method = editingCourse ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          userId: 1
        })
      });

      const result = await response.json();
      
      if (result.success) {
        await onDataUpdate('courses');
        showNotification(
          editingCourse ? 'Course updated successfully!' : 'Course added successfully!', 
          'success'
        );
        resetForm();
      } else {
        showNotification('Failed to save course', 'error');
      }
    } catch (error) {
      showNotification('Error saving course', 'error');
    }
  };

  const handleEdit = (course) => {
    setEditingCourse(course);
    setFormData({
      name: course.name,
      code: course.code || '',
      priority: course.priority,
      credits: course.credits,
      color: course.color,
      description: course.description || ''
    });
    setShowAddForm(true);
  };

  const handleDelete = async (courseId) => {
    if (!window.confirm('Are you sure you want to delete this course? This will also delete all associated sessions.')) {
      return;
    }

    try {
      const response = await fetch(`${apiBase}/courses/${courseId}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      
      if (result.success) {
        await onDataUpdate('courses');
        await onDataUpdate('sessions');
        showNotification('Course deleted successfully!', 'success');
      } else {
        showNotification('Failed to delete course', 'error');
      }
    } catch (error) {
      showNotification('Error deleting course', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      priority: 1,
      credits: 3,
      color: '#3B82F6',
      description: ''
    });
    setEditingCourse(null);
    setShowAddForm(false);
  };

  const handleAddSession = async (courseId) => {
    // This would open a session creation modal or redirect
    showNotification('Session creation coming soon!', 'info');
  };

  return (
    <div className="grid gap-6">
      {/* Header */}
      <div className="card">
        <div className="card-header">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="card-title">📚 Courses Management</h3>
              <p className="card-subtitle">Manage your academic courses and subjects</p>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => setShowAddForm(true)}
            >
              ➕ Add Course
            </button>
          </div>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="card">
          <div className="card-header">
            <h4 className="card-title">
              {editingCourse ? 'Edit Course' : 'Add New Course'}
            </h4>
          </div>
          <div className="card-content">
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">Course Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., Data Structures"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Course Code</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., CS201"
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Priority</label>
                <select
                  className="form-select"
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
                >
                  <option value={1}>High Priority</option>
                  <option value={2}>Medium Priority</option>
                  <option value={3}>Low Priority</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Credits</label>
                <input
                  type="number"
                  className="form-input"
                  min="1"
                  max="10"
                  value={formData.credits}
                  onChange={(e) => setFormData(prev => ({ ...prev, credits: parseInt(e.target.value) }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Color</label>
                <div className="flex gap-2 mt-2">
                  {colors.map(color => (
                    <button
                      key={color}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 ${
                        formData.color === color ? 'border-gray-400' : 'border-gray-200'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData(prev => ({ ...prev, color }))}
                    />
                  ))}
                </div>
              </div>

              <div className="form-group md:col-span-2">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  placeholder="Optional course description..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="md:col-span-2 flex gap-3">
                <button type="submit" className="btn btn-primary">
                  {editingCourse ? 'Update Course' : 'Add Course'}
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

      {/* Courses List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {userData.courses?.length > 0 ? (
          userData.courses.map(course => {
            const courseSessions = userData.sessions?.filter(s => s.course_id === course.id) || [];
            
            return (
              <div key={course.id} className="card">
                <div className="card-header">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: course.color }}
                      />
                      <div>
                        <h4 className="card-title text-base">{course.name}</h4>
                        {course.code && (
                          <p className="card-subtitle">{course.code}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => handleEdit(course)}
                        title="Edit course"
                      >
                        ✏️
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(course.id)}
                        title="Delete course"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="card-content">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Priority:</span>
                      <span className={`font-medium ${
                        course.priority === 1 ? 'text-red-600' : 
                        course.priority === 2 ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {priorityLabels[course.priority]}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Credits:</span>
                      <span className="font-medium">{course.credits}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sessions:</span>
                      <span className="font-medium">{courseSessions.length}</span>
                    </div>
                  </div>
                  
                  {course.description && (
                    <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
                      {course.description}
                    </div>
                  )}
                </div>

                <div className="card-footer">
                  <button
                    className="btn btn-secondary btn-sm w-full"
                    onClick={() => handleAddSession(course.id)}
                  >
                    📅 Add Session
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="md:col-span-2 lg:col-span-3">
            <div className="card">
              <div className="card-content text-center py-12">
                <div className="text-4xl mb-4">📚</div>
                <h3 className="text-lg font-semibold mb-2">No Courses Yet</h3>
                <p className="text-muted mb-4">
                  Start by adding your first course to begin building your timetable.
                </p>
                <button
                  className="btn btn-primary"
                  onClick={() => setShowAddForm(true)}
                >
                  ➕ Add Your First Course
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CoursesManager;
