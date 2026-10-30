import { PARENT_CONTENT, type ParentContent } from "@/lib/parent-content";

// The staff-side click-through preview shows the same content as the Parent Hub.
export type ParentDemoData = ParentContent & { live: boolean };

export async function getParentDemo(): Promise<ParentDemoData> {
  return { live: true, ...PARENT_CONTENT };
}
