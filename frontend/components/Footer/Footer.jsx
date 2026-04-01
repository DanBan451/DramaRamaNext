"use client";

import React from "react";
import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";

export default function Footer() {
  return (
    <footer className="bg-mist border-t border-mist py-8 px-6">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="text-smoke text-sm">
          © {new Date().getFullYear()} DramaRama. Built for deeper thinking.
        </div>
        <div className="flex gap-6 text-sm">
          <Link href="/framework" className="text-smoke hover:text-black transition-colors">
            Framework
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

