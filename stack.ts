import "server-only"
import { StackServerApp } from "@stackframe/stack"
import { z } from "zod"
import { createRemoteJWKSet, jwtVerify } from "jose"
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies"
import type { RequestCookies } from "next/dist/server/web/spec-extension/request-cookies"

export const stackServerApp = new StackServerApp({
  tokenStore: "nextjs-cookie",
  redirectMethod: "nextjs",
  
  urls: {
    afterSignIn: "/app",
    afterSignUp: "/app",
    signIn: "/sign-in",
    signUp: "/sign-up",
  },
})

const TupleSchema = z.tuple([z.string(), z.string()])

const jwks = createRemoteJWKSet(
  new URL(
    `https://api.stack-auth.com/api/v1/projects/${process.env.NEXT_PUBLIC_STACK_PROJECT_ID}/.well-known/jwks.json`,
  ),
)

async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, jwks)
    return { success: true, payload, error: null } as const
  } catch (error) {
    return { success: false, error, payload: null } as const
  }
}

export async function getAccessToken(cookies: ReadonlyRequestCookies | RequestCookies) {
  const accessToken = cookies.get("stack-access")?.value
  if (!accessToken) return null

  const tokenTuple = TupleSchema.safeParse(JSON.parse(accessToken))
  if (!tokenTuple.success) return null

  return tokenTuple.data[1]
}

/**
 * Check access token in the cookie
 * Use this in middleware
 */
export async function checkAccessToken(cookies: ReadonlyRequestCookies | RequestCookies) {
  const accessToken = await getAccessToken(cookies)
  if (!accessToken) return null

  const { payload, success } = await verifyToken(accessToken)
  if (!success) return null

  return payload.sub
}
