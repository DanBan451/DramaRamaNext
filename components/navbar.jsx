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

export const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  const navItems = [
    { name: "Home", path: "/" },
    { name: "Elements", path: "/elements" },
    { name: "Dashboard", path: "/dashboard" },
  ];

  const menuItems = [
    { name: "Home", path: "/" },
    { name: "Elements", path: "/elements" },
    { name: "Dashboard", path: "/dashboard" },
    { name: "Sessions", path: "/sessions" },
    { name: "Login", path: "/login" },
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
        {navItems.map((item) => (
          <NavbarItem
            key={item.path}
            className={`${
              isActive(item.path)
                ? "border-b-2 border-b-black"
                : "border-b-2 border-b-transparent hover:border-b-smoke"
            } pb-1 transition-all`}
          >
            <Link
              className="text-black lp:text-[16px] font-medium"
              href={item.path}
            >
              {item.name}
            </Link>
          </NavbarItem>
        ))}
      </NavbarContent>

      <NavbarContent className="max-w-min" justify="end">
        <NavbarItem className="hidden tb:flex">
          <Link href="/login" className="text-black lp:text-[14px] font-medium mr-4">
            Login
          </Link>
        </NavbarItem>
        <NavbarItem>
          <Button
            as={Link}
            href="/login"
            className="bg-black text-white lp:px-6 lp:py-5 lp:text-[14px] font-semibold hover:bg-ash transition-colors"
            radius="none"
          >
            Get Started
          </Button>
        </NavbarItem>
      </NavbarContent>

      <NavbarMenu className="pt-8 bg-white/95 backdrop-blur-lg">
        {menuItems.map((item, index) => (
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
      </NavbarMenu>
    </NextUINavbar>
  );
};
