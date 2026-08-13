"use client";

import * as React from "react";

import { Input } from "@/components/ui/field";
import { formatPhone, onlyDigits } from "@/lib/format";

/**
 * Campo de telefone com mascara progressiva. Mantem apenas digitos no estado e
 * formata na exibicao, entao o valor enviado ao servidor nunca vem sujo.
 */
export function PhoneInput({
  defaultValue,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "defaultValue"> & {
  defaultValue?: string | null;
}) {
  const [value, setValue] = React.useState(() => formatPhone(defaultValue ?? ""));

  return (
    <Input
      {...props}
      type="tel"
      inputMode="numeric"
      value={value}
      placeholder="(11) 98765-4321"
      onChange={(event) => {
        const digits = onlyDigits(event.target.value).slice(0, 11);
        setValue(digits.length >= 10 ? formatPhone(digits) : partialMask(digits));
      }}
    />
  );
}

function partialMask(digits: string): string {
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}
