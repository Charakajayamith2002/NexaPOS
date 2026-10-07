import { createRoot } from 'react-dom/client';
import App from './App.jsx';

// Register Service Worker for PWA Offline Mode
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      (reg) => console.log('PWA ServiceWorker registered successfully:', reg.scope),
      (err) => console.warn('PWA ServiceWorker registration failed:', err)
    );
  });
}

createRoot(document.getElementById('root')).render(<App />);
