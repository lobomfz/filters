import { Window } from "happy-dom";

const w = new Window();

// @ts-expect-error happy-dom Window type diverges from lib.dom
globalThis.window = w;
// @ts-expect-error happy-dom Document type diverges from lib.dom
globalThis.document = w.document;
// @ts-expect-error happy-dom Navigator type diverges from lib.dom
globalThis.navigator = w.navigator;
