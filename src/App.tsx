import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/auth/AuthContext";
import { ToastProvider } from "@/components/Toast";
import { Layout } from "@/components/Layout";
import {
  AuthRoute,
  AdminRoute,
  ProtectedRoute,
} from "@/components/ProtectedRoute";

import LoginPage from "@/screens/auth/LoginPage";
import RegisterPage from "@/screens/auth/RegisterPage";
import VerifyEmailPage from "@/screens/auth/VerifyEmailPage";
import RequestPasswordResetPage from "@/screens/auth/RequestPasswordResetPage";
import ResetPasswordPage from "@/screens/auth/ResetPasswordPage";

import { I18nProvider } from "@/i18n";
import DashboardPage from "@/screens/DashboardPage";
import WatchesPage from "@/screens/watches/WatchesPage";
import WatchFormPage from "@/screens/watches/WatchFormPage";
import WatchDetailPage from "@/screens/watches/WatchDetailPage";
import ShareInvitationsPage from "@/screens/watches/ShareInvitationsPage";
import TradesPage from "@/screens/trades/TradesPage";
import TradeDetailPage from "@/screens/trades/TradeDetailPage";
import CounterpartyLookupPage from "@/screens/counterparty/CounterpartyLookupPage";
import CounterpartyHistoryPage from "@/screens/counterparty/CounterpartyHistoryPage";
import ProfilePage from "@/screens/profile/ProfilePage";
import ActivityPage from "@/screens/activity/ActivityPage";
import BrandsPage from "@/screens/brands/BrandsPage";
import ClientsPage from "@/screens/clients/ClientsPage";
import ClientFormPage from "@/screens/clients/ClientFormPage";
import ClientDetailPage from "@/screens/clients/ClientDetailPage";
import NotFoundPage from "@/screens/NotFoundPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

export default function App() {
  return (
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ToastProvider>
            <BrowserRouter>
              <Routes>
                {/* Public auth pages (redirect to "/" when already logged in) */}
                <Route element={<AuthRoute />}>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/verify-email" element={<VerifyEmailPage />} />
                  <Route
                    path="/request-password-reset"
                    element={<RequestPasswordResetPage />}
                  />
                  <Route
                    path="/reset-password"
                    element={<ResetPasswordPage />}
                  />
                </Route>

                {/* Authenticated app shell */}
                <Route element={<Layout />}>
                  <Route element={<ProtectedRoute />}>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/watches" element={<WatchesPage />} />
                    <Route path="/watches/new" element={<WatchFormPage />} />
                    <Route
                      path="/watches/:watchId"
                      element={<WatchDetailPage />}
                    />
                    <Route
                      path="/watches/:watchId/edit"
                      element={<WatchFormPage />}
                    />
                    <Route
                      path="/invitations"
                      element={<ShareInvitationsPage />}
                    />
                    <Route path="/trades" element={<TradesPage />} />
                    <Route
                      path="/trades/:tradeId"
                      element={<TradeDetailPage />}
                    />
                    <Route
                      path="/lookup"
                      element={<CounterpartyLookupPage />}
                    />
                    <Route
                      path="/counterparty/:counterpartyId"
                      element={<CounterpartyHistoryPage />}
                    />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/activity" element={<ActivityPage />} />
                    <Route path="/clients" element={<ClientsPage />} />
                    <Route path="/clients/new" element={<ClientFormPage />} />
                    <Route
                      path="/clients/:clientId"
                      element={<ClientDetailPage />}
                    />
                    <Route
                      path="/clients/:clientId/edit"
                      element={<ClientFormPage />}
                    />

                    {/* Admin-only */}
                    <Route element={<AdminRoute />}>
                      <Route path="/brands" element={<BrandsPage />} />
                    </Route>
                  </Route>
                </Route>

                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </BrowserRouter>
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </I18nProvider>
  );
}
