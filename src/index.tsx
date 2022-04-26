import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/index.scss';
import App from './App';

document.addEventListener('contextmenu', event => event.preventDefault());

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);