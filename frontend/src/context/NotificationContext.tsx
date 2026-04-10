import React, { createContext, useContext, useState, useCallback } from 'react';
import  { Snackbar, Alert } from '@mui/material';
import  type { AlertColor } from '@mui/material';

interface Notification {
  message: string;
  type: AlertColor;
}

interface NotificationContextType {
  notify: (message: string, type?: AlertColor) => void;
  notifySuccess: (message: string) => void;
  notifyError: (message: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notification, setNotification] = useState<Notification | null>(null);
  const [open, setOpen] = useState(false);

  const notify = useCallback((message: string, type: AlertColor = 'info') => {
    setNotification({ message, type });
    setOpen(true);
  }, []);

  const notifySuccess = useCallback((message: string) => {
    notify(message, 'success');
  }, [notify]);

  const notifyError = useCallback((message: string) => {
    notify(message, 'error');
  }, [notify]);

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <NotificationContext.Provider value={{ notify, notifySuccess, notifyError }}>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={4000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleClose} severity={notification?.type} sx={{ width: '100%' }}>
          {notification?.message}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  );
};
