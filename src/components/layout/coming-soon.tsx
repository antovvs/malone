import { Hammer } from "lucide-react";

/** Écran provisoire des pages prévues mais pas encore construites. */
export function ComingSoon({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 py-10">
      <div className="flex size-10 items-center justify-center rounded-lg border bg-card">
        <Hammer className="size-5 text-muted-foreground" aria-hidden />
      </div>
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cette page arrive dans une prochaine étape. Elle affichera :
        </p>
      </div>
      <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
