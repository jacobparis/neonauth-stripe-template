'use client'

import { useState, useEffect } from 'react'
import { getTableStatus, enableRLS } from './actions'
import { Check, X, AlertCircle, Loader2, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import Link from 'next/link'

export function DevChecklist() {
  const [tablesStatus, setTablesStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [enableRLSLoading, setEnableRLSLoading] = useState(false)

  const checkTables = async () => {
    try {
      const status = await getTableStatus()
      setTablesStatus(status)
    } catch (error) {
      console.error('Failed to check table status:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkTables()
  }, [])

  const allTablesExist =
    tablesStatus &&
    tablesStatus.tables.todos &&
    tablesStatus.tables.users_sync &&
    tablesStatus.tables.comments

  const needsRLS = ['todos', 'users_sync'].some(
    (table) =>
      tablesStatus?.rls?.tables?.[table] &&
      (!tablesStatus.rls.tables[table].rlsEnabled ||
        !tablesStatus.rls.tables[table].hasPolicy),
  )

  const handleEnableRLS = async () => {
    setEnableRLSLoading(true)
    try {
      await enableRLS()
      // Refresh status after enabling RLS
      await checkTables()
    } catch (error) {
      console.error('Failed to enable RLS:', error)
    } finally {
      setEnableRLSLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Checking development setup...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Development Checklist</h1>
        <p className="text-muted-foreground">
          Ensure your development environment is properly configured.
        </p>
      </div>

      {/* Database Setup */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center font-medium">
            1
          </div>
          Database Setup
        </h2>

        <div className="pl-8 space-y-3">
          <h3 className="font-medium text-lg">Required Tables</h3>
          <div className="grid gap-2">
            <div className="flex items-center gap-2">
              {tablesStatus?.tables.todos ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <X className="h-4 w-4 text-red-500" />
              )}
              <span
                className={!tablesStatus?.tables.todos ? 'text-gray-500' : ''}
              >
                todos
              </span>
            </div>

            <div className="flex items-center gap-2">
              {tablesStatus?.tables.users_sync ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <X className="h-4 w-4 text-red-500" />
              )}
              <span
                className={
                  !tablesStatus?.tables.users_sync ? 'text-gray-500' : ''
                }
              >
                users_sync
              </span>
            </div>

            <div className="flex items-center gap-2">
              {tablesStatus?.tables.comments ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <X className="h-4 w-4 text-red-500" />
              )}
              <span
                className={
                  !tablesStatus?.tables.comments ? 'text-gray-500' : ''
                }
              >
                comments
              </span>
            </div>
          </div>

          {!allTablesExist && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Some required tables are missing. Run the database migrations:
                <br />
                <code className="bg-muted px-1 py-0.5 rounded text-sm mt-1 inline-block">
                  npm run db:push
                </code>
              </AlertDescription>
            </Alert>
          )}
        </div>

        {allTablesExist && (
          <div className="pl-8 space-y-3">
            <h3 className="font-medium text-lg">Row Level Security (RLS)</h3>
            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                {tablesStatus?.rls?.tables?.todos?.rlsEnabled ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <X className="h-4 w-4 text-red-500" />
                )}
                <span
                  className={
                    !tablesStatus?.rls?.tables?.todos?.rlsEnabled
                      ? 'text-gray-500'
                      : ''
                  }
                >
                  todos - RLS enabled
                </span>
              </div>

              <div className="flex items-center gap-2">
                {tablesStatus?.rls?.tables?.todos?.hasPolicy ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <X className="h-4 w-4 text-red-500" />
                )}
                <span
                  className={
                    !tablesStatus?.rls?.tables?.todos?.hasPolicy
                      ? 'text-gray-500'
                      : ''
                  }
                >
                  todos - RLS policies configured
                </span>
              </div>

              <div className="flex items-center gap-2">
                {tablesStatus?.rls?.tables?.users_sync?.rlsEnabled ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <X className="h-4 w-4 text-red-500" />
                )}
                <span
                  className={
                    !tablesStatus?.rls?.tables?.users_sync?.rlsEnabled
                      ? 'text-gray-500'
                      : ''
                  }
                >
                  users_sync - RLS enabled
                </span>
              </div>

              <div className="flex items-center gap-2">
                {tablesStatus?.rls?.tables?.users_sync?.hasPolicy ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <X className="h-4 w-4 text-red-500" />
                )}
                <span
                  className={
                    !tablesStatus?.rls?.tables?.users_sync?.hasPolicy
                      ? 'text-gray-500'
                      : ''
                  }
                >
                  users_sync - RLS policies configured
                </span>
              </div>
            </div>

            {needsRLS && (
              <div className="space-y-2">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Row Level Security needs to be configured for secure
                    multi-tenant access.
                  </AlertDescription>
                </Alert>
                <Button
                  onClick={handleEnableRLS}
                  disabled={enableRLSLoading}
                  size="sm"
                >
                  {enableRLSLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enabling RLS...
                    </>
                  ) : (
                    'Enable Row Level Security'
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Development Tools */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center font-medium">
            2
          </div>
          Development Tools
        </h2>

        <div className="pl-8 space-y-3">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <h3 className="font-medium">Drizzle Studio</h3>
              <p className="text-sm text-muted-foreground">
                Visual database browser and editor
              </p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href="https://local.drizzle.studio" target="_blank">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Studio
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Status Summary */}
      <div className="border-t pt-6">
        <div className="flex items-center gap-4">
          {allTablesExist && !needsRLS ? (
            <>
              <div className="flex items-center gap-2 text-green-600">
                <Check className="h-5 w-5" />
                <span className="font-medium">Setup Complete</span>
              </div>
              <p className="text-muted-foreground">
                Your development environment is ready!
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-amber-600">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">Setup Required</span>
              </div>
              <p className="text-muted-foreground">
                Complete the steps above to finish setup.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
