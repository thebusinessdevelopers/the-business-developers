"use client";

import { Controller, useFieldArray, useWatch, type Control } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2 } from "lucide-react";
import type { FormField as FormFieldType } from "@/types/forms";

interface FieldProps {
  field: FormFieldType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>;
  disabled?: boolean;
}

function FieldLabel({ field }: { field: FormFieldType }) {
  return (
    <Label className="text-sm font-medium">
      {field.label}
      {field.required && <span className="text-destructive ml-0.5">*</span>}
    </Label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive mt-1">{message}</p>;
}

function HelpText({ text }: { text?: string }) {
  if (!text) return null;
  return <p className="text-xs text-muted-foreground mt-1">{text}</p>;
}

function TextField({ field, control, disabled }: FieldProps) {
  return (
    <Controller
      name={field.key}
      control={control}
      render={({ field: ctrl, fieldState }) => (
        <div>
          <FieldLabel field={field} />
          <Input value={ctrl.value ?? ""} onChange={ctrl.onChange} onBlur={ctrl.onBlur} name={ctrl.name} ref={ctrl.ref} disabled={disabled} className="mt-1" />
          <HelpText text={field.help_text} />
          <FieldError message={fieldState.error?.message} />
        </div>
      )}
    />
  );
}

function TextareaField({ field, control, disabled }: FieldProps) {
  return (
    <Controller
      name={field.key}
      control={control}
      render={({ field: ctrl, fieldState }) => (
        <div>
          <FieldLabel field={field} />
          <Textarea value={ctrl.value ?? ""} onChange={ctrl.onChange} onBlur={ctrl.onBlur} name={ctrl.name} ref={ctrl.ref} disabled={disabled} className="mt-1" rows={3} />
          <HelpText text={field.help_text} />
          <FieldError message={fieldState.error?.message} />
        </div>
      )}
    />
  );
}

function NumberField({ field, control, disabled }: FieldProps) {
  return (
    <Controller
      name={field.key}
      control={control}
      render={({ field: ctrl, fieldState }) => (
        <div>
          <FieldLabel field={field} />
          <Input
            type="number"
            inputMode="decimal"
            min={field.min}
            max={field.max}
            disabled={disabled}
            className="mt-1"
            value={ctrl.value ?? ""}
            onChange={(e) => ctrl.onChange(e.target.value === "" ? "" : Number(e.target.value))}
            onBlur={ctrl.onBlur}
            name={ctrl.name}
            ref={ctrl.ref}
          />
          <HelpText text={field.help_text} />
          <FieldError message={fieldState.error?.message} />
        </div>
      )}
    />
  );
}

function NumberStepperField({ field, control, disabled }: FieldProps) {
  return (
    <Controller
      name={field.key}
      control={control}
      render={({ field: ctrl, fieldState }) => {
        const value = Number(ctrl.value) || 0;
        const min = field.min ?? 0;
        const max = field.max ?? 9999;
        return (
          <div>
            <FieldLabel field={field} />
            <div className="flex items-center gap-2 mt-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0"
                disabled={disabled || value <= min}
                onClick={() => ctrl.onChange(Math.max(min, value - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                type="number"
                inputMode="numeric"
                className="text-center"
                disabled={disabled}
                value={ctrl.value ?? 0}
                onChange={(e) => ctrl.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                onBlur={ctrl.onBlur}
                name={ctrl.name}
                ref={ctrl.ref}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0"
                disabled={disabled || value >= max}
                onClick={() => ctrl.onChange(Math.min(max, value + 1))}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <HelpText text={field.help_text} />
            <FieldError message={fieldState.error?.message} />
          </div>
        );
      }}
    />
  );
}

function SelectField({ field, control, disabled }: FieldProps) {
  return (
    <Controller
      name={field.key}
      control={control}
      render={({ field: ctrl, fieldState }) => (
        <div>
          <FieldLabel field={field} />
          <select
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            disabled={disabled}
            value={ctrl.value ?? ""}
            onChange={ctrl.onChange}
            onBlur={ctrl.onBlur}
            name={ctrl.name}
            ref={ctrl.ref}
          >
            <option value="">Select...</option>
            {field.options?.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          <HelpText text={field.help_text} />
          <FieldError message={fieldState.error?.message} />
        </div>
      )}
    />
  );
}

function MultiSelectField({ field, control, disabled }: FieldProps) {
  return (
    <Controller
      name={field.key}
      control={control}
      render={({ field: ctrl, fieldState }) => {
        const selected: string[] = ctrl.value ?? [];
        function toggle(opt: string) {
          if (disabled) return;
          ctrl.onChange(
            selected.includes(opt) ? selected.filter((s: string) => s !== opt) : [...selected, opt]
          );
        }
        return (
          <div>
            <FieldLabel field={field} />
            <div className="mt-2 space-y-2">
              {field.options?.map((opt) => (
                <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)} disabled={disabled} className="h-4 w-4 rounded border-input" />
                  {opt}
                </label>
              ))}
            </div>
            <HelpText text={field.help_text} />
            <FieldError message={fieldState.error?.message} />
          </div>
        );
      }}
    />
  );
}

function CheckboxGroupField(props: FieldProps) {
  return <MultiSelectField {...props} />;
}

function InventoryGridField({ field, control, disabled, stockItems }: FieldProps & { stockItems?: { name: string; unit: string }[] }) {
  const items = stockItems ?? [];
  return (
    <Controller
      name={field.key}
      control={control}
      render={({ field: ctrl, fieldState }) => {
        const values: Record<string, number> = ctrl.value ?? {};
        function updateItem(name: string, qty: number) {
          ctrl.onChange({ ...values, [name]: qty });
        }
        if (items.length === 0) {
          return (
            <div>
              <FieldLabel field={field} />
              <p className="text-sm text-muted-foreground mt-1">No stock items configured.</p>
            </div>
          );
        }
        return (
          <div>
            <FieldLabel field={field} />
            <HelpText text={field.help_text} />
            <div className="mt-2 space-y-2">
              {items.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <span className="text-sm flex-1 min-w-0 truncate">{item.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{item.unit}</span>
                  <Input type="number" inputMode="decimal" min={0} disabled={disabled} className="w-24 shrink-0" value={values[item.name] ?? ""} onChange={(e) => updateItem(item.name, Number(e.target.value) || 0)} />
                </div>
              ))}
            </div>
            <FieldError message={fieldState.error?.message} />
          </div>
        );
      }}
    />
  );
}

function RoomGridField({ field, control, disabled, roomCount }: FieldProps & { roomCount?: number }) {
  const count = roomCount ?? 0;
  const rooms = Array.from({ length: count }, (_, i) => `Room ${i + 1}`);
  const statuses = field.options ?? ["Clean", "Occupied", "Dirty", "Out of Order"];

  return (
    <Controller
      name={field.key}
      control={control}
      render={({ field: ctrl, fieldState }) => {
        const values: Record<string, string> = ctrl.value ?? {};
        function updateRoom(room: string, status: string) {
          ctrl.onChange({ ...values, [room]: status });
        }
        if (count === 0) {
          return (
            <div>
              <FieldLabel field={field} />
              <p className="text-sm text-muted-foreground mt-1">No rooms configured.</p>
            </div>
          );
        }
        return (
          <div>
            <FieldLabel field={field} />
            <HelpText text={field.help_text} />
            <div className="mt-2 space-y-2">
              {rooms.map((room) => (
                <div key={room} className="flex items-center gap-2">
                  <span className="text-sm w-20 shrink-0">{room}</span>
                  <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" disabled={disabled} value={values[room] ?? ""} onChange={(e) => updateRoom(room, e.target.value)}>
                    <option value="">—</option>
                    {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <FieldError message={fieldState.error?.message} />
          </div>
        );
      }}
    />
  );
}

function RepeaterField({ field, control, disabled }: FieldProps) {
  const { fields: rows, append, remove } = useFieldArray({ control, name: field.key });
  const subFields = field.fields ?? [];
  const maxRows = field.max_rows ?? 50;

  return (
    <div>
      <FieldLabel field={field} />
      <HelpText text={field.help_text} />
      <div className="mt-2 space-y-3">
        {rows.map((row, idx) => (
          <div key={row.id} className="rounded-md border p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Entry {idx + 1}</span>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={disabled} onClick={() => remove(idx)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            {subFields.map((sf) => (
              <FormFieldRenderer key={sf.key} field={sf} control={control} disabled={disabled} namePrefix={`${field.key}.${idx}.`} />
            ))}
          </div>
        ))}
        {rows.length < maxRows && (
          <Button
            type="button" variant="outline" size="sm" disabled={disabled}
            onClick={() => {
              const emptyRow: Record<string, unknown> = {};
              subFields.forEach((sf) => { emptyRow[sf.key] = ""; });
              append(emptyRow);
            }}
          >
            <Plus className="h-4 w-4 mr-1" /> Add entry
          </Button>
        )}
      </div>
    </div>
  );
}

function PhotoField({ field, control, disabled }: FieldProps) {
  const value = useWatch({ control, name: field.key });
  return (
    <Controller
      name={field.key}
      control={control}
      render={({ field: ctrl, fieldState }) => (
        <div>
          <FieldLabel field={field} />
          <Input
            type="file" accept="image/*" capture="environment" disabled={disabled} className="mt-1"
            onChange={(e) => { const file = e.target.files?.[0]; if (file) ctrl.onChange(file); }}
          />
          {typeof value === "string" && value && <p className="text-xs text-muted-foreground mt-1">Photo uploaded</p>}
          <HelpText text={field.help_text} />
          <FieldError message={fieldState.error?.message} />
        </div>
      )}
    />
  );
}

function DateField({ field, control, disabled }: FieldProps) {
  return (
    <Controller
      name={field.key}
      control={control}
      render={({ field: ctrl, fieldState }) => (
        <div>
          <FieldLabel field={field} />
          <Input type="date" value={ctrl.value ?? ""} onChange={ctrl.onChange} onBlur={ctrl.onBlur} name={ctrl.name} ref={ctrl.ref} disabled={disabled} className="mt-1" />
          <HelpText text={field.help_text} />
          <FieldError message={fieldState.error?.message} />
        </div>
      )}
    />
  );
}

function TimeField({ field, control, disabled }: FieldProps) {
  return (
    <Controller
      name={field.key}
      control={control}
      render={({ field: ctrl, fieldState }) => (
        <div>
          <FieldLabel field={field} />
          <Input type="time" value={ctrl.value ?? ""} onChange={ctrl.onChange} onBlur={ctrl.onBlur} name={ctrl.name} ref={ctrl.ref} disabled={disabled} className="mt-1" />
          <HelpText text={field.help_text} />
          <FieldError message={fieldState.error?.message} />
        </div>
      )}
    />
  );
}

export interface FormFieldRendererProps {
  field: FormFieldType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>;
  disabled?: boolean;
  namePrefix?: string;
  stockItems?: { name: string; unit: string }[];
  roomCount?: number;
}

export function FormFieldRenderer({ field, control, disabled, namePrefix, stockItems, roomCount }: FormFieldRendererProps) {
  const resolvedField = namePrefix ? { ...field, key: `${namePrefix}${field.key}` } : field;

  switch (field.type) {
    case "text": return <TextField field={resolvedField} control={control} disabled={disabled} />;
    case "textarea": return <TextareaField field={resolvedField} control={control} disabled={disabled} />;
    case "number": return <NumberField field={resolvedField} control={control} disabled={disabled} />;
    case "number_stepper": return <NumberStepperField field={resolvedField} control={control} disabled={disabled} />;
    case "select": return <SelectField field={resolvedField} control={control} disabled={disabled} />;
    case "multi_select": return <MultiSelectField field={resolvedField} control={control} disabled={disabled} />;
    case "checkbox_group": return <CheckboxGroupField field={resolvedField} control={control} disabled={disabled} />;
    case "inventory_grid": return <InventoryGridField field={resolvedField} control={control} disabled={disabled} stockItems={stockItems} />;
    case "room_grid": return <RoomGridField field={resolvedField} control={control} disabled={disabled} roomCount={roomCount} />;
    case "repeater": return <RepeaterField field={resolvedField} control={control} disabled={disabled} />;
    case "photo": return <PhotoField field={resolvedField} control={control} disabled={disabled} />;
    case "date": return <DateField field={resolvedField} control={control} disabled={disabled} />;
    case "time": return <TimeField field={resolvedField} control={control} disabled={disabled} />;
    default: return <p className="text-sm text-muted-foreground">Unknown field type: {field.type}</p>;
  }
}
