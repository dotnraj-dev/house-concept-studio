import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';
import './brief.css';
import './components/workspace.css';
import './ui/ui.css';

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
