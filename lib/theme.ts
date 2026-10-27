import { cookies } from "next/headers";

export type Theme = "dark" | "light";
export const THEME_COOKIE = "hub_theme";

// Dark is the default Alpha look; light is the high-contrast option.
export async function currentTheme(): Promise<Theme> {
  return (await cookies()).get(THEME_COOKIE)?.value === "light" ? "light" : "dark";
}
