import Image from "next/image";

interface BrandLogoProps {
  className?: string;
  sizes?: string;
  preload?: boolean;
}

export function BrandLogo({
  className,
  sizes = "64px",
  preload = false,
}: BrandLogoProps) {
  return (
    <Image
      src="/brand/coffee-dex-logo.png"
      alt=""
      width={512}
      height={512}
      className={className}
      sizes={sizes}
      preload={preload}
      draggable={false}
    />
  );
}
