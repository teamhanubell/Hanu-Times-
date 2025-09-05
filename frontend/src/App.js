import React, { useState, useEffect } from 'react';
import './App.css';
import ChatBot from './components/ChatBot';
import Dashboard from './components/Dashboard';
import TimetableView from './components/TimetableView';
import CoursesManager from './components/CoursesManager';
import ConstraintsManager from './components/ConstraintsManager';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import LoadingSpinner from './components/LoadingSpinner';
import NotificationToast from './components/NotificationToast';

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [userData, setUserData] = useState({
    courses: [],
    sessions: [],
    constraints: [],
    timetable: null
  });

  const API_BASE = process.env.NODE_ENV === 'development' ? 'http://localhost:5000/api' : '/api';

  useEffect(() => {
    loadInitialData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadCourses(),
        loadSessions(),
        loadConstraints(),
        loadTimetable()
      ]);
    } catch (error) {
      showNotification('Failed to load initial data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadCourses = async () => {
    try {
      const response = await fetch(`${API_BASE}/courses/1`);
      const result = await response.json();
      if (result.success) {
        setUserData(prev => ({ ...prev, courses: result.data }));
      }
    } catch (error) {
      console.error('Load courses error:', error);
    }
  };

  const loadSessions = async () => {
    try {
      const response = await fetch(`${API_BASE}/sessions/1`);
      const result = await response.json();
      if (result.success) {
        setUserData(prev => ({ ...prev, sessions: result.data }));
      }
    } catch (error) {
      console.error('Load sessions error:', error);
    }
  };

  const loadConstraints = async () => {
    try {
      const response = await fetch(`${API_BASE}/constraints/1`);
      const result = await response.json();
      if (result.success) {
        setUserData(prev => ({ ...prev, constraints: result.data }));
      }
    } catch (error) {
      console.error('Load constraints error:', error);
    }
  };

  const loadTimetable = async () => {
    try {
      const response = await fetch(`${API_BASE}/timetable/1`);
      const result = await response.json();
      if (result.success) {
        setUserData(prev => ({ ...prev, timetable: result.data }));
      }
    } catch (error) {
      console.error('Load timetable error:', error);
    }
  };

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type, id: Date.now() });
  };

  const hideNotification = () => {
    setNotification(null);
  };

  const handleDataUpdate = async (type) => {
    switch (type) {
      case 'courses':
        await loadCourses();
        break;
      case 'sessions':
        await loadSessions();
        break;
      case 'constraints':
        await loadConstraints();
        break;
      case 'timetable':
        await loadTimetable();
        break;
      case 'all':
        await loadInitialData();
        break;
      default:
        break;
    }
  };

  const renderCurrentView = () => {
    const commonProps = {
      userData,
      onDataUpdate: handleDataUpdate,
      showNotification,
      apiBase: API_BASE
    };

    switch (currentView) {
      case 'dashboard':
        return <Dashboard {...commonProps} />;
      case 'timetable':
        return <TimetableView {...commonProps} />;
      case 'courses':
        return <CoursesManager {...commonProps} />;
      case 'constraints':
        return <ConstraintsManager {...commonProps} />;
      case 'chat':
        return <ChatBot {...commonProps} />;
      default:
        return <Dashboard {...commonProps} />;
    }
  };

  return (
    <div className="app">
      <Header 
        currentView={currentView}
        onViewChange={setCurrentView}
        userData={userData}
      />
      
      <div className="app-body">
        <Sidebar 
          currentView={currentView}
          onViewChange={setCurrentView}
          userData={userData}
        />
        
        <main className="main-content">
          {loading && <LoadingSpinner />}
          {renderCurrentView()}
        </main>
      </div>

      {notification && (
        <NotificationToast
          message={notification.message}
          type={notification.type}
          onClose={hideNotification}
        />
      )}
    </div>
  );
}

export default App;