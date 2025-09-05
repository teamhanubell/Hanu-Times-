import React from 'react';

const Header = ({ currentView, onViewChange, userData }) => {
  const getViewTitle = (view) => {
    const titles = {
      dashboard: 'Dashboard',
      timetable: 'Timetable',
      courses: 'Courses',
      constraints: 'Constraints',
      chat: 'AI Assistant'
    };
    return titles[view] || 'Dashboard';
  };

  const stats = {
    courses: userData.courses?.length || 0,
    sessions: userData.sessions?.length || 0,
    score: userData.timetable?.score ? Math.round(userData.timetable.score) : 0
  };

  return (
    <header className="header">
      <div className="header-left">
        <a href="#" className="header-logo" onClick={(e) => { e.preventDefault(); onViewChange('dashboard'); }}>
          🎓 Hanu-Planner
        </a>
        <span className="header-title">{getViewTitle(currentView)}</span>
      </div>
      
      <div className="header-right">
        <div className="header-stats">
          <div className="header-stat">
            <span>📚 Courses:</span>
            <span className="header-stat-value">{stats.courses}</span>
          </div>
          <div className="header-stat">
            <span>📅 Sessions:</span>
            <span className="header-stat-value">{stats.sessions}</span>
          </div>
          <div className="header-stat">
            <span>⭐ Score:</span>
            <span className="header-stat-value">{stats.score}/100</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
