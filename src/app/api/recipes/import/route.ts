import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { extractRecipeFromUrl } from "@/lib/extractRecipe";

const PRIVATE_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^::1$/,
  /^localhost$/i,
];

function isPrivateHost(hostname: string): boolean {
  return PRIVATE_IP_PATTERNS.some((p) => p.test(hostname));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { url?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const url = typeof body.url === "string" ? body.url.trim() : "";
  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return NextResponse.json({ error: "Only http and https URLs are supported" }, { status: 400 });
  }

  if (isPrivateHost(parsed.hostname)) {
    return NextResponse.json({ error: "URL not allowed" }, { status: 400 });
  }

  try {
    const { data, method } = await extractRecipeFromUrl(url);
    return NextResponse.json({ data, method });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[import] Recipe extraction failed:", err);

    if (message.includes("fetch") || message.includes("timeout") || message.includes("Failed to fetch")) {
      return NextResponse.json(
        { error: "Could not access that page. The site may be blocking automated requests." },
        { status: 422 }
      );
    }

    if (message.includes("JSON") || message.includes("parse")) {
      return NextResponse.json(
        { error: "Could not extract a recipe from that page. Try a different URL." },
        { status: 422 }
      );
    }

    return NextResponse.json({ error: "Failed to import recipe. Please try again." }, { status: 500 });
  }
}
