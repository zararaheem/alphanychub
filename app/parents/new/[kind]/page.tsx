import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentFamily } from "@/lib/parent-session";
import { kindById } from "@/lib/requests";
import { RequestForm } from "@/components/request-form";
import { submitParentRequest } from "../../actions";

export default async function NewParentRequest({ params, searchParams }: { params: Promise<{ kind: string }>; searchParams: Promise<{ err?: string }> }) {
  const family = await currentFamily();
  if (!family) redirect("/parents/sign-in");
  const kind = kindById((await params).kind);
  if (!kind || kind.audience !== "parent") notFound();
  const { err } = await searchParams;
  return (
    <div className="stack ph-narrow">
      <Link href="/parents" className="small">← Parent Hub</Link>
      <div className="stack-sm">
        <h1>{kind.title}</h1>
        <p className="lede">{kind.blurb}</p>
      </div>
      {err && <p className="notice error" role="alert">{err}</p>}
      <RequestForm kind={kind} action={submitParentRequest} students={family.children} />
    </div>
  );
}
