import { test, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MessageList } from "../MessageList";
import type { UIMessage as Message } from "ai";

// Mock the MarkdownRenderer component
vi.mock("../MarkdownRenderer", () => ({
  MarkdownRenderer: ({ content }: { content: string }) => <div>{content}</div>,
}));

afterEach(() => {
  cleanup();
});

test("MessageList shows empty state when no messages", () => {
  render(<MessageList messages={[]} />);

  expect(
    screen.getByText("Start a conversation to generate React components")
  ).toBeDefined();
  expect(
    screen.getByText("I can help you create buttons, forms, cards, and more")
  ).toBeDefined();
});

test("MessageList renders user messages", () => {
  const messages: Message[] = [
    {
      id: "1",
      role: "user",
      parts: [{ type: "text", text: "Create a button component" }],
    } as any,
  ];

  render(<MessageList messages={messages} />);

  expect(screen.getByText("Create a button component")).toBeDefined();
});

test("MessageList renders assistant messages", () => {
  const messages: Message[] = [
    {
      id: "1",
      role: "assistant",
      parts: [{ type: "text", text: "I'll help you create a button component." }],
    } as any,
  ];

  render(<MessageList messages={messages} />);

  expect(
    screen.getByText("I'll help you create a button component.")
  ).toBeDefined();
});

test("MessageList renders messages with parts", () => {
  const messages: Message[] = [
    {
      id: "1",
      role: "assistant",
      parts: [
        { type: "text", text: "Creating your component..." },
        {
          type: "tool-invocation",
          toolCallId: "asdf",
          input: { command: "create", path: "/App.jsx" },
          toolName: "str_replace_editor",
          state: "result",
          output: "File created: /App.jsx",
        } as any,
      ],
    } as any,
  ];

  render(<MessageList messages={messages} />);

  expect(screen.getByText("Creating your component...")).toBeDefined();
  // New display shows "Created App.jsx" instead of "str_replace_editor"
  expect(screen.getByText(/Created App\.jsx/)).toBeDefined();
  expect(screen.getByText("/App.jsx")).toBeDefined();
});

test("MessageList shows content for assistant message with content", () => {
  const messages: Message[] = [
    {
      id: "1",
      role: "assistant",
      parts: [{ type: "text", text: "Generating your component..." }],
    } as any,
  ];

  render(<MessageList messages={messages} isLoading={true} />);

  // The component shows the content but not a loading indicator when content is present
  expect(screen.getByText("Generating your component...")).toBeDefined();
  expect(screen.queryByText("Generating...")).toBeNull();
});

test("MessageList shows loading state for last assistant message without content", () => {
  const messages: Message[] = [
    {
      id: "1",
      role: "assistant",
      parts: [],
    } as any,
  ];

  render(<MessageList messages={messages} isLoading={true} />);

  expect(screen.getByText("Generating...")).toBeDefined();
});

test("MessageList doesn't show loading state for non-last messages", () => {
  const messages: Message[] = [
    {
      id: "1",
      role: "assistant",
      parts: [{ type: "text", text: "First response" }],
    } as any,
    {
      id: "2",
      role: "user",
      parts: [{ type: "text", text: "Another request" }],
    } as any,
  ];

  render(<MessageList messages={messages} isLoading={true} />);

  // Loading state should not appear because the last message is from user, not assistant
  expect(screen.queryByText("Generating...")).toBeNull();
});

test("MessageList renders reasoning parts", () => {
  const messages: Message[] = [
    {
      id: "1",
      role: "assistant",
      parts: [
        { type: "text", text: "Let me analyze this." },
        {
          type: "reasoning",
          text: "The user wants a button component with specific styling.",
          details: [],
        } as any,
      ],
    } as any,
  ];

  render(<MessageList messages={messages} />);

  expect(screen.getByText("Reasoning")).toBeDefined();
  expect(
    screen.getByText("The user wants a button component with specific styling.")
  ).toBeDefined();
});

test("MessageList renders multiple messages in correct order", () => {
  const messages: Message[] = [
    {
      id: "1",
      role: "user",
      parts: [{ type: "text", text: "First user message" }],
    } as any,
    {
      id: "2",
      role: "assistant",
      parts: [{ type: "text", text: "First assistant response" }],
    } as any,
    {
      id: "3",
      role: "user",
      parts: [{ type: "text", text: "Second user message" }],
    } as any,
    {
      id: "4",
      role: "assistant",
      parts: [{ type: "text", text: "Second assistant response" }],
    } as any,
  ];

  const { container } = render(<MessageList messages={messages} />);

  // Get all message containers in order
  const messageContainers = container.querySelectorAll(".rounded-xl");

  // Verify we have 4 messages
  expect(messageContainers).toHaveLength(4);

  // Check the content of each message in order
  expect(messageContainers[0].textContent).toContain("First user message");
  expect(messageContainers[1].textContent).toContain(
    "First assistant response"
  );
  expect(messageContainers[2].textContent).toContain("Second user message");
  expect(messageContainers[3].textContent).toContain(
    "Second assistant response"
  );
});

test("MessageList handles step-start parts", () => {
  const messages: Message[] = [
    {
      id: "1",
      role: "assistant",
      parts: [
        { type: "text", text: "Step 1 content" },
        { type: "step-start" } as any,
        { type: "text", text: "Step 2 content" },
      ],
    } as any,
  ];

  render(<MessageList messages={messages} />);

  expect(screen.getByText("Step 1 content")).toBeDefined();
  expect(screen.getByText("Step 2 content")).toBeDefined();
  // Check that a separator exists (hr element)
  const container = screen.getByText("Step 1 content").closest(".rounded-xl");
  expect(container?.querySelector("hr")).toBeDefined();
});

