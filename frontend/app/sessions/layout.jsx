import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sessions | DramaRama",
  description: "Your algorithm thinking sessions",
};

export default function SessionsLayout({ children }) {
  const { userId } = auth();
  if (!userId) redirect("/login");
  return children;
}

