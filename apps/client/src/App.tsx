import { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import { MarketingLayout, AppLayout } from "./components/layout";
import { UserSettingsModal } from "./components/settings";
import { PlaceholderNotice } from "./components/common";
import { useUserSettingsModal } from "./hooks/useUserSettingsModal";
import { ROUTES } from "./constants/routes";

const Landing = lazy(() => import("./pages/Landing"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const CreateRoom = lazy(() => import("./pages/CreateRoom"));
const JoinRoom = lazy(() => import("./pages/JoinRoom"));
const Workspace = lazy(() => import("./pages/Workspace"));
const History = lazy(() => import("./pages/History"));
const Settings = lazy(() => import("./pages/Settings"));
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

  return (
    <>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route element={<MarketingLayout />}>
            <Route path={ROUTES.landing} element={<Landing />} />
          </Route>

          <Route path={ROUTES.createRoom} element={<CreateRoom />} />
          <Route path={ROUTES.joinRoom} element={<JoinRoom />} />
          <Route path={ROUTES.workspace} element={<Workspace />} />

          <Route element={<AppLayout />}>
            <Route path={ROUTES.dashboard} element={<Dashboard />} />
            <Route path={ROUTES.history} element={<History />} />
            <Route path={ROUTES.settings} element={<Settings />} />
          </Route>

          <Route path="/error" element={<ErrorPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>

      {isOpen && <UserSettingsModal onClose={closeUserSettings} />}
    </>
  );
}
