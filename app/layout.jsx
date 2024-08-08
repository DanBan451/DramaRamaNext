import "../styles/globals.css";
import { Providers } from "./providers";
import { Navbar } from "../components/navbar";

export const metadata = {
  title: {
    default: "DramaRama",
  },
  description: "We dramatize your website!",
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
    <html suppressHydrationWarning lang="en">
      <head />
      <body className={'bg-white'}>
        <Providers themeProps={{ attribute: "class", defaultTheme: "dark" }}>
          <Navbar />
          {children}  
        </Providers>
      </body>
    </html>
  );
}
