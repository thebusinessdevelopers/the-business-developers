"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FormFieldRenderer } from "./form-field";
import { buildReportSchema } from "@/lib/report-schema";
import type { FormSchema } from "@/types/forms";

interface FormRendererProps {
  schema: FormSchema;
  stockItems?: { name: string; unit: string }[];
  roomCount?: number;
  submitting?: boolean;
  onSubmit: (data: Record<string, unknown>, naSections: { key: string; reason: string }[]) => void;
}

export function FormRenderer({ schema, stockItems, roomCount, submitting, onSubmit }: FormRendererProps) {
  const [naSections, setNaSections] = useState<Map<string, string>>(new Map());

  const naSet = new Set(naSections.keys());
  const zodSchema = buildReportSchema(schema, naSet);

  const { control, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(zodSchema),
    shouldFocusError: false,
  });

  const toggleNa = useCallback((sectionKey: string) => {
    setNaSections((prev) => {
      const next = new Map(prev);
      if (next.has(sectionKey)) {
        next.delete(sectionKey);
      } else {
        next.set(sectionKey, "");
      }
      return next;
    });
  }, []);

  const setNaReason = useCallback((sectionKey: string, reason: string) => {
    setNaSections((prev) => {
      const next = new Map(prev);
      next.set(sectionKey, reason);
      return next;
    });
  }, []);

  function handleFormSubmit(data: Record<string, unknown>) {
    const naEntries = Array.from(naSections.entries());
    const invalidNa = naEntries.find(([, reason]) => !reason.trim());
    if (invalidNa) return;

    onSubmit(
      data,
      naEntries.map(([key, reason]) => ({ key, reason }))
    );
  }

  function handleError() {
    const el = document.querySelector("[data-first-error]");
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  const errorKeys = Object.keys(errors);

  const firstErrorSectionKey = (() => {
    for (const section of schema.sections) {
      if (naSections.has(section.key)) continue;
      for (const f of section.fields) {
        if (errorKeys.includes(f.key)) return section.key;
      }
    }
    return null;
  })();

  return (
    <form onSubmit={handleSubmit(handleFormSubmit, handleError)} className="space-y-4">
      {schema.sections.map((section) => {
        const isNa = naSections.has(section.key);
        const naReason = naSections.get(section.key) ?? "";
        const isFirstErrorSection = section.key === firstErrorSectionKey;

        return (
          <Card key={section.key} className={isNa ? "opacity-60" : ""}>
            <CardHeader className="pb-3">
              <div
                className="flex items-center justify-between"
                {...(isFirstErrorSection ? { "data-first-error": true } : {})}
              >
                <CardTitle className="text-base">{section.title}</CardTitle>
                {section.na_allowed && (
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">N/A</Label>
                    <Switch
                      checked={isNa}
                      onCheckedChange={() => toggleNa(section.key)}
                    />
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isNa ? (
                <div>
                  <Label className="text-sm">
                    Reason for N/A <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    className="mt-1"
                    placeholder="Why is this section not applicable today?"
                    rows={2}
                    value={naReason}
                    onChange={(e) => setNaReason(section.key, e.target.value)}
                  />
                  {!naReason.trim() && (
                    <p className="text-xs text-destructive mt-1">Reason is required when marking N/A</p>
                  )}
                </div>
              ) : (
                section.fields.map((field) => (
                  <FormFieldRenderer
                    key={field.key}
                    field={field}
                    control={control}
                    stockItems={stockItems}
                    roomCount={roomCount}
                  />
                ))
              )}
            </CardContent>
          </Card>
        );
      })}

      <Button type="submit" className="w-full" size="lg" disabled={submitting}>
        {submitting ? "Submitting..." : "Submit Report"}
      </Button>
    </form>
  );
}
