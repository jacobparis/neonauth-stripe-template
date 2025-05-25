import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { checkAccessToken } from "./stack"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

// Initialize Redis client
const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

// Create a new ratelimiter that allows 30 requests per 60 seconds
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, "60 s"),
})

function isProtectedRoute(url: string) {
  if (url === "/") {
    return false // skip check for landing page
  }

  const publicRoutes = [
    "/sign-in",
    "/sign-up",
    "/handler",
    "/handler/forgot-password",
    "/_next",
    "/favicon.ico",
    "/public",
    "/api/",
  ]

  // Check if the URL starts with any of the public routes
  for (const route of publicRoutes) {
    if (url.startsWith(route)) {
      return false
    }
  }
  
  // All other routes are protected
  return true
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Skip auth check for public routes
  if (isProtectedRoute(path)) {
    // We only check the access token for validity, we do not hit the StackAuth API
    // - middleware is called for every request, so we can't add such latency
    // - we need to check permissions before fetching/mutating anyway, so we do it in each action
    const userSub = await checkAccessToken(request.cookies)

    if (!userSub) {
      const redirectUrl =
        "/sign-in?redirect=" + encodeURIComponent(path.startsWith("/handler") ? "/" : path + request.nextUrl.search)

      return NextResponse.redirect(new URL(redirectUrl, request.url))
    }

    // Check rate limit for authenticated users
    const { success } = await ratelimit.limit(userSub)
    if (!success) {
      return new NextResponse("Too Many Requests", { status: 429 })
    }
  }

  return NextResponse.next()
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes (handled separately)
     */
    "/((?!_next/static|_next/image|favicon.ico|public/|api/).*)",
  ],
}
