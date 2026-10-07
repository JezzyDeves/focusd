/** Class lists shared by the side panels. */

export const panel = "rounded-xs border border-line bg-panel/90 backdrop-blur-[2px]";

export const panelHead =
  "flex w-full items-center justify-between gap-3 border-b bg-panel-2 px-3 py-2.5 text-left text-xs leading-tight font-medium tracking-[0.04em] text-dim";

/** On desktop a panel fills its column's height; its body (`deskScroll`) takes the rest and scrolls. */
export const deskColumn = "desk:flex desk:min-h-0 desk:flex-col";
export const deskScroll = "desk:min-h-0 desk:flex-1 desk:overflow-y-auto";

export const thinScroll =
  "[scrollbar-color:var(--color-line-2)_transparent] [scrollbar-width:thin]";

/** A panel's file name, led by a Lucide icon in the accent color. */
export const fileName =
  "inline-flex min-w-0 items-center gap-1.5 text-ink [&>svg]:flex-none [&>svg]:text-accent";

/** A one-line terminal prompt input: 16px on phones so iOS doesn't zoom in on focus. */
export const promptInput =
  "focus-ring min-h-10 min-w-0 flex-1 basis-48 rounded-xs bg-transparent px-1 text-base text-bright placeholder:text-dim desk:text-[13px]";
