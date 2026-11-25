"use client"

import Image from "next/image"
import { ImageOff } from "lucide-react"
import { useState } from "react"

export function ProductThumbnail({ src, name }: { src?: string; name: string }) {
  const [failedSource, setFailedSource] = useState<string>()
  return (
    <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted/40">
      {src && failedSource !== src ? (
        <Image src={src} alt={name} width={48} height={48} unoptimized className="size-12 object-cover" onError={() => setFailedSource(src)} />
      ) : (
        <span role="img" aria-label={`Slika nije dostupna: ${name}`} className="text-muted-foreground">
          <ImageOff className="size-5" aria-hidden="true" />
        </span>
      )}
    </div>
  )
}
