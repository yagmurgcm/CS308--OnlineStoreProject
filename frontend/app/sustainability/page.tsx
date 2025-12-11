import Link from "next/link";

const sections = [
  {
    id: "philosophy",
    title: "Our Philosophy",
    intro:
      "We build thoughtful basics, reduce excess, and share the impact data behind every seasonal refresh. Each launch is planned with partner feedback, resource intensity, and long-term durability in mind.",
    detail:
      "Teams across design, sourcing, and logistics set shared goals on material traceability, energy use, and fair compensation. We publish progress biannually and adjust assortments when we find better, lower-impact options.",
  },
  {
    id: "materials",
    title: "Materials",
    intro:
      "We prioritise audited suppliers, certified organic cotton, responsibly sourced wool, recycled poly, and plant-based finishes that meet strict chemical safety thresholds.",
    detail:
      "Every core fabric is mapped to its origin mill, with documentation for water stewardship and waste handling. We favour mono-material constructions to simplify recycling and choose trims that meet bluesign-aligned guidelines.",
  },
  {
    id: "recycling",
    title: "Recycling",
    intro:
      "Packaging is intentionally minimal: recycled paper mailers for most orders, reusable boxes for larger items, and water-based inks for all prints.",
    detail:
      "We run take-back drops twice a year to collect used textiles for repair, donation, or fibre-to-fibre recycling. Garments that cannot be salvaged are downcycled through partners specialising in insulation and padding.",
  },
];

export default function SustainabilityPage() {
  return (
    <div className="bg-[#e8f4fb] text-[var(--foreground)]">
      <div className="relative full-bleed h-[360px] md:h-[460px] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/images/sustainability-hero.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/35 to-black/60" />
        <div className="container-base relative h-full flex items-center">
          <div className="max-w-2xl space-y-4 text-white">
            <p className="uppercase tracking-[0.18em] text-xs md:text-sm text-white/80">Sustainability</p>
            <h1 className="text-3xl md:text-4xl font-semibold leading-tight">Designed to last, built with respect for people and planet.</h1>
            <p className="text-base md:text-lg text-white/80">
              We keep collections tight, source transparently, and invest in circular programs that give each item a longer life.
            </p>
            <div className="flex flex-wrap gap-3">
              {sections.map((section) => (
                <Link key={section.id} href={`#${section.id}`} className="pill !bg-white/90 !border-white text-black hover:bg-white">
                  {section.title}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="container-base py-12 md:py-16 space-y-12">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-lg border border-[var(--line)] bg-[var(--background)] p-6 space-y-2">
            <div className="text-sm text-[var(--muted)]">Materials</div>
            <div className="text-xl font-semibold">90% of core fabrics traceable to mill</div>
            <p className="text-sm text-neutral-700">Rolling target to reach 100% verification, with quarterly audits.</p>
          </div>
          <div className="rounded-lg border border-[var(--line)] bg-[var(--background)] p-6 space-y-2">
            <div className="text-sm text-[var(--muted)]">Packaging</div>
            <div className="text-xl font-semibold">Recycled paper mailers standard</div>
            <p className="text-sm text-neutral-700">Plastic-free shipping for apparel and soft goods, where routes allow.</p>
          </div>
          <div className="rounded-lg border border-[var(--line)] bg-[var(--background)] p-6 space-y-2">
            <div className="text-sm text-[var(--muted)]">Circularity</div>
            <div className="text-xl font-semibold">Biannual take-back drops</div>
            <p className="text-sm text-neutral-700">Collected textiles routed to repair, donation, or fibre-to-fibre recycling.</p>
          </div>
        </div>

        <div className="space-y-8">
          {sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="rounded-lg border border-[var(--line)] bg-white p-6 md:p-8 space-y-4 scroll-mt-24"
            >
              <h2 className="text-2xl font-semibold">{section.title}</h2>
              <p className="text-base leading-relaxed text-neutral-800">{section.intro}</p>
              <p className="text-base leading-relaxed text-neutral-800">{section.detail}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
