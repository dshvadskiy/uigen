import { test, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MessageInput } from "../MessageInput";

afterEach(() => {
  cleanup();
});

test("renders with placeholder text", () => {
  const mockProps = {
    sendMessage: vi.fn(),
    isLoading: false,
  };

  render(<MessageInput {...mockProps} />);

  const textarea = screen.getByPlaceholderText("Describe the React component you want to create...");
  expect(textarea).toBeDefined();
});

test("allows typing in the input", async () => {
  const mockProps = {
    sendMessage: vi.fn(),
    isLoading: false,
  };

  render(<MessageInput {...mockProps} />);

  const textarea = screen.getByPlaceholderText("Describe the React component you want to create...") as HTMLTextAreaElement;
  await userEvent.type(textarea, "Hello");

  expect(textarea.value).toBe("Hello");
});

test("calls sendMessage when form is submitted", async () => {
  const sendMessage = vi.fn();
  const mockProps = {
    sendMessage,
    isLoading: false,
  };

  render(<MessageInput {...mockProps} />);

  const textarea = screen.getByPlaceholderText("Describe the React component you want to create...");
  await userEvent.type(textarea, "Test message");

  const form = textarea.closest("form")!;
  fireEvent.submit(form);

  expect(sendMessage).toHaveBeenCalledWith({ text: "Test message" });
});

test("clears input after submission", async () => {
  const sendMessage = vi.fn();
  const mockProps = {
    sendMessage,
    isLoading: false,
  };

  render(<MessageInput {...mockProps} />);

  const textarea = screen.getByPlaceholderText("Describe the React component you want to create...") as HTMLTextAreaElement;
  await userEvent.type(textarea, "Test message");

  const form = textarea.closest("form")!;
  fireEvent.submit(form);

  expect(textarea.value).toBe("");
});

test("submits form when Enter is pressed without shift", async () => {
  const sendMessage = vi.fn();
  const mockProps = {
    sendMessage,
    isLoading: false,
  };

  render(<MessageInput {...mockProps} />);
  
  const textarea = screen.getByRole("textbox");
  await userEvent.type(textarea, "Test");
  fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

  // Form submission is triggered, but we need to wait for it
  expect(sendMessage).toHaveBeenCalled();
});

test("does not submit form when Enter is pressed with shift", async () => {
  const sendMessage = vi.fn();
  const mockProps = {
    sendMessage,
    isLoading: false,
  };

  render(<MessageInput {...mockProps} />);

  const textarea = screen.getByRole("textbox");
  await userEvent.type(textarea, "Test");
  fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });

  expect(sendMessage).not.toHaveBeenCalled();
});

test("disables textarea when isLoading is true", () => {
  const mockProps = {
    sendMessage: vi.fn(),
    isLoading: true,
  };

  render(<MessageInput {...mockProps} />);

  const textarea = screen.getByRole("textbox");
  expect(textarea).toHaveProperty("disabled", true);
});

test("disables submit button when isLoading is true", async () => {
  const mockProps = {
    sendMessage: vi.fn(),
    isLoading: true,
  };

  render(<MessageInput {...mockProps} />);

  const submitButton = screen.getByRole("button");
  expect(submitButton).toHaveProperty("disabled", true);
});

test("disables submit button when input is empty", () => {
  const mockProps = {
    sendMessage: vi.fn(),
    isLoading: false,
  };

  render(<MessageInput {...mockProps} />);

  const submitButton = screen.getByRole("button");
  expect(submitButton).toHaveProperty("disabled", true);
});

test("disables submit button when input contains only whitespace", async () => {
  const mockProps = {
    sendMessage: vi.fn(),
    isLoading: false,
  };

  render(<MessageInput {...mockProps} />);

  const textarea = screen.getByRole("textbox");
  await userEvent.type(textarea, "   ");

  const submitButton = screen.getByRole("button");
  expect(submitButton).toHaveProperty("disabled", true);
});

test("enables submit button when input has content and not loading", async () => {
  const mockProps = {
    sendMessage: vi.fn(),
    isLoading: false,
  };

  render(<MessageInput {...mockProps} />);

  const textarea = screen.getByRole("textbox");
  await userEvent.type(textarea, "Valid content");

  const submitButton = screen.getByRole("button");
  expect(submitButton).toHaveProperty("disabled", false);
});

test("applies correct CSS classes based on loading state", () => {
  const { rerender } = render(
    <MessageInput
      sendMessage={vi.fn()}
      isLoading={false}
    />
  );

  let submitButton = screen.getByRole("button");
  expect(submitButton.className).toContain("disabled:opacity-40");
  expect(submitButton.className).toContain("hover:bg-blue-50");

  rerender(
    <MessageInput
      sendMessage={vi.fn()}
      isLoading={true}
    />
  );

  submitButton = screen.getByRole("button");
  expect(submitButton.className).toContain("disabled:cursor-not-allowed");
  expect(submitButton.className).toContain("disabled:opacity-40");
});

test("applies correct icon styling when loading", async () => {
  const { rerender } = render(
    <MessageInput
      sendMessage={vi.fn()}
      isLoading={false}
    />
  );

  // Type some text to enable the button and get blue icon
  const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
  await userEvent.type(textarea, "Hello");

  let sendIcon = screen.getByRole("button").querySelector("svg");
  expect(sendIcon?.getAttribute("class")).toContain("text-blue-600");

  rerender(
    <MessageInput
      sendMessage={vi.fn()}
      isLoading={true}
    />
  );

  sendIcon = screen.getByRole("button").querySelector("svg");
  expect(sendIcon?.getAttribute("class")).toContain("text-neutral-300");
});

test("textarea has correct styling classes", () => {
  const mockProps = {
    sendMessage: vi.fn(),
    isLoading: false,
  };

  render(<MessageInput {...mockProps} />);

  const textarea = screen.getByRole("textbox");
  expect(textarea.className).toContain("min-h-[80px]");
  expect(textarea.className).toContain("max-h-[200px]");
  expect(textarea.className).toContain("resize-none");
  expect(textarea.className).toContain("focus:ring-2");
  expect(textarea.className).toContain("focus:ring-blue-500/10");
});

test("submit button click triggers sendMessage", async () => {
  const sendMessage = vi.fn();
  const mockProps = {
    sendMessage,
    isLoading: false,
  };

  render(<MessageInput {...mockProps} />);

  const textarea = screen.getByRole("textbox");
  await userEvent.type(textarea, "Test input");

  const submitButton = screen.getByRole("button");
  await userEvent.click(submitButton);

  expect(sendMessage).toHaveBeenCalledWith({ text: "Test input" });
});