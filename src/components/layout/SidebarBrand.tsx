import Image from "next/image";

/**
 * Marca institucional de la sidebar — escudo oficial de AMDC sobre fondo
 * blanco para destacar contra la sidebar oscura, con diamante ocre que
 * mantiene el lenguaje visual del seal-rule.
 */
export function SidebarBrand() {
  return (
    <div className="border-sidebar-border flex items-center gap-3 border-b px-5 py-5">
      <span className="relative grid size-10 shrink-0 place-items-center rounded-md bg-white p-1 shadow-sm">
        <Image src="/amdc_original.png" alt="" width={36} height={36} className="object-contain" />
        <span
          className="absolute -top-1 -right-1 size-2 rotate-45 rounded-[2px] bg-[var(--color-seal)]"
          aria-hidden
        />
      </span>
      <span className="font-display text-sidebar-foreground min-w-0 flex-1 leading-tight">
        <span className="block truncate text-[0.95rem] font-semibold">Secretaría Municipal</span>
        <span className="text-sidebar-foreground/60 block truncate text-[0.7rem] tracking-[0.18em] uppercase">
          Distrito Central
        </span>
      </span>
    </div>
  );
}
