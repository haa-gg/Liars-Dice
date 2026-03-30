import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@fontsource/pirata-one';
import '@fontsource/inter/400.css';
import '@fontsource/inter/700.css';
import './index.css'
import App from './App'

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

createRoot(rootElement).render(
    <StrictMode>
        <BrowserRouter basename="/Liars-Dice">
            <App />
        </BrowserRouter>
    </StrictMode>,
)
