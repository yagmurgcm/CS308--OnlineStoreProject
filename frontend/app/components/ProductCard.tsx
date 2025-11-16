import AddToCartButton from "./AddToCartButton";

type ProductCardProps = {
  id: string;
  title: string;
  price: number;
  img?: string;
  className?: string;
  color?: string;
  size?: string;
};

export default function ProductCard({
  id,
  title,
  price,
  img,
  className = "",
  color,
  size,
}: ProductCardProps) {
  const image = img ?? "/images/1.jpg";

  return (
    <div className={`flex-none border border-[var(--line)] rounded-lg p-4 bg-white snap-start space-y-3 ${className}`}>
      <div
        className="aspect-[3/4] rounded-md border border-[var(--line)] bg-cover bg-center"
        style={{ backgroundImage: `url('${image}')` }}
      />
      <div className="text-sm text-[var(--muted)]">{title}</div>
      <div className="font-medium">{`\u20BA${price.toFixed(2)}`}</div>
      <AddToCartButton
        product={{
          id,
          name: title,
          price,
          image,
          color,
          size,
        }}
      />
    </div>
  );
}
