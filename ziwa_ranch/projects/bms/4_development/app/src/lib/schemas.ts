import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const signupSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  org_name: z.string().min(2, "Organisation name must be at least 2 characters"),
});

export type SignupInput = z.infer<typeof signupSchema>;

export const organisationSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  type: z.enum(["lodge", "hotel", "resort", "camp"]),
  location: z.string().optional(),
  room_count: z.number().int().min(0).optional(),
});

export type OrganisationInput = z.infer<typeof organisationSchema>;

export const userSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Enter a valid email address"),
  role: z.enum(["owner", "admin", "manager", "hod", "staff"]),
  department_id: z.string().uuid().nullable().optional(),
  phone: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type UserInput = z.infer<typeof userSchema>;

export const departmentSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  template_id: z.string().uuid().optional(),
});

export type DepartmentInput = z.infer<typeof departmentSchema>;

// --- Stock Management ---

export const STOCK_CATEGORIES = [
  "produce",
  "dry_goods",
  "beverages",
  "cleaning",
  "maintenance",
  "other",
] as const;

export const STOCK_UNITS = [
  "kg",
  "litres",
  "units",
  "bottles",
  "bags",
  "boxes",
  "cartons",
  "packets",
  "tins",
  "rolls",
  "pairs",
  "metres",
  "other",
] as const;

export const stockItemSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  unit: z.string().min(1, "Unit is required"),
  category: z.string().optional(),
  minimum_quantity: z.number().min(0, "Cannot be negative"),
  cost_per_unit: z.number().min(0).optional(),
  supplier: z.string().optional(),
});

export type StockItemInput = z.infer<typeof stockItemSchema>;

export const purchaseOrderLineSchema = z.object({
  item_id: z.string().uuid(),
  item_name: z.string(),
  quantity_ordered: z.coerce.number().min(0),
  quantity_received: z.coerce.number().min(0),
  unit_cost: z.coerce.number().min(0).optional(),
  unit: z.string(),
});

export type PurchaseOrderLineInput = z.infer<typeof purchaseOrderLineSchema>;

export const purchaseOrderSchema = z.object({
  supplier_name: z.string().min(1, "Supplier name is required"),
  status: z.enum(["ordered", "received"]),
  items: z.array(purchaseOrderLineSchema).min(1, "Add at least one item"),
  notes: z.string().optional(),
});

export type PurchaseOrderInput = z.infer<typeof purchaseOrderSchema>;

export const requisitionLineSchema = z.object({
  item_id: z.string().uuid(),
  item_name: z.string(),
  quantity_requested: z.coerce.number().min(0.01, "Quantity must be greater than 0"),
  quantity_approved: z.coerce.number().min(0).optional(),
  unit: z.string(),
  notes: z.string().optional(),
});

export type RequisitionLineInput = z.infer<typeof requisitionLineSchema>;

export const requisitionSchema = z.object({
  department_id: z.string().uuid(),
  items: z.array(requisitionLineSchema).min(1, "Add at least one item"),
  notes: z.string().optional(),
});

export type RequisitionInput = z.infer<typeof requisitionSchema>;

export const adjustmentSchema = z.object({
  item_id: z.string().uuid(),
  quantity: z.number().refine((v) => v !== 0, "Quantity cannot be zero"),
  notes: z.string().min(1, "A reason is required for adjustments"),
});

export type AdjustmentInput = z.infer<typeof adjustmentSchema>;

const formFieldSchema: z.ZodType = z.lazy(() =>
  z.object({
    key: z.string().min(1),
    label: z.string().min(1),
    type: z.enum([
      "text", "textarea", "number", "number_stepper", "select",
      "multi_select", "checkbox_group", "inventory_grid", "room_grid",
      "repeater", "photo", "date", "time",
    ]),
    required: z.boolean(),
    min: z.number().optional(),
    max: z.number().optional(),
    options: z.array(z.string()).optional(),
    help_text: z.string().optional(),
    fields: z.array(formFieldSchema).optional(),
    min_rows: z.number().optional(),
    max_rows: z.number().optional(),
  })
);

const formSectionSchema = z.object({
  key: z.string().min(1),
  title: z.string().min(1),
  na_allowed: z.boolean(),
  fields: z.array(formFieldSchema).min(1, "Each section needs at least one field"),
});

export const formSchemaValidator = z.object({
  sections: z.array(formSectionSchema).min(1, "At least one section is required"),
});
