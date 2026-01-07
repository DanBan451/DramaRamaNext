 "use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export const metadata = {
  title: "Dashboard | DramaRama",
  description: "Track your thinking progress and element mastery",
};

export default function DashboardLayout({ children }) {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.replace("/login");
  }, [isLoaded, isSignedIn, router]);

  // While Clerk is loading, avoid flashing protected content.
  if (!isLoaded) return null;
  if (!isSignedIn) return null;

  return <>{children}</>;
}

