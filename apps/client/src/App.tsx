import { Routes, Route } from "react-router-dom";
import { MarketingLayout, AppLayout } from "./components/layout";
import { ROUTES } from "./constants/routes";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import CreateRoom from "./pages/CreateRoom";
import JoinRoom from "./pages/JoinRoom";
import Workspace from "./pages/Workspace";
import History from "./pages/History";
import Settings from "./pages/Settings";
import ErrorPage from "./pages/Error";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <Routes>
      <Route element={<MarketingLayout />}>
        <Route path={ROUTES.landing} element={<Landing />} />
      </Route>

      <Route path={ROUTES.createRoom} element={<CreateRoom />} />
      <Route path={ROUTES.joinRoom} element={<JoinRoom />} />

      <Route element={<AppLayout />}>
        <Route path={ROUTES.dashboard} element={<Dashboard />} />
        <Route path={ROUTES.workspace} element={<Workspace />} />
        <Route path={ROUTES.history} element={<History />} />
        <Route path={ROUTES.settings} element={<Settings />} />
      </Route>

      <Route path="/error" element={<ErrorPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
