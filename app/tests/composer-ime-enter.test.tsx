import { afterAll, afterEach, beforeAll, expect, test } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { Composer } from "@/components/channels/composer/composer";
import { settleReactWork } from "./settle-react-work";

/**
 * AN ENTER THAT CONFIRMS A CHARACTER MUST NOT SEND THE MESSAGE.
 *
 * Japanese, Chinese and Korean are typed through an input method, and Enter is how the character
 * being built is confirmed. That press still arrives as a keydown with `key === "Enter"`, and the
 * chat composer hands Enter to `prompt-area`, whose 0.6.x guard only checks
 * `event.nativeEvent.isComposing`. Chromium marks the confirming press that way, but WebKit sends
 * it after `compositionend`, where `isComposing` is already false and only `keyCode === 229`
 * identifies it — so the guard misses it and the draft goes out mid-word.
 *
 * The app already knows both shapes: `app/src/lib/composing.ts` checks `isComposing` or
 * `keyCode === 229`, and the New Bot sheet, the Bot name field and the boundary rule form all use
 * it. The composer did not. These tests pin the composer to the same rule, on both of its
 * PromptArea instances: the compact branch and the full-size branch.
 *
 * THE HARNESS IS THIS REPOSITORY'S. `GlobalRegistrator` in `beforeAll`/`afterAll` and `cleanup` in
 * `afterEach`, matching `composer-paste.test.tsx` for the reason recorded there: bun walks every
 * file into one process, and a document another file tore down mid-run fails invisibly.
 */

beforeAll(() => GlobalRegistrator.register({ url: "http://localhost/" }));
afterEach(cleanup);
afterAll(async () => {
  await settleReactWork();
  GlobalRegistrator.unregister();
});

/** The editor inside the composer: the element the words actually live in. */
function editorOf(container: HTMLElement): HTMLElement {
  return container.querySelector("[contenteditable]") as HTMLElement;
}

/**
 * Press Enter on the editor the way WebKit sends the press that confirms a composed character:
 * after `compositionend`, so `isComposing` is already false and only `keyCode === 229` says what
 * the press is. A Chromium press still composing carries `isComposing: true` instead.
 */
async function pressEnter(
  editor: HTMLElement,
  init: { keyCode?: number; isComposing?: boolean } = {},
) {
  await act(async () => {
    fireEvent.keyDown(editor, {
      key: "Enter",
      keyCode: init.keyCode ?? 13,
      isComposing: init.isComposing ?? false,
    });
  });
}

test("a WebKit IME-confirming Enter does not send from the compact composer", async () => {
  let sends = 0;
  const { container } = render(
    <Composer compact initialValue="nihao" onSubmit={() => { sends += 1; }} />,
  );

  await pressEnter(editorOf(container), { keyCode: 229 });

  expect(sends).toBe(0);
});

test("a WebKit IME-confirming Enter does not send from the full-size composer", async () => {
  let sends = 0;
  const { container } = render(
    <Composer initialValue="nihao" onSubmit={() => { sends += 1; }} />,
  );

  await pressEnter(editorOf(container), { keyCode: 229 });

  expect(sends).toBe(0);
});

test("an Enter still composing does not send either", async () => {
  let sends = 0;
  const { container } = render(
    <Composer compact initialValue="nihao" onSubmit={() => { sends += 1; }} />,
  );

  await pressEnter(editorOf(container), { isComposing: true });

  expect(sends).toBe(0);
});

test("an ordinary Enter still sends", async () => {
  let sends = 0;
  const { container } = render(
    <Composer compact initialValue="nihao" onSubmit={() => { sends += 1; }} />,
  );

  await pressEnter(editorOf(container));

  expect(sends).toBe(1);
});
