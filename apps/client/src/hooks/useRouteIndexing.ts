import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { ROUTES } from "../constants/routes";
import { SITE_URL } from "../constants/seo";
import { setCanonicalUrl, setRobotsDirective } from "../utils/seo";

export function useRouteIndexing(): void {
  const { pathname } = useLocation();

  useEffect(() => {
    const isPublic = pathname === ROUTES.landing;
    setRobotsDirective(isPublic ? "index, follow" : "noindex, nofollow");
    if (isPublic) {
      setCanonicalUrl(`${SITE_URL}${pathname}`);
    }
  }, [pathname]);
}
