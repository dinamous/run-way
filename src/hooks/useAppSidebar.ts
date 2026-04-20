import { useState } from "react";

function resolveInitialOpen(): boolean {
  return localStorage.getItem("sidebarOpen") !== "false";
}

/**
 * Manages desktop and mobile sidebar visibility.
 * Desktop open state is persisted in `localStorage`.
 */
export function useAppSidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(resolveInitialOpen);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen((prev) => {
      localStorage.setItem("sidebarOpen", String(!prev));
      return !prev;
    });
  };

  const openMobileSidebar = () => setMobileSidebarOpen(true);
  const closeMobileSidebar = () => setMobileSidebarOpen(false);

  return {
    sidebarOpen,
    mobileSidebarOpen,
    toggleSidebar,
    openMobileSidebar,
    closeMobileSidebar,
  };
}
