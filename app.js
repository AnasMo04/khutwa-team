import { bootstrap } from './js/app.js';

// Initialize Khutwa Team web application
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => bootstrap());
} else {
  bootstrap();
}
