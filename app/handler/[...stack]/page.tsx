import { StackHandler } from '@stackframe/stack'
import { StackProvider, StackTheme } from '@stackframe/stack'
import { stackServerApp } from '@/stack'

export default function StackHandlerPage(props: any) {
  return (
    <StackProvider app={stackServerApp}>
      <StackTheme>
        <StackHandler fullPage app={stackServerApp} routeProps={props} />
      </StackTheme>
    </StackProvider>
  )
}
