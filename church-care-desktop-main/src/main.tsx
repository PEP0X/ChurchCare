import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// 🛡️ ANTI-TAMPER / ANTI-INSPECT PROTECTION:
// Disable context menu (right click -> inspect) and developer keys in desktop client
if (typeof window !== 'undefined') {
  window.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
  }, { capture: true });

  window.addEventListener('keydown', (e) => {
    if (
      e.key === 'F12' ||
      (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) ||
      (e.ctrlKey && ['U', 'S'].includes(e.key.toUpperCase()))
    ) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }, { capture: true });
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
