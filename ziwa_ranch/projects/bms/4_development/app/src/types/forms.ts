export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "number_stepper"
  | "select"
  | "multi_select"
  | "checkbox_group"
  | "inventory_grid"
  | "room_grid"
  | "repeater"
  | "photo"
  | "date"
  | "time";

export interface FormField {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  min?: number;
  max?: number;
  options?: string[];
  help_text?: string;
  fields?: FormField[];
  min_rows?: number;
  max_rows?: number;
}

export interface FormSection {
  key: string;
  title: string;
  na_allowed: boolean;
  fields: FormField[];
}

export interface FormSchema {
  sections: FormSection[];
}

export type UserRole = "owner" | "admin" | "manager" | "hod" | "staff";

export const ADMIN_ROLES: UserRole[] = ["owner", "admin", "manager"];

export function isAdminRole(role: UserRole): boolean {
  return ADMIN_ROLES.includes(role);
}
