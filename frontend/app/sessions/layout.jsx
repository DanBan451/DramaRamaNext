import { AuthGate } from "./AuthGate";

export const metadata = {
  title: "Sessions | DramaRama",
  description: "Your thinking sessions",
};

export default function SessionsLayout({ children }) {
  return <AuthGate>{children}</AuthGate>;
}

