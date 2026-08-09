import { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { UserSettingsModal } from "./components/settings";
import { GuestUpgradeModal, RegisterModal, SignInModal } from "./components/auth";
import { PlaceholderNotice, ProtectedRoute } from "./components/common";
import { useUserSettingsModal } from "./hooks/useUserSettingsModal";
import { useAuthModal } from "./hooks/useAuthModal";
import { useRouteIndexing } from "./hooks/useRouteIndexing";
import { ROUTES } from "./constants/routes";

const MarketingLayout = lazy(() => import("./components/layout/MarketingLayout").then((module) => ({ default: module.MarketingLayout })));
const Landing = lazy(() => import("./pages/Landing"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const CreateRoom = lazy(() => import("./pages/CreateRoom"));
const JoinRoom = lazy(() => import("./pages/JoinRoom"));
const Workspace = lazy(() => import("./pages/Workspace"));
const History = lazy(() => import("./pages/History"));
const Settings = lazy(() => import("./pages/Settings"));
const Profile = lazy(() => import("./pages/Profile"));
const SignIn = lazy(() => import("./pages/SignIn"));
const CreateAccount = lazy(() => import("./pages/CreateAccount"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const OAuthCallback = lazy(() => import("./pages/OAuthCallback"));
const ErrorPage = lazy(() => import("./pages/Error"));
const NotFound = lazy(() => import("./pages/NotFound"));

function RouteFallback() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <PlaceholderNotice icon="sync" title="Loading" description="Preparing this screen…" />
    </div>
  );
}

export default function App() {
  const { isOpen, closeUserSettings } = useUserSettingsModal();
  const { isGuestUpgradeOpen, closeGuestUpgrade, isSignInOpen, closeSignIn, isSignUpOpen, closeSignUp } = useAuthModal();
  useRouteIndexing();

  return (
    <>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route element={<MarketingLayout />}>
            <Route path={ROUTES.landing} element={<Landing />} />
          </Route>

          <Route path={ROUTES.signIn} element={<SignIn />} />
          <Route path={ROUTES.createAccount} element={<CreateAccount />} />
          <Route path={ROUTES.forgotPassword} element={<ForgotPassword />} />
          <Route path={ROUTES.resetPassword} element={<ResetPassword />} />
          <Route path={ROUTES.oauthCallback} element={<OAuthCallback />} />

          <Route
            path={ROUTES.createRoom}
            element={
              <ProtectedRoute>
                <CreateRoom />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.joinRoom}
            element={
              <ProtectedRoute>
                <JoinRoom />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.workspace}
            element={
              <ProtectedRoute>
                <Workspace />
              </ProtectedRoute>
            }
          />

          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path={ROUTES.dashboard} element={<Dashboard />} />
            <Route path={ROUTES.history} element={<History />} />
            <Route path={ROUTES.settings} element={<Settings />} />
            <Route path={ROUTES.profile} element={<Profile />} />
          </Route>

          <Route path="/error" element={<ErrorPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>

      {isOpen && <UserSettingsModal onClose={closeUserSettings} />}
      {isGuestUpgradeOpen && <GuestUpgradeModal onClose={closeGuestUpgrade} />}
      {isSignInOpen && <SignInModal onClose={closeSignIn} />}
      {isSignUpOpen && <RegisterModal onClose={closeSignUp} />}
    </>
  );
}
