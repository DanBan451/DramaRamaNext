import { AuthGate } from "./AuthGate";

export const metadata = {
  title: "Dashboard | DramaRama",
  description: "Track your thinking progress and element mastery",
};

export default function DashboardLayout({ children }) {
  return <AuthGate>{children}</AuthGate>;
}

