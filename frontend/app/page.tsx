import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import DocumentHeader from "./components/DocumentHeader";
import RedactedDocument from "./components/RedactedDocument";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/chat");
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--background)" }}
    >
      <DocumentHeader />
      <RedactedDocument />
    </div>
  );
}