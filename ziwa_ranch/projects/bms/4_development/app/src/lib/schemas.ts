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
