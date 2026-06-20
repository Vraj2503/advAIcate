import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import DocumentHeader from "./components/DocumentHeader";
import RedactedDocument from "./components/RedactedDocument";
import UrlCleaner from "./components/UrlCleaner";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getServerSession(authOptions);
  const params = await searchParams;

  // Redirect signed-in users to chat, unless they explicitly navigated here
  if (session && !params.home) {
    redirect("/chat");
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--background)" }}
    >
      <DocumentHeader />
      <RedactedDocument />
      <UrlCleaner />
    </div>
  );
}