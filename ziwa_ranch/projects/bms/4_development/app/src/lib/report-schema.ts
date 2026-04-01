import { z, type ZodTypeAny } from "zod";
import type { FormField, FormSchema } from "@/types/forms";

function buildFieldSchema(field: FormField): ZodTypeAny {
  let schema: ZodTypeAny;

  switch (field.type) {
    case "text":
    case "textarea":
    case "date":
    case "time":
    case "select":
    case "photo":
      schema = field.required ? z.string().min(1, `${field.label} is required`) : z.string().optional().default("");
      break;

    case "number":
    case "number_stepper": {
      let numSchema = z.coerce.number();
      if (field.min !== undefined) numSchema = numSchema.min(field.min);
      if (field.max !== undefined) numSchema = numSchema.max(field.max);
      schema = field.required ? numSchema : numSchema.optional().default(0);
      break;
    }

    case "multi_select":
    case "checkbox_group":
      schema = field.required
        ? z.array(z.string()).min(1, `Select at least one option for ${field.label}`)
        : z.array(z.string()).optional().default([]);
      break;

    case "inventory_grid":
      schema = z.record(z.string(), z.coerce.number().min(0)).optional().default({});
      break;

    case "room_grid":
      schema = z.record(z.string(), z.string()).optional().default({});
      break;

    case "repeater": {
      if (field.fields && field.fields.length > 0) {
        const rowShape: Record<string, ZodTypeAny> = {};
        for (const subField of field.fields) {
          rowShape[subField.key] = buildFieldSchema(subField);
        }
        let arrSchema = z.array(z.object(rowShape));
        if (field.min_rows) arrSchema = arrSchema.min(field.min_rows, `At least ${field.min_rows} row(s) required`);
        if (field.max_rows) arrSchema = arrSchema.max(field.max_rows, `Maximum ${field.max_rows} row(s) allowed`);
        schema = field.required ? arrSchema.min(1, `${field.label} requires at least one entry`) : arrSchema.optional().default([]);
      } else {
        schema = z.array(z.record(z.string(), z.unknown())).optional().default([]);
      }
      break;
    }

    default:
      schema = z.unknown().optional();
  }

  return schema;
}

export function buildReportSchema(formSchema: FormSchema, naSections: Set<string>) {
  const shape: Record<string, ZodTypeAny> = {};

  for (const section of formSchema.sections) {
    if (naSections.has(section.key)) continue;

    for (const field of section.fields) {
      shape[field.key] = buildFieldSchema(field);
    }
  }

  return z.object(shape);
}

export function buildNaReasonSchema(naSections: Set<string>) {
  const shape: Record<string, ZodTypeAny> = {};
  for (const key of naSections) {
    shape[`na_reason_${key}`] = z.string().min(1, "Reason is required when marking N/A");
  }
  return z.object(shape);
}
