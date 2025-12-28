"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "./navbar";

// Pages where navbar should be hidden
const noNavbarPages = ["/login"];

export const NavbarWrapper = () => {
  const pathname = usePathname();
  
  if (noNavbarPages.includes(pathname)) {
    return null;
  }
  
  return <Navbar />;
};

