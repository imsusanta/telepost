import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function ConnectBot() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to Channels page for multi-channel support
    navigate("/dashboard/channels", { replace: true });
  }, [navigate]);

  return null;
}
