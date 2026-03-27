"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

const STATUSES = [
  { value: "", label: "All" },
  { value: "PUBLISHED", label: "Published" },
  { value: "DRAFT", label: "Draft" },
  { value: "ARCHIVED", label: "Archived" },
] as const;

export function ProductStatusFilter({
  current,
}: {
  current?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setStatus(status: string) {
    const next = new URLSearchParams(searchParams);
    if (status) next.set("status", status);
    else next.delete("status");
    router.push(`/admin/products?${next.toString()}`);
  }

  return (
    <div className="flex gap-2">
      {STATUSES.map(({ value, label }) => (
        <Button
          key={value}
          variant={current === value ? "default" : "outline"}
          size="sm"
          className={current === value ? "bg-brand-primary/20 text-brand-primary border-brand-primary/50" : "border-zinc-600"}
          onClick={() => setStatus(value)}
        >
          {label}
        </Button>
      ))}
    </div>
  );
}
