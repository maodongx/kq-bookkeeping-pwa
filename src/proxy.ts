import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

// `sw.js` and `manifest.json` must stay outside the auth check. They were
// matched before, so a logged-out visitor's requests for them 307'd to /login
// and came back as HTML: service-worker registration failed with "unsupported
// MIME type ('text/html')" and the manifest failed to parse, so the PWA could
// not be installed until after a login *and* a reload.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.json|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
