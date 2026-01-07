import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dashboard | DramaRama",
  description: "Track your thinking progress and element mastery",
};

export default function DashboardLayout({ children }) {
  const { userId } = auth();
  if (!userId) redirect("/login");
  return children;
}

