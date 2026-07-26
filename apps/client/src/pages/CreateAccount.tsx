import { useNavigate } from "react-router-dom";
import { RegisterModal } from "../components/auth";
import { ROUTES } from "../constants/routes";

export default function CreateAccount() {
  const navigate = useNavigate();
  return <RegisterModal onClose={() => navigate(ROUTES.landing)} />;
}
