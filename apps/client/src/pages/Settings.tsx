import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUserSettingsModal } from "../hooks/useUserSettingsModal";
import { ROUTES } from "../constants/routes";

export default function Settings() {
  const navigate = useNavigate();
  const { openUserSettings } = useUserSettingsModal();

  useEffect(() => {
    openUserSettings();
    navigate(ROUTES.dashboard, { replace: true });
  }, [openUserSettings, navigate]);

  return null;
}
