import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Override console.error to filter out benign React Native Web touch events errors in iframe/browser simulations
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  const isTouchError = args.some(arg => 
    arg && typeof arg === 'string' && arg.includes('Cannot find single active touch')
  );
  if (isTouchError) {
    return;
  }
  originalConsoleError.apply(console, args);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
