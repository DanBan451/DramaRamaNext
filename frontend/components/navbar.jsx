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

  // Base nav items (always visible)
  const baseNavItems = [
    { name: "Home", path: "/" },
    { name: "Elements", path: "/elements" },
  ];

  // Auth-only nav items
  const authNavItems = [
    { name: "Dashboard", path: "/dashboard" },
  ];

  // Mobile menu items for signed out users
  const signedOutMenuItems = [
    { name: "Home", path: "/" },
    { name: "Elements", path: "/elements" },
  ];

  // Mobile menu items for signed in users
  const signedInMenuItems = [
    { name: "Home", path: "/" },
    { name: "Elements", path: "/elements" },
    { name: "Dashboard", path: "/dashboard" },
    { name: "Sessions", path: "/sessions" },
  ];

  const isActive = (path) => pathname === path;

  return (
    <NextUINavbar
      onMenuOpenChange={setIsMenuOpen}
      isBlurred={false}
      className="fixed top-0 bg-transparent backdrop-blur-md backdrop-saturate-150 z-50 lp:pt-5"
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
              className="hidden tb:block w-[40px] lp:w-[50px]"
              alt="DramaRama"
            />
            <span className="font-display text-black text-[20px] lp:text-[24px] hidden tb:block">
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
                ? "border-b-2 border-b-black"
                : "border-b-2 border-b-transparent hover:border-b-smoke"
            } pb-1 transition-all`}
          >
            <Link
              className="text-black text-[16px] font-medium"
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
                  ? "border-b-2 border-b-black"
                  : "border-b-2 border-b-transparent hover:border-b-smoke"
              } pb-1 transition-all`}
            >
              <Link
                className="text-black text-[16px] font-medium"
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
                className="bg-mist/70 text-black px-6 py-5 text-[16px] font-semibold hover:bg-mist transition-colors"
                radius="none"
              >
                Login
              </Button>
            </Link>
        </NavbarItem>
        <NavbarItem>
            <Link href="/login">
          <Button
                className="bg-black text-white px-6 py-5 text-[16px] font-semibold hover:bg-ash transition-colors"
            radius="none"
          >
            Get Started
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
                    ? "text-black font-semibold"
                    : "text-smoke hover:text-black"
                }`}
                href={item.path}
                size="lg"
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
                  ? "text-black font-semibold"
                  : "text-smoke hover:text-black"
              }`}
              href={item.path}
              size="lg"
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
