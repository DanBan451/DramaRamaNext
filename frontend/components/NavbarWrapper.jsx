"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "./navbar";

// Pages where navbar is always hidden.
// Canvas pages take the full viewport (sidebar + canvas) and have their
// own back button, so the global fixed navbar is hidden there to prevent
// it from sitting on top of the canvas.
const noNavbarPages = ["/login"];
const noNavbarPrefixes = ["/canvas/"];

export const NavbarWrapper = () => {
  const pathname = usePathname();

  if (noNavbarPages.includes(pathname)) {
    return null;
  }
  if (noNavbarPrefixes.some((p) => pathname.startsWith(p))) {
    return null;
  }

  return <Navbar />;
};

