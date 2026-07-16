import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * The one utility every shadcn/ui component depends on. Added now because
 * it's infrastructure, not a component — actual components (Button, Input,
 * Table...) are added when a real screen needs them, not during Bootstrap.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
