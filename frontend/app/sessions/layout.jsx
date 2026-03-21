import { AuthGate } from "./AuthGate";

export const metadata = {
  title: "Sessions | DramaRama",
  description: "Your AI-utilization puzzle sessions",
};

export default function SessionsLayout({ children }) {
  return <AuthGate>{children}</AuthGate>;
}

