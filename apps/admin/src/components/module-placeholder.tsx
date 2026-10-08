import { Badge, Card } from '@neojapan/ui';

export interface ModulePlaceholderProps {
  title: string;
  description: string;
  badge?: string;
}

export function ModulePlaceholder({
  title,
  description,
  badge = 'En desarrollo',
}: ModulePlaceholderProps) {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-display text-2xl text-gray-100">{title}</h1>
        <p className="text-gray-400">{description}</p>
      </div>
      <Card className="p-6">
        <div className="flex items-center gap-3">
          <Badge tone="neutral">{badge}</Badge>
          <span className="text-gray-400">
            Este módulo se implementa en una fase posterior.
          </span>
        </div>
      </Card>
    </section>
  );
}