test("MessageList applies correct styling for user vs assistant messages", () => {
  const messages: Message[] = [
    {
      id: "1",
      role: "user",
      parts: [{ type: "text", text: "User message" }],
    } as any,
    {
      id: "2",
      role: "assistant",
      parts: [{ type: "text", text: "Assistant message" }],
    } as any,
  ];

  render(<MessageList messages={messages} />);

  const userMessage = screen.getByText("User message").closest(".rounded-xl");
  const assistantMessage = screen
    .getByText("Assistant message")
    .closest(".rounded-xl");

  // User messages should have blue background
  expect(userMessage?.className).toContain("bg-blue-600");
  expect(userMessage?.className).toContain("text-white");

  // Assistant messages should have white background
  expect(assistantMessage?.className).toContain("bg-white");
  expect(assistantMessage?.className).toContain("text-neutral-900");
});

test("MessageList handles empty content with parts", () => {
  const messages: Message[] = [
    {
      id: "1",
      role: "assistant",
      parts: [{ type: "text", text: "This is from parts" }],
    } as any,
  ];

  render(<MessageList messages={messages} />);

  expect(screen.getByText("This is from parts")).toBeDefined();
});

test("MessageList shows loading for assistant message with empty parts", () => {
  const messages: Message[] = [
    {
      id: "1",
      role: "assistant",
      parts: [],
    } as any,
  ];

  const { container } = render(
    <MessageList messages={messages} isLoading={true} />
  );

  // Check that exactly one "Generating..." text appears
  const loadingText = container.querySelectorAll(".text-neutral-500");
  const generatingElements = Array.from(loadingText).filter(
    (el) => el.textContent === "Generating..."
  );
  expect(generatingElements).toHaveLength(1);
});

test("ToolInvocationDisplay shows update operation", () => {
  const messages: Message[] = [
    {
      id: "1",
      role: "assistant",
      parts: [
        {
          type: "tool-invocation",
          toolCallId: "update1",
          input: { command: "str_replace", path: "/components/Button.tsx" },
          toolName: "str_replace_editor",
          state: "result",
          output: "Replaced 2 occurrence(s) of the string in /components/Button.tsx",
        } as any,
      ],
    } as any,
  ];

  render(<MessageList messages={messages} />);

  expect(screen.getByText(/Updated Button\.tsx/)).toBeDefined();
  expect(screen.getByText("/components/Button.tsx")).toBeDefined();
  expect(screen.getByText(/2 replacement\(s\)/)).toBeDefined();
});

test("ToolInvocationDisplay shows error state", () => {
  const messages: Message[] = [
    {
      id: "1",
      role: "assistant",
      parts: [
        {
          type: "tool-invocation",
          toolCallId: "error1",
          input: { command: "create", path: "/App.jsx" },
          toolName: "str_replace_editor",
          state: "result",
          output: "Error: File already exists: /App.jsx",
        } as any,
      ],
    } as any,
  ];

  render(<MessageList messages={messages} />);

  expect(screen.getByText(/Failed to created/)).toBeDefined();
  expect(screen.getByText("/App.jsx")).toBeDefined();
  expect(screen.getByText(/File already exists/)).toBeDefined();
});

test("ToolInvocationDisplay shows pending state", () => {
  const messages: Message[] = [
    {
      id: "1",
      role: "assistant",
      parts: [
        {
          type: "tool-invocation",
          toolCallId: "pending1",
          input: { command: "create", path: "/NewFile.jsx" },
          toolName: "str_replace_editor",
          state: "call",
        } as any,
      ],
    } as any,
  ];

  render(<MessageList messages={messages} />);

  expect(screen.getByText(/Creating\.\.\./)).toBeDefined();
});

test("ToolInvocationDisplay shows rename operation", () => {
  const messages: Message[] = [
    {
      id: "1",
      role: "assistant",
      parts: [
        {
          type: "tool-invocation",
          toolCallId: "rename1",
          input: { command: "rename", path: "/old.jsx", new_path: "/new.jsx" },
          toolName: "file_manager",
          state: "result",
          output: { success: true, message: "Successfully renamed /old.jsx to /new.jsx" },
        } as any,
      ],
    } as any,
  ];

  render(<MessageList messages={messages} />);

  expect(screen.getByText(/Renamed old\.jsx/)).toBeDefined();
  expect(screen.getByText("/old.jsx")).toBeDefined();
  expect(screen.getByText(/to new\.jsx/)).toBeDefined();
});

test("ToolInvocationDisplay shows delete operation", () => {
  const messages: Message[] = [
    {
      id: "1",
      role: "assistant",
      parts: [
        {
          type: "tool-invocation",
          toolCallId: "delete1",
          input: { command: "delete", path: "/unused.jsx" },
          toolName: "file_manager",
          state: "result",
          output: { success: true, message: "Successfully deleted /unused.jsx" },
        } as any,
      ],
    } as any,
  ];

  render(<MessageList messages={messages} />);

  expect(screen.getByText(/Deleted unused\.jsx/)).toBeDefined();
  expect(screen.getByText("/unused.jsx")).toBeDefined();
});
