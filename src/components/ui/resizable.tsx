"use client"

import * as React from "react"
import { GripVerticalIcon } from "lucide-react"
import * as ResizablePrimitive from "react-resizable-panels"

import { cn } from "@/lib/utils"

// Create a safe storage wrapper that works on both client and server
const createSafeStorage = (): ResizablePrimitive.PanelGroupStorage | undefined => {
  if (typeof window === 'undefined') {
    // Server-side: return undefined to disable storage
    return undefined;
  }
  // Client-side: use default localStorage with safety wrapper
  return {
    getItem: (name: string) => {
      try {
        return window.localStorage?.getItem(name) ?? null;
      } catch {
        return null;
      }
    },
    setItem: (name: string, value: string) => {
      try {
        window.localStorage?.setItem(name, value);
      } catch {
        // Silently fail if localStorage is not available
      }
    },
  };
};

function ResizablePanelGroup({
  className,
  storage,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelGroup>) {
  const [safeStorage, setSafeStorage] = React.useState<ResizablePrimitive.PanelGroupStorage | undefined>(storage);

  React.useEffect(() => {
    if (!storage) {
      setSafeStorage(createSafeStorage());
    }
  }, [storage]);

  return (
    <ResizablePrimitive.PanelGroup
      data-slot="resizable-panel-group"
      className={cn(
        "flex h-full w-full data-[panel-group-direction=vertical]:flex-col",
        className
      )}
      storage={safeStorage}
      {...props}
    />
  )
}

function ResizablePanel({
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.Panel>) {
  return <ResizablePrimitive.Panel data-slot="resizable-panel" {...props} />
}

function ResizableHandle({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelResizeHandle> & {
  withHandle?: boolean
}) {
  return (
    <ResizablePrimitive.PanelResizeHandle
      data-slot="resizable-handle"
      className={cn(
        "bg-border focus-visible:ring-ring relative flex w-px items-center justify-center after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:ring-1 focus-visible:ring-offset-1 focus-visible:outline-hidden data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-1 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:translate-x-0 data-[panel-group-direction=vertical]:after:-translate-y-1/2 [&[data-panel-group-direction=vertical]>div]:rotate-90",
        className
      )}
      {...props}
    >
      {withHandle && (
        <div className="bg-border z-10 flex h-4 w-3 items-center justify-center rounded-xs border">
          <GripVerticalIcon className="size-2.5" />
        </div>
      )}
    </ResizablePrimitive.PanelResizeHandle>
  )
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
