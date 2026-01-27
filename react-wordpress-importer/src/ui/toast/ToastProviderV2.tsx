import React, { createContext, useContext, useState, ReactNode } from 'react';
import ReactDOM from 'react-dom';

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Allow time for fade-out animation
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const backgroundColor =
    type === 'success' ? '#4CAF50' : type === 'error' ? '#F44336' : '#2196F3';

  const toastStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    backgroundColor: backgroundColor,
    color: 'white',
    padding: '10px 20px',
    borderRadius: '5px',
    zIndex: 1000,
    opacity: isVisible ? 1 : 0,
    transition: 'opacity 0.3s ease-in-out',
  };

  if (!isVisible && !message) return null; // Don't render if not visible and message is empty

  return (
    <div style={toastStyle}>
      {message}
    </div>
  );
};

interface ToastProviderV2Props {
  children: ReactNode;
}

export const ToastProviderV2: React.FC<ToastProviderV2Props> = ({ children }) => {
  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' | 'info' }[]>([]);
  const [toastIdCounter, setToastIdCounter] = useState(0);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastIdCounter(prev => prev + 1);
    const newToast = { id: toastIdCounter, message, type };
    setToasts(prev => [...prev, newToast]);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {ReactDOM.createPortal(
        toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        )),
        document.body
      )}
    </ToastContext.Provider>
  );
};

export const useToastV2 = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToastV2 must be used within a ToastProviderV2');
  }
  return context;
};