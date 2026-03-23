import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { store } from './store';
import App from './App';
import './index.css';
import 'leaflet/dist/leaflet.css';
import './i18n';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#fff',
              color: '#1f2937',
              borderRadius: '0.75rem',
              border: '1px solid #e5e7eb',
              padding: '12px 16px',
              fontSize: '14px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            },
            success: {
              iconTheme: { primary: '#059669', secondary: '#fff' },
            },
            error: {
              iconTheme: { primary: '#dc2626', secondary: '#fff' },
            },
          }}
        />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);
