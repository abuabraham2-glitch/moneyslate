import * as React from "react";
import { Input } from "@/components/ui/input";
import { formatPhone } from "@/lib/phone";

type Props = Omit<React.ComponentProps<"input">, "value" | "onChange"> & {
  value?: string;
  onChange: (formatted: string) => void;
};

export const PhoneInput = React.forwardRef<HTMLInputElement, Props>(
  ({ value, onChange, ...rest }, ref) => (
    <Input
      ref={ref}
      type="tel"
      inputMode="tel"
      placeholder="(555) 123-4567"
      value={formatPhone(value || "")}
      onChange={(e) => onChange(formatPhone(e.target.value))}
      {...rest}
    />
  )
);
PhoneInput.displayName = "PhoneInput";
