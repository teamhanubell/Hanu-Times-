import React from 'react';

const Dashboard = ({ userData, onDataUpdate, showNotification, apiBase }) => {
  const stats = {
    totalCourses: userData.courses?.length || 0,
    totalSessions: userData.sessions?.length || 0,
    totalConstraints: userData.constraints?.length || 0,
    timetableScore: userData.timetable?.score ? Math.round(userData.timetable.score) : 0,
    totalHours: userData.timetable?.stats?.totalHours || 0,
    workingDays: userData.timetable?.stats?.workingDays || 0
  };

  const handleGenerateTimetable = async () => {
    try {
      const response = await fetch(`${apiBase}/timetable/regenerate/1`, {
        method: 'POST'
      });
      const result = await response.json();
      
      if (result.success) {
        await onDataUpdate('timetable');
        showNotification('Timetable generated successfully!', 'success');
      } else {
        showNotification('Failed to generate timetable', 'error');
      }
    } catch (error) {
      showNotification('Error generating timetable', 'error');
    }
  };

  const recentActivity = [
    { action: 'Generated timetable', time: '2 hours ago', icon: '📅' },
    { action: 'Added Python course', time: '1 day ago', icon: '📚' },
    { action: 'Set unavailable constraint', time: '2 days ago', icon: '⚠️' }
  ];

  const suggestions = userData.timetable?.suggestions || [
    'Add more courses to create a complete schedule',
    'Set your availability constraints',
    'Schedule lab sessions for your courses'
  ];

  return (
    <div className="grid grid-cols-1 gap-6">
      {/* Welcome Section */}
      <div className="card">
        <div className="card-content">
          <h1 className="text-xl font-bold mb-2">Welcome to Hanu-Planner! 🎓</h1>
          <p className="text-muted mb-4">
            Your intelligent offline timetable assistant. Create, optimize, and manage your academic schedule with AI-powered suggestions.
          </p>
          <div className="flex gap-3">
            <button 
              className="btn btn-primary"
              onClick={handleGenerateTimetable}
            >
              🚀 Generate Timetable
            </button>
            <button className="btn btn-secondary">
              💬 Chat with AI
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="card-content text-center">
            <div className="text-2xl mb-2">📚</div>
            <div className="text-xl font-bold">{stats.totalCourses}</div>
            <div className="text-sm text-muted">Courses</div>
          </div>
        </div>
        
        <div className="card">
          <div className="card-content text-center">
            <div className="text-2xl mb-2">📅</div>
            <div className="text-xl font-bold">{stats.totalSessions}</div>
            <div className="text-sm text-muted">Sessions</div>
          </div>
        </div>
        
        <div className="card">
          <div className="card-content text-center">
            <div className="text-2xl mb-2">⭐</div>
            <div className="text-xl font-bold">{stats.timetableScore}/100</div>
            <div className="text-sm text-muted">Score</div>
          </div>
        </div>
        
        <div className="card">
          <div className="card-content text-center">
            <div className="text-2xl mb-2">⏰</div>
            <div className="text-xl font-bold">{stats.totalHours}h</div>
            <div className="text-sm text-muted">Total Hours</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Quick Actions</h3>
            <p className="card-subtitle">Get started with common tasks</p>
          </div>
          <div className="card-content">
            <div className="grid gap-3">
              <button className="btn btn-secondary justify-start">
                <span>📚</span> Add New Course
              </button>
              <button className="btn btn-secondary justify-start">
                <span>📅</span> Schedule Session
              </button>
              <button className="btn btn-secondary justify-start">
                <span>⚠️</span> Set Constraints
              </button>
              <button className="btn btn-secondary justify-start">
                <span>🔄</span> Optimize Schedule
              </button>
            </div>
          </div>
        </div>

        {/* AI Suggestions */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">AI Suggestions</h3>
            <p className="card-subtitle">Recommendations to improve your schedule</p>
          </div>
          <div className="card-content">
            <div className="space-y-3">
              {suggestions.slice(0, 4).map((suggestion, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                  <span className="text-blue-500">💡</span>
                  <span className="text-sm">{suggestion}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Activity</h3>
            <p className="card-subtitle">Your latest actions</p>
          </div>
          <div className="card-content">
            <div className="space-y-3">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center gap-3">
                  <span className="text-lg">{activity.icon}</span>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{activity.action}</div>
                    <div className="text-xs text-muted">{activity.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Schedule Overview */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Schedule Overview</h3>
            <p className="card-subtitle">This week's summary</p>
          </div>
          <div className="card-content">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Working Days</span>
                <span className="font-semibold">{stats.workingDays}/7</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Total Hours</span>
                <span className="font-semibold">{stats.totalHours}h</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Average per Day</span>
                <span className="font-semibold">
                  {stats.workingDays > 0 ? Math.round((stats.totalHours / stats.workingDays) * 10) / 10 : 0}h
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Optimization Score</span>
                <span className={`font-semibold ${stats.timetableScore >= 80 ? 'text-green-600' : stats.timetableScore >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {stats.timetableScore}/100
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
