"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";

export default function Footer() {
  return (
    <footer className="bg-black text-white py-12 px-6 lp:px-20">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex flex-col lp:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3">
            {/* White logo for dark background */}
            <Image 
              src="/images/icons8-drama-96.png" 
              width={40} 
              height={40} 
              alt="DramaRama" 
              style={{ filter: 'brightness(0) invert(1)' }}
            />
            <span className="font-display text-2xl">DramaRama</span>
          </div>
          <div className="flex gap-8 text-sm text-smoke">
            <Link href="/elements" className="hover:text-white transition-colors">
              Elements
            </Link>
            {/* Dashboard link only visible when logged in */}
            <SignedIn>
              <Link href="/dashboard" className="hover:text-white transition-colors">
                Dashboard
              </Link>
            </SignedIn>
            <SignedOut>
              <Link href="/login" className="hover:text-white transition-colors">
                Login
              </Link>
            </SignedOut>
          </div>
          <div className="text-sm text-smoke">
            DramaRama © {new Date().getFullYear()} — Think through it.
          </div>
        </div>
      </div>
    </footer>
  );
}

