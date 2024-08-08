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
  const pathname = usePathname();

  return (
    <NextUINavbar onMenuOpenChange={setIsMenuOpen} isBlurred={false} className="absolute bg-transparent backdrop-saturate-100 lp:pt-5" maxWidth="2xl">

      <NavbarContent className="lp:max-w-[30%]">
        <NavbarMenuToggle
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          className="sm:hidden text-red-500"         
        />
        <NavbarBrand> 
          <Image src={"/images/icons8-drama-96.png"} className="hidden tb:block w-[50px] lp:w-[65px]" />
          <p className="font-bold ml-3 lp:ml-5 text-black text-[20px] lp:text-[25px] hidden tb:block">DramaRama</p>
        </NavbarBrand>
      </NavbarContent>

      <NavbarContent className="hidden sm:flex gap-5 lp:gap-10 max-w-min p-0 ml-auto lp:mr-10">        
        <NavbarItem
          className={`${pathname === "/" && "border-b-2 lp:border-b-3 border-b-black mt-3 pb-3"}`}
        >
          <Link className="text-black lp:text-[20px] font-semibold" href="/">
            Home
          </Link>
        </NavbarItem>
        <NavbarItem
          className={`${pathname === "/about" && "border-b-2 lp:border-b-3 border-b-black mt-3 pb-3"}`}
        >
          <Link className="text-black lp:text-[20px] font-semibold" href="about">
            About
          </Link>
        </NavbarItem>
        <NavbarItem
          className={`${pathname === "/services" && "border-b-2 lp:border-b-3 border-b-black pb-3"}`}
        >
          <Link className="text-black lp:text-[20px] font-semibold" href="services">
            Services
          </Link>
        </NavbarItem>
      </NavbarContent>

      <NavbarContent className="max-w-min" justify="end">
        <NavbarItem>
          <Button
            as={Link}                        
            hover={"border-1 border-black background-transparent"}
            href="#"
            variant="flat"
            className={"bg-black text-white lp:px-12 lp:py-7 lp:text-[20px]"}            
            radius="none"
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
