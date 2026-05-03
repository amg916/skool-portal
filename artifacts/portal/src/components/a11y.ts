export const srOnly =
  "absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0 clip-[rect(0,0,0,0)]";

export function ariaLabel(label: string): { "aria-label": string } {
  return { "aria-label": label };
}
