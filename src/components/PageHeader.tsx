export function PageHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="safe-top px-5 pb-2 pt-8">
      {eyebrow && (
        <p className="text-[0.7rem] uppercase tracking-widest text-ink-faint">{eyebrow}</p>
      )}
      <h1 className="mt-1 font-serif text-3xl leading-tight text-ink">{title}</h1>
      {children && <div className="mt-2 text-sm text-ink-faint">{children}</div>}
    </header>
  );
}
