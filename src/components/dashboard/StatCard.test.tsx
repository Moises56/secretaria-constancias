import { render, screen } from "@testing-library/react";
import { FileText } from "lucide-react";
import { describe, expect, it } from "vitest";

import { StatCard, StatCardSkeleton } from "@/components/dashboard/StatCard";

describe("StatCard", () => {
  it("renderiza label, value y un ícono", () => {
    render(<StatCard label="CVE" value={42} icon={FileText} />);
    expect(screen.getByText("CVE")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByTestId("stat-card")).toBeInTheDocument();
  });

  it("muestra el hint cuando se provee", () => {
    render(<StatCard label="Total" value="—" icon={FileText} hint="FASE 8" />);
    expect(screen.getByText("FASE 8")).toBeInTheDocument();
  });

  it("renderiza el trend con la clase de dirección correcta", () => {
    render(
      <StatCard label="CVD" value="12" icon={FileText} trend={{ value: "+8%", direction: "up" }} />,
    );
    const badge = screen.getByText("+8%");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toMatch(/emerald|bg-/);
  });

  it("skeleton variant no muestra valores ni labels", () => {
    render(<StatCardSkeleton />);
    expect(screen.getByTestId("stat-card-skeleton")).toBeInTheDocument();
    expect(screen.queryByText("CVE")).not.toBeInTheDocument();
  });
});
