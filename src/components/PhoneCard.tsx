import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { PhoneWithBrand } from "@/types/database";

interface PhoneCardProps {
  phone: PhoneWithBrand;
}

export function PhoneCard({ phone }: PhoneCardProps) {
  const hasDiscount = phone.sale_price && phone.sale_price < phone.price;
  const discountPercent = hasDiscount
    ? Math.round(((phone.price - phone.sale_price!) / phone.price) * 100)
    : 0;

  const baseUrl = import.meta.env.BASE_URL || "/";
  const rawImage = phone.images?.[0];
  const imageSrc = rawImage
    ? rawImage.startsWith("http")
      ? rawImage
      : `${baseUrl.replace(/\/$/, "")}/${rawImage.replace(/^\//, "")}`
    : undefined;

  return (
    <Link to={`/phone/${phone.id}`}>
      <Card className="card-hover overflow-hidden group cursor-pointer h-full">
        <div className="relative aspect-square overflow-hidden bg-secondary">
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={phone.model}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              Sin imagen
            </div>
          )}
          
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            {phone.is_featured && (
              <span className="featured-badge">Destacado</span>
            )}
            {hasDiscount && (
              <span className="sale-badge">-{discountPercent}%</span>
            )}
          </div>
        </div>

        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
            {phone.brand?.name}
          </p>
          <h3 className="font-display font-semibold text-lg mb-2 line-clamp-1">
            {phone.model}
          </h3>
          
          <div className="flex items-center gap-2 mb-3">
            {hasDiscount ? (
              <>
                <span className="text-xl font-bold text-primary">
                  ${phone.sale_price?.toFixed(2)}
                </span>
                <span className="text-sm text-muted-foreground line-through">
                  ${phone.price.toFixed(2)}
                </span>
              </>
            ) : (
              <span className="text-xl font-bold">${phone.price.toFixed(2)}</span>
            )}
          </div>

          <div className="flex flex-wrap gap-1">
            {phone.storage_options?.slice(0, 3).map((storage) => (
              <Badge key={storage} variant="secondary" className="text-xs">
                {storage}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}