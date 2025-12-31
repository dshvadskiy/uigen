"use client";

import {
  createContext,
  useContext,
  ReactNode,
  useEffect,
  useState,
  useCallback,
} from "react";
import { UIMessage as Message } from "ai";
import { useFileSystem } from "./file-system-context";
import { setHasAnonWork } from "@/lib/anon-work-tracker";

interface ChatContextProps {
  projectId?: string;
  initialMessages?: Message[];
}

interface ChatContextType {
  messages: Message[];
  sendMessage: (message: { text: string }) => void;
  status: string;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({
  children,
  projectId,
  initialMessages = [],
}: ChatContextProps & { children: ReactNode }) {
  const { fileSystem, handleToolCall } = useFileSystem();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [status, setStatus] = useState<string>("idle");

  const sendMessage = useCallback(
    async (message: { text: string }) => {
      const userMessage: Message = {
        id: Math.random().toString(36).substring(7),
        role: "user",
        parts: [{ type: "text", text: message.text }],
      };

      setMessages((prev) => [...prev, userMessage]);
      setStatus("streaming");

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...messages, userMessage],
            files: fileSystem.serialize(),
            projectId,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No reader available");

        const decoder = new TextDecoder();
        let buffer = "";
        const assistantMessage: Message = {
          id: Math.random().toString(36).substring(7),
          role: "assistant",
          parts: [],
        };
        const toolCalls = new Map<string, any>();
        let currentTextPart: { type: "text"; text: string } | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim() || !line.startsWith("data: ")) continue;

            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);

              if (parsed.type === "text-delta") {
                if (!currentTextPart) {
                  currentTextPart = { type: "text", text: "" };
                  assistantMessage.parts.push(currentTextPart);
                }
                currentTextPart.text += parsed.delta;  // Fixed: use delta, not textDelta
                setMessages((prev) => {
                  const without = prev.filter((m) => m.id !== assistantMessage.id);
                  return [...without, { ...assistantMessage }];
                });
              } else if (parsed.type === "tool-input-start") {
                toolCalls.set(parsed.toolCallId, {
                  type: "tool-invocation",
                  toolCallId: parsed.toolCallId,
                  toolName: parsed.toolName,
                  input: {},
                  state: "pending",
                  inputBuffer: "",
                });
              } else if (parsed.type === "tool-input-delta") {
                const toolCall = toolCalls.get(parsed.toolCallId);
                if (toolCall) {
                  toolCall.inputBuffer += parsed.inputTextDelta;
                }
              } else if (parsed.type === "tool-input-available") {
                const toolCall = toolCalls.get(parsed.toolCallId);
                if (toolCall) {
                  toolCall.input = parsed.input;
                  delete toolCall.inputBuffer;
                  assistantMessage.parts.push(toolCall);
                  setMessages((prev) => {
                    const without = prev.filter((m) => m.id !== assistantMessage.id);
                    return [...without, { ...assistantMessage }];
                  });
                }
              } else if (parsed.type === "tool-output-available") {
                const toolCall = toolCalls.get(parsed.toolCallId);
                if (toolCall) {
                  toolCall.output = parsed.output;  // Changed from result to output
                  toolCall.state = "result";
                  setMessages((prev) => {
                    const without = prev.filter((m) => m.id !== assistantMessage.id);
                    return [...without, { ...assistantMessage }];
                  });
                }
              }
            } catch (e) {
              console.error("Failed to parse stream data:", e);
            }
          }
        }

        // Final update to ensure all messages are set
        setMessages((prev) => {
          const without = prev.filter((m) => m.id !== assistantMessage.id);
          return [...without, assistantMessage];
        });

        setStatus("idle");
      } catch (error) {
        console.error("Failed to send message:", error);
        setStatus("error");
      }
    },
    [messages, fileSystem, projectId]
  );

  // Handle tool calls from assistant messages
  useEffect(() => {
    messages.forEach((message) => {
      if (message.role === "assistant" && message.parts) {
        message.parts.forEach((part) => {
          if (part.type === "tool-invocation" && (part as any).state === "result") {
            handleToolCall({
              toolName: (part as any).toolName,
              args: (part as any).input,
            });
          }
        });
      }
    });
  }, [messages, handleToolCall]);

  // Track anonymous work
  useEffect(() => {
    if (!projectId && messages.length > 0) {
      setHasAnonWork(messages, fileSystem.serialize());
    }
  }, [messages, fileSystem, projectId]);

  return (
    <ChatContext.Provider
      value={{
        messages,
        sendMessage,
        status,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}