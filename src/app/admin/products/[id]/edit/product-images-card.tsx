"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ProductImage = { id: string; url: string; alt: string | null; sortOrder: number };

type Props = {
  productId: string;
  images: ProductImage[];
  primaryImageId?: string | null;
  onAddImage: (productId: string, url: string, alt?: string) => Promise<void>;
  onDeleteImage: (imageId: string) => Promise<void>;
  onMoveImage?: (productId: string, imageId: string, direction: "left" | "right") => Promise<void>;
  onSetPrimaryImage?: (productId: string, imageId: string) => Promise<void>;
};

export function ProductImagesCard({ productId, images, primaryImageId, onAddImage, onDeleteImage, onMoveImage, onSetPrimaryImage }: Props) {
  const router = useRouter();
  const [urlInput, setUrlInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [addingUrl, setAddingUrl] = useState(false);
  const [error, setError] = useState("");

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      await onAddImage(productId, data.url);
      router.refresh();
      e.target.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }
    setUploading(false);
  }

  async function handleAddUrl() {
    const url = urlInput.trim();
    if (!url) return;
    setError("");
    setAddingUrl(true);
    try {
      await onAddImage(productId, url);
      router.refresh();
      setUrlInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add image");
    }
    setAddingUrl(false);
  }

  return (
    <Card className="border-brand-primary/25 bg-zinc-900">
      <CardHeader>
        <CardTitle className="text-cream">Product images</CardTitle>
        <CardDescription>
          Upload a photo or paste an image URL. Order matters: Thumbnail 1 = first color, Thumbnail 2 = second color, etc. Use arrows to reorder. Click &quot;Primary&quot; to set the store image.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {images.length > 0 && (
          <ul className="flex flex-wrap gap-4">
            {images.sort((a, b) => a.sortOrder - b.sortOrder).map((img, idx) => (
              <li key={img.id} className="relative group">
                <div className="w-24 h-24 rounded border border-zinc-600 overflow-hidden bg-zinc-800">
                  <img
                    src={img.url}
                    alt={img.alt ?? "Product"}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute top-1 right-1 flex flex-wrap gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {onSetPrimaryImage && (
                    <Button
                      type="button"
                      variant={primaryImageId === img.id ? "default" : "outline"}
                      size="sm"
                      className={`h-6 px-1.5 text-xs ${primaryImageId === img.id ? "bg-brand-accent text-brand-ink" : "border-zinc-600"}`}
                      onClick={async () => {
                        await onSetPrimaryImage(productId, img.id);
                        router.refresh();
                      }}
                      title="Set as primary store image"
                    >
                      Primary
                    </Button>
                  )}
                  {onMoveImage && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6 px-1.5 text-xs border-zinc-600"
                        onClick={async () => {
                          await onMoveImage(productId, img.id, "left");
                          router.refresh();
                        }}
                        disabled={idx === 0}
                        title="Move left"
                      >
                        ←
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6 px-1.5 text-xs border-zinc-600"
                        onClick={async () => {
                          await onMoveImage(productId, img.id, "right");
                          router.refresh();
                        }}
                        disabled={idx === images.length - 1}
                        title="Move right"
                      >
                        →
                      </Button>
                    </>
                  )}
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="h-6 px-1.5 text-xs"
                    onClick={async () => {
                      await onDeleteImage(img.id);
                      router.refresh();
                    }}
                  >
                    Remove
                  </Button>
                </div>
                <span className="absolute bottom-1 left-1 text-xs bg-black/70 px-1 rounded">
                  #{idx + 1}
                  {primaryImageId === img.id && " ★"}
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-end gap-4">
          <div className="grid gap-2">
            <Label className="text-cream">Upload photo</Label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="text-sm text-zinc-400 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-brand-accent file:text-brand-ink file:text-sm"
              onChange={handleFileChange}
              disabled={uploading}
            />
            {uploading && <p className="text-xs text-zinc-500">Uploading…</p>}
          </div>
          <div className="grid gap-2 flex-1 min-w-[200px]">
            <Label htmlFor="image-url" className="text-cream">Or add image URL</Label>
            <div className="flex gap-2">
              <Input
                id="image-url"
                type="url"
                placeholder="https://..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="bg-zinc-800 border-zinc-600"
              />
              <Button
                type="button"
                variant="outline"
                className="border-zinc-600"
                onClick={handleAddUrl}
                disabled={addingUrl || !urlInput.trim()}
              >
                {addingUrl ? "Adding…" : "Add"}
              </Button>
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
      </CardContent>
    </Card>
  );
}
