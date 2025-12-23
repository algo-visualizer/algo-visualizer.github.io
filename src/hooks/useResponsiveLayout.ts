import { useEffect } from "react";
import { useUIStore } from "../stores/useUIStore";

export const useResponsiveLayout = () => {
  const setIsDesktop = useUIStore((state) => state.setIsDesktop);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const updateMatch = () => setIsDesktop(media.matches);

    updateMatch();
    media.addEventListener("change", updateMatch);

    return () => media.removeEventListener("change", updateMatch);
  }, [setIsDesktop]);
};
