import React, { useState, useEffect, useRef } from 'react';

const ChatBot = ({ userData, onDataUpdate, showNotification, apiBase }) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Load chat history on component mount
    loadChatHistory();
    
    // Add welcome message if no history
    if (messages.length === 0) {
      setMessages([{
        id: 1,
        text: "Hello! I'm your AI assistant for Hanu-Planner. I can help you add courses, schedule sessions, generate timetables, and manage your constraints. What would you like to do?",
        isBot: true,
        timestamp: new Date()
      }]);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChatHistory = async () => {
    try {
      const response = await fetch(`${apiBase}/chat/history/1`);
      const result = await response.json();
      
      if (result.success && result.data.length > 0) {
        const chatMessages = result.data.map((msg, index) => [
          {
            id: `user-${index}`,
            text: msg.message,
            isBot: false,
            timestamp: new Date(msg.created_at)
          },
          {
            id: `bot-${index}`,
            text: msg.response,
            isBot: true,
            timestamp: new Date(msg.created_at)
          }
        ]).flat();
        
        setMessages(chatMessages);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      text: inputValue,
      isBot: false,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch(`${apiBase}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: inputValue,
          userId: 1
        })
      });

      const result = await response.json();
      
      if (result.success) {
        const botMessage = {
          id: Date.now() + 1,
          text: result.data.text,
          isBot: true,
          timestamp: new Date(),
          actions: result.data.actions || []
        };

        setMessages(prev => [...prev, botMessage]);

        // Handle actions that require UI updates
        if (result.data.actions) {
          if (result.data.actions.includes('course_created') || 
              result.data.actions.includes('session_created') ||
              result.data.actions.includes('constraint_added') ||
              result.data.actions.includes('timetable_generated')) {
            await onDataUpdate('all');
          }
        }

        // Show notification for successful actions
        if (result.data.actions?.includes('course_created')) {
          showNotification('Course added successfully!', 'success');
        } else if (result.data.actions?.includes('session_created')) {
          showNotification('Session scheduled successfully!', 'success');
        } else if (result.data.actions?.includes('timetable_generated')) {
          showNotification('Timetable generated successfully!', 'success');
        }
      } else {
        const errorMessage = {
          id: Date.now() + 1,
          text: "I'm sorry, I encountered an error processing your request. Please try again.",
          isBot: true,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        text: "I'm having trouble connecting right now. Please check your connection and try again.",
        isBot: true,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const quickActions = [
    { text: "Add a new course", icon: "📚" },
    { text: "Schedule a class session", icon: "📅" },
    { text: "Generate my timetable", icon: "🚀" },
    { text: "Show my schedule", icon: "👀" },
    { text: "I'm unavailable on Friday afternoons", icon: "⚠️" },
    { text: "Help me optimize my schedule", icon: "⚡" }
  ];

  const handleQuickAction = (text) => {
    setInputValue(text);
  };

  return (
    <div className="card" style={{ height: 'calc(100vh - 200px)' }}>
      <div className="card-header">
        <h3 className="card-title">🤖 AI Assistant</h3>
        <p className="card-subtitle">Chat with your intelligent timetable assistant</p>
      </div>
      
      <div className="chat-container">
        <div className="chat-messages">
          {messages.map((message) => (
            <div key={message.id} className={`chat-message ${message.isBot ? 'bot' : 'user'}`}>
              <div className="chat-avatar">
                {message.isBot ? '🤖' : '👤'}
              </div>
              <div className="chat-bubble">
                <div style={{ whiteSpace: 'pre-wrap' }}>{message.text}</div>
                <div className="text-xs opacity-70 mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="chat-message bot">
              <div className="chat-avatar">🤖</div>
              <div className="chat-bubble">
                <div className="flex items-center gap-2">
                  <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
                  <span>Thinking...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        {messages.length <= 2 && (
          <div className="p-4 border-t border-gray-200">
            <div className="text-sm font-medium mb-3 text-gray-600">Quick Actions:</div>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  className="btn btn-secondary btn-sm text-left justify-start"
                  onClick={() => handleQuickAction(action.text)}
                >
                  <span>{action.icon}</span>
                  <span className="truncate">{action.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="chat-input-container">
          <form onSubmit={handleSubmit} className="chat-input-form">
            <textarea
              className="chat-input"
              placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              rows={1}
              style={{ resize: 'none' }}
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!inputValue.trim() || isLoading}
            >
              {isLoading ? '⏳' : '📤'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatBot;
