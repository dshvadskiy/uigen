"use client";

import {
  FilePlus,
  FileEdit,
  FileSymlink,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  type LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ToolInvocationDisplayProps {
  toolName: string;
  args: Record<string, unknown>;
  state: "partial-call" | "call" | "result";
  result?: string | { success: boolean; message?: string; error?: string };
}

interface OperationConfig {
  label: string;
  icon: LucideIcon;
  bgClass: string;
  iconClass: string;
  borderClass: string;
}

interface OperationInfo {
  command: string;
  path: string;
  newPath?: string;
  isError: boolean;
  errorMessage?: string;
  additionalInfo?: string;
}

const OPERATION_CONFIG: Record<string, OperationConfig> = {
  create: {
    label: "Created",
    icon: FilePlus,
    bgClass: "bg-emerald-50",
    iconClass: "text-emerald-600",
    borderClass: "border-emerald-200",
  },
  str_replace: {
    label: "Updated",
    icon: FileEdit,
    bgClass: "bg-blue-50",
    iconClass: "text-blue-600",
    borderClass: "border-blue-200",
  },
  insert: {
    label: "Inserted into",
    icon: FileEdit,
    bgClass: "bg-blue-50",
    iconClass: "text-blue-600",
    borderClass: "border-blue-200",
  },
  view: {
    label: "Viewed",
    icon: FileEdit,
    bgClass: "bg-neutral-50",
    iconClass: "text-neutral-600",
    borderClass: "border-neutral-200",
  },
  rename: {
    label: "Renamed",
    icon: FileSymlink,
    bgClass: "bg-amber-50",
    iconClass: "text-amber-600",
    borderClass: "border-amber-200",
  },
  delete: {
    label: "Deleted",
    icon: Trash2,
    bgClass: "bg-red-50",
    iconClass: "text-red-600",
    borderClass: "border-red-200",
  },
  error: {
    label: "Failed",
    icon: AlertCircle,
    bgClass: "bg-red-50",
    iconClass: "text-red-600",
    borderClass: "border-red-200",
  },
};

function parseToolOperation(
  toolName: string,
  args: Record<string, unknown>,
  result?: string | { success: boolean; message?: string; error?: string }
): OperationInfo {
  const command = (args.command as string) || "";
  const path = (args.path as string) || "";
  const newPath = args.new_path as string | undefined;

  let isError = false;
  let errorMessage: string | undefined;
  let additionalInfo: string | undefined;

  if (result) {
    if (typeof result === "string") {
      isError = result.startsWith("Error:");
      if (isError) {
        errorMessage = result.substring(6).trim();
      } else {
        additionalInfo = extractAdditionalInfo(command, args, result);
      }
    } else if (typeof result === "object") {
      isError = !result.success;
      errorMessage = result.error;
      if (!isError) {
        additionalInfo = extractAdditionalInfo(command, args, result.message);
      }
    }
  }

  return {
    command,
    path,
    newPath,
    isError,
    errorMessage,
    additionalInfo,
  };
}

function extractAdditionalInfo(
  command: string,
  args: Record<string, unknown>,
  result?: string
): string | undefined {
  switch (command) {
    case "str_replace": {
      if (result) {
        const match = result.match(/Replaced (\d+) occurrence/);
        if (match) {
          return `${match[1]} replacement(s)`;
        }
      }
      return undefined;
    }
    case "insert": {
      const insertLine = args.insert_line;
      return insertLine ? `at line ${insertLine}` : undefined;
    }
    case "rename": {
      const newPath = args.new_path as string | undefined;
      if (newPath) {
        const newFilename = newPath.split("/").pop();
        return newFilename ? `to ${newFilename}` : undefined;
      }
      return undefined;
    }
    default:
      return undefined;
  }
}

function getActionLabel(command: string, isPending: boolean): string {
  const labels: Record<string, { pending: string; completed: string }> = {
    create: { pending: "Creating", completed: "Created" },
    str_replace: { pending: "Updating", completed: "Updated" },
    insert: { pending: "Inserting into", completed: "Inserted into" },
    view: { pending: "Viewing", completed: "Viewed" },
    rename: { pending: "Renaming", completed: "Renamed" },
    delete: { pending: "Deleting", completed: "Deleted" },
    undo_edit: { pending: "Undoing", completed: "Undid" },
  };

  const label = labels[command];
  if (!label) return command;
  return isPending ? label.pending : label.completed;
}

function formatPath(path: string): string {
  return path.split("/").pop() || path;
}

export function ToolInvocationDisplay({
  toolName,
  args,
  state,
  result,
}: ToolInvocationDisplayProps) {
  const operationInfo = parseToolOperation(toolName, args, result);
  const { command, path, newPath, isError, errorMessage, additionalInfo } = operationInfo;

  const isPending = state !== "result";

  if (isPending) {
    const label = getActionLabel(command, true);
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-neutral-50 rounded-lg border border-neutral-200 mt-2">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600 flex-shrink-0" />
        <span className="text-sm text-neutral-700">{label}...</span>
      </div>
    );
  }

  if (isError) {
    const failedLabel = getActionLabel(command, false).toLowerCase();
    return (
      <div className="flex items-start gap-2 px-3 py-2 bg-red-50 rounded-lg border border-red-200 mt-2">
        <AlertCircle className="w-3.5 h-3.5 mt-0.5 text-red-600 flex-shrink-0" />
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <span className="text-sm font-medium text-red-900">
            Failed to {failedLabel}
          </span>
          <span className="text-sm text-red-700 font-mono break-all">
            {path}
          </span>
          {errorMessage && (
            <span className="text-xs text-red-600">{errorMessage}</span>
          )}
        </div>
      </div>
    );
  }

  const config = OPERATION_CONFIG[command] || OPERATION_CONFIG.error;
  const Icon = config.icon;
  const filename = formatPath(path);

  return (
    <div
      className={cn(
        "flex items-start gap-2 px-3 py-2 rounded-lg border mt-2",
        config.bgClass,
        config.borderClass
      )}
    >
      <Icon className={cn("w-3.5 h-3.5 mt-0.5 flex-shrink-0", config.iconClass)} />
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <span className="text-sm font-medium text-neutral-900">
          {config.label} {filename}
        </span>
        <span className="text-xs text-neutral-600 font-mono break-all">
          {path}
        </span>
        {additionalInfo && (
          <span className="text-xs text-neutral-600">{additionalInfo}</span>
        )}
      </div>
      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
    </div>
  );
}
