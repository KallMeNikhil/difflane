import { useNavigate } from "react-router-dom";
import { SignInModal } from "../components/auth";
import { ROUTES } from "../constants/routes";

export default function SignIn() {
  const navigate = useNavigate();
  return <SignInModal onClose={() => navigate(ROUTES.landing)} />;
}
