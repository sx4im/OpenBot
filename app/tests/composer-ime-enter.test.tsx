import { afterAll, afterEach, beforeAll, expect, test } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { cleanup, render } from "@testing-library/react";
import { useState } from "react";
import { PromptArea, type Segment } from "prompt-area";
import { preventSubmitWhileComposing } from "@/lib/composing";

beforeAll(() => GlobalRegistrator.register());
afterEach(cleanup);
afterAll(() => GlobalRegistrator.unregister());

/**
 * The composer's guard, exercised against the real `PromptArea`: the composer passes
 * `preventSubmitWhileComposing` as `onKeyDown` on both of its PromptAreas, and
 * prompt-area runs the caller's `onKeyDown` first, skipping its own submit when the
 * event was already default-prevented.
 */
function Harness({ onSubmit }: { onSubmit: (segments: Segment[]) => void }) {
  const [value, setValue] = useState<Segment[]>([]);
  return (
    <PromptArea
      aria-label="Message"
      onChange={setValue}
      onKeyDown={preventSubmitWhileComposing}
      onSubmit={onSubmit}
      value={value}
    />
  );
}

function keydown(
  editor: Element,
  init: { key: string; keyCode: number; isComposing: boolean },
) {
  const event = new window.KeyboardEvent("keydown", {
    key: init.key,
    bubbles: true,
    cancelable: true,
  });
  Object.defineProperty(event, "keyCode", { value: init.keyCode });
  Object.defineProperty(event, "isComposing", { value: init.isComposing });
  editor.dispatchEvent(event);
}

test("WebKit IME-confirm Enter does not submit", () => {
  let submitted = 0;
  const view = render(<Harness onSubmit={() => (submitted += 1)} />);
  const editor = view.getByRole("textbox", { name: "Message" });
  // WebKit sends the confirming keydown after compositionend: isComposing is
  // already false, only keyCode 229 identifies it.
  keydown(editor, { key: "Enter", keyCode: 229, isComposing: false });
  expect(submitted).toBe(0);
});

test("Chromium composing Enter does not submit", () => {
  let submitted = 0;
  const view = render(<Harness onSubmit={() => (submitted += 1)} />);
  const editor = view.getByRole("textbox", { name: "Message" });
  keydown(editor, { key: "Enter", keyCode: 13, isComposing: true });
  expect(submitted).toBe(0);
});

test("plain Enter still submits", () => {
  let submitted = 0;
  const view = render(<Harness onSubmit={() => (submitted += 1)} />);
  const editor = view.getByRole("textbox", { name: "Message" });
  keydown(editor, { key: "Enter", keyCode: 13, isComposing: false });
  expect(submitted).toBe(1);
});
