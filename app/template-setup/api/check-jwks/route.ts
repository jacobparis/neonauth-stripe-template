import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

async function getNeonProjectId() {
  try {
    if (!process.env.DATABASE_URL) {
      return { success: false, error: 'Database URL not configured' }
    }

    const result = await db.execute(sql`SHOW neon.project_id`)

    if (result.rows.length > 0 && result.rows[0]['neon.project_id']) {
      return {
        success: true,
        projectId: result.rows[0]['neon.project_id'],
      }
    } else {
      return { success: false, error: 'Could not retrieve Neon project ID' }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check required environment variables
    if (!process.env.NEON_API_KEY) {
      return NextResponse.json(
        { error: 'NEON_API_KEY not configured' },
        { status: 400 }
      )
    }

    // Get project ID
    const projectIdResult = await getNeonProjectId()
    if (!projectIdResult.success) {
      return NextResponse.json(
        { error: `Failed to get Neon project ID: ${projectIdResult.error}` },
        { status: 500 }
      )
    }

    const projectId = projectIdResult.projectId

    // Make the API call to Neon
    const response = await fetch(
      `https://console.neon.tech/api/v2/projects/${projectId}/jwks`,
      {
        headers: {
          Authorization: `Bearer ${process.env.NEON_API_KEY}`,
        },
      },
    )

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        { error: `Neon API error: ${response.status} ${errorText}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    
    // Deduplicate JWKS entries based on jwks_url
    const uniqueJwks = data.jwks ? 
      data.jwks.filter((jwks: any, index: number, self: any[]) => 
        self.findIndex((j: any) => j.jwks_url === jwks.jwks_url) === index
      ) : []
    
    return NextResponse.json({
      jwks: uniqueJwks.length > 0,
      jwksList: uniqueJwks,
      projectId,
    })
  } catch (error) {
    console.error('Error checking JWKS:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 
