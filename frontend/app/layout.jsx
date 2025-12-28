import "../styles/globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { Providers } from "./providers";
import { NavbarWrapper } from "../components/NavbarWrapper";

export const metadata = {
  title: {
    default: "DramaRama",
    template: "%s | DramaRama",
  },
  description: "Train your mind. Master algorithms. DramaRama is your mental gym for algorithms using the 5 Elements of Effective Thinking.",
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html suppressHydrationWarning lang="en">
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link 
            href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500;600&display=swap" 
            rel="stylesheet" 
          />
        </head>
        <body className="bg-white antialiased">
          <Providers themeProps={{ attribute: "class", defaultTheme: "light" }}>
            <NavbarWrapper />
            {children}
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
