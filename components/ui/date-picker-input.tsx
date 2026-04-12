"use client";

import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { vi } from "date-fns/locale";
import { CalendarIcon, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerInputProps {
  /** Value in yyyy-MM-dd format */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hasError?: boolean;
  className?: string;
  disabled?: boolean;
  /** Earliest selectable date in yyyy-MM-dd format */
  minDate?: string;
  /** Latest selectable date in yyyy-MM-dd format */
  maxDate?: string;
}

/**
 * Reusable date picker using react-day-picker Calendar + Popover.
 * Stores/returns value as "yyyy-MM-dd" string (same shape as <input type="date">).
 */
export function DatePickerInput({
  value,
  onChange,
  placeholder = "Chọn ngày...",
  hasError = false,
  className,
  disabled,
  minDate,
  maxDate,
}: DatePickerInputProps) {
  const [open, setOpen] = React.useState(false);

  // Parse yyyy-MM-dd → Date (for Calendar)
  const selectedDate = React.useMemo(() => {
    if (!value) return undefined;
    const d = parse(value, "yyyy-MM-dd", new Date());
    return isValid(d) ? d : undefined;
  }, [value]);

  const parsedMinDate = React.useMemo(() => {
    if (!minDate) return undefined;
    const d = parse(minDate, "yyyy-MM-dd", new Date());
    return isValid(d) ? d : undefined;
  }, [minDate]);

  const parsedMaxDate = React.useMemo(() => {
    if (!maxDate) return undefined;
    const d = parse(maxDate, "yyyy-MM-dd", new Date());
    return isValid(d) ? d : undefined;
  }, [maxDate]);

  const handleSelect = (date: Date | undefined) => {
    onChange(date ? format(date, "yyyy-MM-dd") : "");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-8 w-full justify-start gap-2 px-3 text-sm font-normal",
            !selectedDate && "text-muted-foreground",
            hasError && "border-red-500 focus-visible:ring-red-500",
            className,
          )}
        >
          <CalendarIcon className="h-3.5 w-3.5 shrink-0 opacity-60" />
          <span className="truncate">
            {selectedDate
              ? format(selectedDate, "dd/MM/yyyy", { locale: vi })
              : placeholder}
          </span>
          {selectedDate && (
            <X
              className="ml-auto h-3 w-3 shrink-0 opacity-40 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          defaultMonth={selectedDate}
          locale={vi}
          initialFocus
          disabled={[
            ...(parsedMinDate ? [{ before: parsedMinDate }] : []),
            ...(parsedMaxDate ? [{ after: parsedMaxDate }] : []),
          ]}
        />
        <div className="flex items-center justify-between border-t px-3 py-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7 text-muted-foreground"
            onClick={() => { onChange(""); setOpen(false); }}
          >
            Xóa
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7"
            onClick={() => { handleSelect(new Date()); }}
          >
            Hôm nay
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
