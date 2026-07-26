import { useNavigate } from "react-router-dom";
import { ForgotPasswordModal } from "../components/auth";
import { ROUTES } from "../constants/routes";

export default function ForgotPassword() {
  const navigate = useNavigate();
  return <ForgotPasswordModal onClose={() => navigate(ROUTES.signIn)} />;
}
