import React, { useEffect } from 'react';

const NotificationToast = ({ message, type = 'info', onClose, duration = 5000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div className={`notification-toast ${type}`}>
      <div className="flex justify-between items-center">
        <span>{message}</span>
        <button
          onClick={onClose}
          className="ml-4 text-white hover:text-gray-200"
          style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default NotificationToast;
