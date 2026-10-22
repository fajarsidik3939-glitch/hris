import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Label + input + pesan error yang terhubung untuk screen reader. */
export function FormField({
  name,
  label,
  errors,
  ...props
}: React.ComponentProps<"input"> & { name: string; label: string; errors?: string[] }) {
  const errorId = `${name}-error`;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        aria-invalid={errors ? true : undefined}
        aria-describedby={errors ? errorId : undefined}
        className="h-11 text-base md:text-sm"
        {...props}
      />
      {errors && (
        <p id={errorId} className="text-sm text-destructive">
          {errors[0]}
        </p>
      )}
    </div>
  );
}
