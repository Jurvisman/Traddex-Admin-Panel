import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { API_ORIGIN } from './config/runtime';

const originalFetch = window.fetch.bind(window);

window.fetch = (input, init = {}) => {
  const url = typeof input === 'string' ? input : input?.url || '';
  const apiBase = API_ORIGIN;
  const shouldBypassNgrokWarning =
    url.includes('ngrok') || (apiBase && url.startsWith(apiBase));

  if (!shouldBypassNgrokWarning) {
    return originalFetch(input, init);
  }

  const headers = new Headers(
    init.headers || (input instanceof Request ? input.headers : undefined)
  );
  headers.set('ngrok-skip-browser-warning', 'true');

  if (input instanceof Request) {
    return originalFetch(new Request(input, { ...init, headers }));
  }

  return originalFetch(input, { ...init, headers });
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
