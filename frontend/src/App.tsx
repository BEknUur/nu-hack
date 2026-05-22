import { useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useParams,
  useLocation,
} from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/ProtectedRoute';
import LandingPage from '@/pages/LandingPage';
import MapPage from '@/pages/MapPage';
import DashboardPage from '@/pages/DashboardPage';
import AuthPage from '@/pages/AuthPage';
import { I18nProvider, useTranslation, type Language } from '@/i18n';
import { isLangSlug } from '@/i18n/langRoutes';

function LanguageLayout() {
  const { lang } = useParams();
  const { setLanguage } = useTranslation();
  const location = useLocation();

  useEffect(() => {
    if (lang && isLangSlug(lang)) {
      setLanguage(lang as Language);
    }
  }, [lang, setLanguage]);

  if (!lang || !isLangSlug(lang)) {
    const rest = location.pathname.replace(/^\/[^/]+/, '') || '';
    return <Navigate to={rest === '' ? '/en' : `/en${rest}`} replace />;
  }

  return <Outlet />;
}

function LegacyAppCaseRedirect() {
  const { caseId } = useParams();
  return <Navigate to={`/en/app/${caseId as string}`} replace />;
}

export default function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/en" replace />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/app" element={<Navigate to="/en/app" replace />} />
            <Route path="/app/:caseId" element={<LegacyAppCaseRedirect />} />

            <Route path="/:lang" element={<LanguageLayout />}>
              <Route index element={<LandingPage />} />
              <Route path="app" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              <Route path="app/:caseId" element={<ProtectedRoute><MapPage /></ProtectedRoute>} />
            </Route>

            <Route path="*" element={<Navigate to="/en" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </I18nProvider>
  );
}
