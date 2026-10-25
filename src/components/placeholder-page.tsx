export function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-3">
      <h1 className="text-base font-semibold">{title}</h1>
      <div className="rounded-md border border-dashed border-border bg-secondary p-8 text-center text-xs text-muted-foreground">
        {description}
      </div>
    </div>
  );
}
