import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { ToastProviderV2 } from '../ui/toast/ToastProviderV2';
import router from './router';
import './index.css'; // We will create this file later
import './responsive.v2.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProviderV2>
      <RouterProvider router={router} />
    </ToastProviderV2>
  </StrictMode>,
);
