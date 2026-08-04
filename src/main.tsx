import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from '@/App';
import '@/styles/globals.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Mount point #root is missing from index.html');

// index.html paints the root espresso-dark so first paint isn't a white flash.
// Once React owns the tree, hand styling back to the stylesheet.
rootEl.removeAttribute('style');

createRoot(rootEl).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
