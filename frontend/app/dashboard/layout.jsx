import { ClerkLoaded, ClerkLoading, RedirectToSignIn, SignedIn, SignedOut } from "@clerk/nextjs";

export const metadata = {
  title: "Dashboard | DramaRama",
  description: "Track your thinking progress and element mastery",
};

export default function DashboardLayout({ children }) {
  return (
    <>
      <ClerkLoading />
      <ClerkLoaded>
        <SignedIn>{children}</SignedIn>
        <SignedOut>
          <RedirectToSignIn />
        </SignedOut>
      </ClerkLoaded>
    </>
  );
}

