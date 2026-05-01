import "../styles/globals.css";
import {
  ClerkProvider,
} from "@clerk/nextjs";
import { Providers } from "./providers";

export const metadata = {
  title: {
    default: "DramaRama",
    template: "%s | DramaRama",
  },
  description: "A thinking gym. Tell us what you want to become more effective at — we'll build you a course of puzzles that train you to get there. Built on the 5 Elements of Effective Thinking.",
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport = {
  // Always white. Previously we let dark-mode users see a black theme-color,
  // which caused a brief black flash in macOS Safari when navigating between
  // routes (especially Begin → /canvas/[id]) before our white body painted.
  // The product is a light-mode-only UI; theme-color should reflect that.
  themeColor: "#ffffff",
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider
      appearance={{
        // Ensure Clerk modals (SignInButton mode="modal") are readable even if the user’s OS is in dark mode.
        variables: {
          colorBackground: "#ffffff",
          colorText: "#111111",
          colorInputBackground: "#ffffff",
          colorInputText: "#111111",
          colorPrimary: "#8B0000",
        },
        elements: {
          modalContent: "bg-white text-black",
          card: "bg-white text-black",
          headerTitle: "text-black",
          headerSubtitle: "text-smoke",
          formFieldLabel: "text-ash",
          formFieldInput:
            "bg-white text-black placeholder:text-smoke border border-mist focus:border-black rounded-md",
          formButtonPrimary: "bg-[#8B0000] hover:bg-[#6B0000] text-white",
          footerActionLink: "text-black hover:text-ash",
        },
      }}
    >
    <html suppressHydrationWarning lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500;600&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body className="bg-white antialiased overflow-x-hidden">
        <Providers themeProps={{ attribute: "class", defaultTheme: "light" }}>
          {children}
        </Providers>
      </body>
    </html>
    </ClerkProvider>
  );
}
