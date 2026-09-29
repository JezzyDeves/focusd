/** Class lists shared by the side panels. */

export const panel = "rounded-xs border border-line bg-panel/90 backdrop-blur-[2px]";

export const panelHead =
  "flex w-full items-center justify-between gap-3 border-b bg-panel-2 px-3 py-2.5 text-left text-xs leading-tight font-medium tracking-[0.04em] text-dim";

export const fileName = "text-ink before:text-accent before:content-['■_']";

/** A one-line terminal prompt input: 16px on phones so iOS doesn't zoom in on focus. */
export const promptInput =
  "focus-ring min-h-10 min-w-0 flex-1 basis-48 rounded-xs bg-transparent px-1 text-base text-bright placeholder:text-dim desk:text-[13px]";
