type ProductCardProps = {
  title: string;
  price: number;
  img?: string;
  className?: string;
};

export default function ProductCard({
  title,
  price,
  img,
  className = "",
}: ProductCardProps) {
  return (
    <div className={`flex-none border border-[var(--line)] rounded-lg p-4 bg-white snap-start ${className}`}>
      <div
        className="aspect-[3/4] rounded-md mb-3 border border-[var(--line)] bg-cover bg-center"
        style={{ backgroundImage: `url('${img ?? "/images/1.jpg"}')` }}
      />
      <div className="text-sm text-[var(--muted)]">{title}</div>
      <div className="font-medium">{`\u20BA${price.toFixed(2)}`}</div>
    </div>
  );
}
