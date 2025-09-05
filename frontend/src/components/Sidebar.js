import React from 'react';

const Sidebar = ({ currentView, onViewChange, userData }) => {
  const navItems = [
    {
      section: 'Main',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: '📊' },
        { id: 'timetable', label: 'Timetable', icon: '📅' },
        { id: 'chat', label: 'AI Assistant', icon: '🤖' }
      ]
    },
    {
      section: 'Management',
      items: [
        { id: 'courses', label: 'Courses', icon: '📚' },
        { id: 'constraints', label: 'Constraints', icon: '⚠️' }
      ]
    }
  ];

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {navItems.map((section) => (
          <div key={section.section} className="nav-section">
            <div className="nav-section-title">{section.section}</div>
            {section.items.map((item) => (
              <a
                key={item.id}
                href="#"
                className={`nav-item ${currentView === item.id ? 'active' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  onViewChange(item.id);
                }}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </a>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
