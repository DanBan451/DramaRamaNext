"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Navbar } from "./navbar";

// Pages where navbar is always hidden
const noNavbarPages = ["/login"];

export const NavbarWrapper = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  if (noNavbarPages.includes(pathname)) {
    return null;
  }

  // Hide navbar when inside an active session (cinematic experience)
  if (pathname === "/workspace" && (searchParams.get("session") || searchParams.get("puzzle"))) {
    return null;
  }
  
  return <Navbar />;
};

