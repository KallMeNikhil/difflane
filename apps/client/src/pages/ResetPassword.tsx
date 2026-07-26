import { useSearchParams } from "react-router-dom";
import { ResetPasswordModal } from "../components/auth";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  return <ResetPasswordModal token={searchParams.get("token")} />;
}
