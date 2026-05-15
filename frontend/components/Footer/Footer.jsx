"use client";

import React from "react";
import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";

export default function Footer() {
  return (
    <footer className="border-t border-mist bg-mist py-8">
      <div className="nav-shell flex flex-col items-center justify-between gap-4 md:flex-row">
        <div className="text-smoke text-sm">
          © {new Date().getFullYear()} DramaRama. Built for deeper thinking.
        </div>
        <div className="flex gap-6 text-sm">
          <Link href="/framework" className="text-smoke hover:text-black transition-colors">
            Curious how it works?
          </Link>
          <SignedIn>
            <Link href="/profile" className="text-smoke hover:text-black transition-colors">
              Profile
            </Link>
          </SignedIn>
          <SignedOut>
            <Link href="/login" className="text-smoke hover:text-black transition-colors">
              Login
            </Link>
          </SignedOut>
        </div>
      </div>
    </footer>
  );
}

