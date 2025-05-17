import { StackHandler } from "@stackframe/stack"
import { stackServerApp } from "@/stack"

export default function StackHandlerPage(props: any) {
  return <StackHandler fullPage app={stackServerApp} routeProps={props} />
}
