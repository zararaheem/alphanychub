import { cookies } from "next/headers";

export type Theme = "dark" | "light";
export const THEME_COOKIE = "hub_theme";

// Light is the default; dark is the option for people who prefer it.
export async function currentTheme(): Promise<Theme> {
  return (await cookies()).get(THEME_COOKIE)?.value === "dark" ? "dark" : "light";
}
