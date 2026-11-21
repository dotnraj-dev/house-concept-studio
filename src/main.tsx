import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';
import './brief.css';
import './components/workspace.css';
import './ui/ui.css';
import './ui/theme-mono.css';
import './ui/layout-fixes.css';

// The studio uses one white-and-black theme only (customer decision 2026-11-21): pin light mode before the app reads it.
try{localStorage.setItem('hcs-theme','light');}catch{}
document.documentElement.dataset.theme='light';
new MutationObserver(()=>{if(document.documentElement.dataset.theme!=='light')document.documentElement.dataset.theme='light';}).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
