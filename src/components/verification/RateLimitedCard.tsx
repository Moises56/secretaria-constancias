import { Clock } from "lucide-react";

interface RateLimitedCardProps {
  retryAfterMs?: number;
}

export function RateLimitedCard({ retryAfterMs }: RateLimitedCardProps) {
  const seconds = retryAfterMs ? Math.max(1, Math.ceil(retryAfterMs / 1000)) : 60;
  return (
    <div className="space-y-6" data-testid="status-ratelimited">
      <section className="rounded-lg border-2 border-amber-500/30 bg-amber-500/5 p-5 sm:p-6">
        <Clock className="mb-3 size-10 text-amber-600 sm:size-12 dark:text-amber-400" aria-hidden />
        <h1 className="font-display text-foreground text-xl leading-tight tracking-tight sm:text-2xl">
          Demasiadas consultas
        </h1>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          Se ha excedido el límite de verificaciones desde su conexión. Intente nuevamente en
          aproximadamente <strong className="text-foreground">{seconds}</strong> segundos.
        </p>
      </section>

      <div className="seal-rule" aria-hidden>
        <span className="seal-rule__diamond" />
      </div>
    </div>
  );
}
