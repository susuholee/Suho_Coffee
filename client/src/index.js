import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import App from './App';

// 백엔드 API 기본 주소 및 쿠키 설정 (포트 4000 직결)
axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:4000';
axios.defaults.withCredentials = true;

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
