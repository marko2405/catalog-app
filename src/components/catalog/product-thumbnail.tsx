"use client";

import Image from "next/image";
import { ImageOff } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";

export function ProductThumbnail({
  src,
  name,
}: {
  src?: string;
  name: string;
}) {
  const t = useTranslations("Catalog");
  const [failedSource, setFailedSource] = useState<string>();

  return (
    <div className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted/40">
      {src && failedSource !== src ? (
        <Image
          src={src}
          alt={name}
          fill
          sizes="48px"
          unoptimized
          className="object-contain"
          onError={() => setFailedSource(src)}
        />
      ) : (
        <span
          role="img"
          aria-label={t("missingImage", { name })}
          className="text-muted-foreground"
        >
          <ImageOff className="size-5" aria-hidden="true" />
        </span>
      )}
    </div>
  );
}
