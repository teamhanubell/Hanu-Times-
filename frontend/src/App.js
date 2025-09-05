import React, { useState, useEffect } from 'react';
import InputForm from './components/InputForm';
import Timetable from './components/Timetable';

function App() {
  const [timetableData, setTimetableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Fetch timetable data on component mount
  useEffect(() => {
    fetchTimetable();
  }, []);

  const fetchTimetable = async () => {
    setLoading(true);
    try {
      const response = await fetch('/.netlify/functions/timetable');
      
      // Check if response is ok and content-type is JSON
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Expected JSON but got: ${text.substring(0, 100)}...`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setTimetableData(result.data || []);
      } else {
        setMessage(`Error: ${result.error?.message || 'Failed to fetch timetable'}`);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setMessage(`Connection Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEntries = async (entries) => {
    setLoading(true);
    try {
      const response = await fetch('/.netlify/functions/timetable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ entries }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setMessage('Entries added successfully!');
        await fetchTimetable(); // Refresh data
      } else {
        setMessage(`Error: ${result.error?.message || 'Failed to add entries'}`);
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEntry = async (id, updatedEntry) => {
    setLoading(true);
    try {
      const response = await fetch(`/.netlify/functions/timetable?id=${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedEntry),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setMessage('Entry updated successfully!');
        await fetchTimetable(); // Refresh data
      } else {
        setMessage(`Error: ${result.error?.message || 'Failed to update entry'}`);
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEntry = async (id) => {
    setLoading(true);
    try {
      const response = await fetch(`/.netlify/functions/timetable?id=${id}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (result.success) {
        setMessage('Entry deleted successfully!');
        await fetchTimetable(); // Refresh data
      } else {
        setMessage(`Error: ${result.error?.message || 'Failed to delete entry'}`);
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to clear all entries?')) {
      return;
    }
    
    setLoading(true);
    try {
      // Delete all entries one by one
      for (const entry of timetableData) {
        await fetch(`/.netlify/functions/timetable?id=${entry.id}`, {
          method: 'DELETE',
        });
      }
      setMessage('All entries cleared successfully!');
      await fetchTimetable(); // Refresh data
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Hanu-Planner</h1>
        <p>Minimal timetable management</p>
      </header>

      {message && (
        <div className={`message ${message.startsWith('Error') ? 'error' : 'success'}`}>
          {message}
          <button onClick={() => setMessage('')} className="close-btn">×</button>
        </div>
      )}

      {loading && <div className="loading">Loading...</div>}

      <main className="app-main">
        <InputForm onAddEntries={handleAddEntries} disabled={loading} />
        <Timetable 
          data={timetableData}
          onUpdateEntry={handleUpdateEntry}
          onDeleteEntry={handleDeleteEntry}
          onClearAll={handleClearAll}
          onRefresh={fetchTimetable}
          disabled={loading}
        />
      </main>
    </div>
  );
}

export default App;