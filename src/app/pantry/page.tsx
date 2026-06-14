export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PantryManager } from "@/components/pantry/PantryManager";

export const metadata: Metadata = { title: "My Pantry" };

export default async function PantryPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");
  return <PantryManager />;
}
