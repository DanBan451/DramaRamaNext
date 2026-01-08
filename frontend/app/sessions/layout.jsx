import { ClerkLoaded, ClerkLoading, RedirectToSignIn, SignedIn, SignedOut } from "@clerk/nextjs";

export const metadata = {
  title: "Sessions | DramaRama",
  description: "Your algorithm thinking sessions",
};

export default function SessionsLayout({ children }) {
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

