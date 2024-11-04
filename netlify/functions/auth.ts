import { Handler } from '@netlify/functions'
import NextAuth from 'next-auth'
import WorldcoinProvider from 'next-auth/providers/worldcoin'

const handler: Handler = async (event, context) => {
  const siteUrl = process.env.NEXTAUTH_URL || process.env.URL || 'http://localhost:3000'

  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': siteUrl,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400'
      },
      body: ''
    }
  }

  const authHandler = NextAuth({
    providers: [
      WorldcoinProvider({
        clientId: process.env.NEXT_PUBLIC_WLD_APP_ID!,
        clientSecret: process.env.WLD_CLIENT_SECRET!,
      }),
    ],
    secret: process.env.NEXTAUTH_SECRET,
    session: {
      strategy: 'jwt',
      maxAge: 30 * 24 * 60 * 60,
    },
    callbacks: {
      async jwt({ token, profile }) {
        if (profile?.sub) {
          token.worldcoinId = profile.sub
          token.verificationType = profile['https://id.worldcoin.org/v1']?.verification_level
        }
        return token
      },
      async session({ session, token }) {
        if (token?.worldcoinId) {
          session.user = session.user || {}
          session.user.worldcoinId = token.worldcoinId as string
          session.user.verificationType = token.verificationType as string
        }
        return session
      },
    },
    debug: process.env.NODE_ENV === 'development',
  })

  try {
    const response = await authHandler(event, context)
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': siteUrl,
        'Access-Control-Allow-Credentials': 'true',
        'Content-Type': 'application/json',
        ...response.headers,
      },
      body: JSON.stringify(response.body),
    }
  } catch (error) {
    console.error('Auth Error:', error)
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': siteUrl,
        'Access-Control-Allow-Credentials': 'true',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        error: 'Internal Server Error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    }
  }
}