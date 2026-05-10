import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from '@/pages/LandingPage';
import MapPage from '@/pages/MapPage';
import { I18nProvider } from '@/i18n';

export default function App() {
  return (
    <I18nProvider>
      <BrowserRouter>
        <Routes>
          {/* Landing page */}
          <Route path="/" element={<LandingPage />} />

          <Route path="/app" element={<MapPage />} />
          <Route path="/app/:caseId" element={<MapPage />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </I18nProvider>
  );
}
