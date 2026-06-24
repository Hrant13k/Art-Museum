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
    <header className="safe-top px-6 pb-2 pt-10">
      {eyebrow && <p className="eyebrow mb-2.5">{eyebrow}</p>}
      <h1 className="font-serif text-[2.4rem] font-light leading-[1.05] tracking-tight text-linen">
        {title}
      </h1>
      {children && <div className="mt-3 text-sm text-linen-dim">{children}</div>}
    </header>
  );
}
