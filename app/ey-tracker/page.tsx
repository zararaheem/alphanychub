import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Early Years Tracker", openGraph: { title: "Early Years Tracker", siteName: "Early Years Tracker" } };

// The link guides use: nychub.vercel.app/ey-tracker
export default function EyTracker() {
  redirect("/tracker");
}
