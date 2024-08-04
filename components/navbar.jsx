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
import { usePathname } from 'next/navigation';

import {
  Logo,
} from "@/components/icons";
import { Image } from "@nextui-org/react";
import { useState } from "react";

import logo from "../images/icons8-masks-66.png";
import chevronDown from "../images/icons8-down-arrow-100.png";
import headerImage from "../images/header.png";
import Device from "./Device";

export const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuItems = [
    "Profile",
    "Dashboard",
    "Activity",
    "Analytics",
    "System",
    "Deployments",
    "My Settings",
    "Team Settings",
    "Help & Feedback",
    "Log Out",
  ];
  const pathname = usePathname()

  return (
    <NextUINavbar onMenuOpenChange={setIsMenuOpen}>
      <NavbarContent>
        <NavbarMenuToggle
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          className="sm:hidden"
        />
        <NavbarBrand>
          <Logo>
            <Image src={logo} />
          </Logo>
          <p className="font-bold text-inherit">DramaRama</p>
        </NavbarBrand>
      </NavbarContent>

      <NavbarContent className="hidden sm:flex gap-4" justify="center">
        <NavbarItem className={`${pathname === '/' && "border-b-2 border-b-white mt-3 pb-3"}`}>
          <Link
            color="foreground"
            href="/"
          >
            Home
          </Link>
        </NavbarItem>
        <NavbarItem className={`${pathname === '/about' && "border-b-2 border-b-white mt-3 pb-3"}`}>
          <Link
            color="foreground"
            href="about"            
          >
            About
          </Link>
        </NavbarItem>
        <NavbarItem className={`${pathname === '/services' && "border-b-2 border-b-white pb-3"}`}>
          <Link
            color="foreground"
            href="services"
          >
            Services
          </Link>
        </NavbarItem>
      </NavbarContent>
      <NavbarContent justify="end">
        <NavbarItem>
          <Button
            as={Link}
            color="white"
            hover={"border-1 border-black background-transparent"}
            href="#"            
            variant="flat"
            className={'bg-black'}
          >
            Get Started
          </Button>
        </NavbarItem>
      </NavbarContent>
      <NavbarMenu>
        {menuItems.map((item, index) => (
          <NavbarMenuItem key={`${item}-${index}`}>
            <Link
              color={
                index === 2
                  ? "primary"
                  : index === menuItems.length - 1
                    ? "danger"
                    : "foreground"
              }
              className="w-full"
              href="#"
              size="lg"
            >
              {item}
            </Link>
          </NavbarMenuItem>
        ))}
      </NavbarMenu>
    </NextUINavbar>
  );
};
