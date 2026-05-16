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
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

const textLinkClass =
  "font-display text-black text-lg font-normal leading-snug lp:text-xl transition-colors duration-200";

export const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  const textColor = "text-black";
  const textMuted = "text-smoke";

  const practicePath = "/the-practice";

  const authNavItems = [
    { name: "Workspace", path: "/goals" },
    { name: "Profile", path: "/profile" },
  ];

  const signedOutMenuItems = [
    { name: "The Practice", path: practicePath },
    { name: "Login", path: "/login" },
    { name: "Forge Your Mind", path: "/login", cta: true },
  ];

  const signedInMenuItems = [
    { name: "The Practice", path: practicePath },
    { name: "Workspace", path: "/goals" },
    { name: "Profile", path: "/profile" },
  ];

  const isActive = (path) => {
    if (!pathname) return false;
    if (path === "/") return pathname === "/";
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  const textNavItemClass = (path) =>
    isActive(path)
      ? "font-semibold text-black"
      : "text-smoke hover:text-black";

  return (
    <NextUINavbar
      onMenuOpenChange={setIsMenuOpen}
      isBlurred={false}
      className="fixed top-0 z-50 bg-transparent py-2 backdrop-blur-md"
      maxWidth="2xl"
      classNames={{
        wrapper:
          "box-border flex w-full max-w-[1536px] flex-nowrap items-center justify-between gap-4 px-6",
      }}
    >
      <NavbarContent
        as="div"
        justify="start"
        className="m-0 flex min-w-0 list-none flex-row flex-nowrap items-center gap-2 p-0 !grow-0 !basis-auto"
      >
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
            <span className={`font-mono text-base lp:text-lg ${textColor} tracking-[0.28em] uppercase font-medium`}>
              DramaRama
            </span>
          </Link>
        </NavbarBrand>
      </NavbarContent>

      <NavbarContent
        as="div"
        justify="end"
        className="m-0 hidden min-w-0 min-h-0 list-none flex-row flex-nowrap items-center gap-x-[clamp(1.5rem,2.5vw,3rem)] p-0 sm:flex"
      >
        <NavbarItem as="div" className={textNavItemClass(practicePath)}>
          <Link className={textLinkClass} href={practicePath}>
            The Practice
          </Link>
        </NavbarItem>

        <SignedOut>
          <NavbarItem as="div" className={textNavItemClass("/login")}>
            <Link className={textLinkClass} href="/login">
              Login
            </Link>
          </NavbarItem>
          <NavbarItem as="div">
            <Link href="/login">
              <Button
                className="rounded-sm bg-change px-5 py-4 text-base font-semibold text-white shadow-sm transition-[background-color,box-shadow,transform] duration-200 hover:bg-change/90 hover:shadow-md"
                radius="sm"
              >
                Forge Your Mind
              </Button>
            </Link>
          </NavbarItem>
        </SignedOut>

        <SignedIn>
          {authNavItems.map((item) => (
            <NavbarItem as="div" key={item.path} className={textNavItemClass(item.path)}>
              <Link className={textLinkClass} href={item.path}>
                {item.name}
              </Link>
            </NavbarItem>
          ))}
          <NavbarItem as="div" className="flex shrink-0 items-center pl-1">
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "w-10 h-10",
                },
              }}
            />
          </NavbarItem>
        </SignedIn>
      </NavbarContent>

      <NavbarMenu className="pt-8 bg-white/95 backdrop-blur-lg">
        <SignedOut>
          {signedOutMenuItems.map((item, index) => (
            <NavbarMenuItem key={`${item.name}-${index}`}>
              {item.cta ? (
                <Link
                  href={item.path}
                  className="mt-2 flex w-full max-w-xs items-center justify-center bg-change px-6 py-4 text-base font-semibold text-white shadow-sm transition-[background-color,box-shadow] duration-200 hover:bg-change/90"
                  size="lg"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ) : (
                <Link
                  className={`w-full text-xl py-2 transition-colors ${
                    isActive(item.path) ? `font-semibold ${textColor}` : textMuted
                  } hover:text-black`}
                  href={item.path}
                  size="lg"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.name}
                </Link>
              )}
            </NavbarMenuItem>
          ))}
        </SignedOut>

        <SignedIn>
          {signedInMenuItems.map((item, index) => (
            <NavbarMenuItem key={`${item.name}-${index}`}>
              <Link
                className={`w-full text-xl py-2 transition-colors ${
                  isActive(item.path) ? `font-semibold ${textColor}` : textMuted
                } hover:text-black`}
                href={item.path}
                size="lg"
                onClick={() => setIsMenuOpen(false)}
              >
                {item.name}
              </Link>
            </NavbarMenuItem>
          ))}
          <NavbarMenuItem className="mt-4">
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "w-10 h-10",
                },
              }}
            />
          </NavbarMenuItem>
        </SignedIn>
      </NavbarMenu>
    </NextUINavbar>
  );
};
