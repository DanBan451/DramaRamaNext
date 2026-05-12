"use client";

import {
  Navbar as NextUINavbar,
  NavbarContent,
  NavbarMenu,
  NavbarMenuToggle,
  NavbarBrand,
  NavbarItem,
  NavbarMenuItem,
} from "@nextui-org/navbar";
import { Button } from "@nextui-org/button";
import { Link } from "@nextui-org/link";
import { usePathname } from "next/navigation";
import { Image } from "@nextui-org/react";
import { useState } from "react";
import { 
  SignedIn, 
  SignedOut, 
  UserButton,
  SignInButton,
} from "@clerk/nextjs";

export const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  // Text colors for navbar - dark text on light background
  const textColor = "text-black";
  const textMuted = "text-smoke";
  const borderColor = "border-b-black";
  const hoverBorder = "hover:border-b-smoke";

  // Base nav items (always visible)
  const baseNavItems = [
    { name: "Home", path: "/" },
    { name: "The Practice", path: "/framework" },
  ];

  // Auth-only nav items
  const authNavItems = [
    { name: "Understand", path: "/courses" },
    { name: "Profile", path: "/profile" },
  ];

  // Mobile menu items for signed out users
  const signedOutMenuItems = [
    { name: "Home", path: "/" },
    { name: "The Practice", path: "/framework" },
  ];

  // Mobile menu items for signed in users
  const signedInMenuItems = [
    { name: "Home", path: "/" },
    { name: "The Practice", path: "/framework" },
    { name: "Understand", path: "/courses" },
    { name: "Profile", path: "/profile" },
  ];

  const isActive = (path) => {
    if (!pathname) return false;
    if (path === "/") return pathname === "/";
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  return (
    <NextUINavbar
      onMenuOpenChange={setIsMenuOpen}
      isBlurred={false}
      className="fixed top-0 bg-transparent backdrop-blur-md z-50 py-2"
      maxWidth="2xl"
    >
      <NavbarContent className="lp:max-w-[30%]">
        <NavbarMenuToggle
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          className="sm:hidden text-black"
        />
        <NavbarBrand>
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/images/icons8-drama-96.png"
              className="w-[48px] tb:w-[60px] lp:w-[72px]"
              alt="DramaRama"
            />
            <span className={`font-mono text-sm lp:text-base ${textColor} tracking-[0.28em] uppercase font-medium`}>
              DramaRama
            </span>
          </Link>
        </NavbarBrand>
      </NavbarContent>

      <NavbarContent className="hidden sm:flex gap-8 lp:gap-12 max-w-min p-0 ml-auto lp:mr-10">
        {/* Base nav items - always visible */}
        {baseNavItems.map((item) => (
          <NavbarItem
            key={item.path}
            className={`${
              isActive(item.path)
                ? `border-b-2 ${borderColor}`
                : `border-b-2 border-b-transparent ${hoverBorder}`
            } pb-1 transition-all`}
          >
            <Link
              className={`${textColor} text-[16px] font-medium`}
              href={item.path}
            >
              {item.name}
            </Link>
          </NavbarItem>
        ))}
        
        {/* Auth-only nav items - only visible when signed in */}
        <SignedIn>
          {authNavItems.map((item) => (
            <NavbarItem
              key={item.path}
              className={`${
                isActive(item.path)
                  ? `border-b-2 ${borderColor}`
                  : `border-b-2 border-b-transparent ${hoverBorder}`
              } pb-1 transition-all`}
            >
              <Link
                className={`${textColor} text-[16px] font-medium`}
                href={item.path}
              >
                {item.name}
              </Link>
            </NavbarItem>
          ))}
        </SignedIn>
      </NavbarContent>

      <NavbarContent className="max-w-min gap-4" justify="end">
        {/* Signed Out - show login/get started */}
        <SignedOut>
          <NavbarItem className="hidden tb:flex">
            <Link href="/login">
              <Button
                className="bg-transparent border border-mist text-black px-5 py-4 text-sm font-medium hover:bg-mist transition-colors"
                radius="none"
              >
                Login
              </Button>
            </Link>
          </NavbarItem>
          <NavbarItem>
            <Link href="/login">
              <Button
                className="bg-primary text-white px-5 py-4 text-sm font-medium hover:bg-primary/90 transition-colors"
                radius="none"
              >
                Start a Course
              </Button>
            </Link>
          </NavbarItem>
        </SignedOut>

        {/* Signed In - show user button (Dashboard link exists in the nav items) */}
        <SignedIn>
          <NavbarItem>
            <UserButton 
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "w-10 h-10",
                }
              }}
            />
        </NavbarItem>
        </SignedIn>
      </NavbarContent>

      {/* Mobile Menu */}
      <NavbarMenu className="pt-8 bg-white/95 backdrop-blur-lg">
        {/* Signed Out Menu */}
        <SignedOut>
          {signedOutMenuItems.map((item, index) => (
            <NavbarMenuItem key={`${item.name}-${index}`}>
              <Link
                className={`w-full text-lg py-2 ${
                  isActive(item.path)
                    ? `font-bold ${textColor} ${borderColor}`
                    : `${textMuted} ${hoverBorder}`
                }`}
                href={item.path}
                size="lg"
                onClick={() => setIsMenuOpen(false)}
              >
                {item.name}
              </Link>
            </NavbarMenuItem>
          ))}
          <NavbarMenuItem>
            <SignInButton mode="modal">
              <button className="w-full text-lg py-2 text-black font-semibold text-left">
                Login / Sign Up
              </button>
            </SignInButton>
          </NavbarMenuItem>
        </SignedOut>

        {/* Signed In Menu */}
        <SignedIn>
          {signedInMenuItems.map((item, index) => (
            <NavbarMenuItem key={`${item.name}-${index}`}>
              <Link
                className={`w-full text-lg py-2 ${
                  isActive(item.path)
                    ? `font-bold ${textColor} ${borderColor}`
                    : `${textMuted} ${hoverBorder}`
                }`}
                href={item.path}
                size="lg"
                onClick={() => setIsMenuOpen(false)}
              >
                {item.name}
              </Link>
            </NavbarMenuItem>
          ))}
        </SignedIn>
      </NavbarMenu>
    </NextUINavbar>
  );
};
