import Link from "next/link";

const links = [
  { href: "/screen", title: "מסך הקרנה", desc: "להקרין על המסך הגדול לקהל" },
  { href: "/host", title: "מסך מנחה", desc: "שליטה במשחק — למנחה בלבד" },
  { href: "/play", title: "מסך נציג", desc: "להצטרפות מהטלפון של הנציגים" },
];

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-10 p-8 text-center">
      <div>
        <h1 className="text-5xl md:text-7xl font-black gold-text">מי מכיר את מוריס?</h1>
        <p className="mt-3 text-[var(--muted)] text-lg">חמישה מדורים. משימה אחת.</p>
      </div>
      <div className="grid gap-4 w-full max-w-md">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-2xl bg-[var(--panel)] border border-white/10 p-5 text-right hover:border-[var(--gold)]/60 transition-colors"
          >
            <div className="text-xl font-bold text-[var(--gold)]">{l.title}</div>
            <div className="text-sm text-[var(--muted)] mt-1">{l.desc}</div>
          </Link>
        ))}
      </div>
    </main>
  );
}
