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
import { Input } from "@/components/ui/input";

interface DateTimePickerInputProps {
  /** Value in "yyyy-MM-ddTHH:mm" format (datetime-local) */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hasError?: boolean;
  className?: string;
  disabled?: boolean;
}

/**
 * Date + time picker.
 * Stores/returns value as "yyyy-MM-ddTHH:mm" string.
 * Displays as "dd/MM/yyyy HH:mm".
 */
export function DateTimePickerInput({
  value,
  onChange,
  placeholder = "Chọn ngày giờ...",
  hasError = false,
  className,
  disabled,
}: DateTimePickerInputProps) {
  const [open, setOpen] = React.useState(false);

  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");
  const currentTimeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  // Split value into date & time parts
  const [datePart, timePart] = React.useMemo(() => {
    if (!value) return ["", "00:00"];
    const idx = value.indexOf("T");
    if (idx >= 0) return [value.slice(0, idx), value.slice(idx + 1, idx + 6) || "00:00"];
    return [value, "00:00"];
  }, [value]);

  const [localTime, setLocalTime] = React.useState(timePart);

  // Sync localTime when timePart changes from outside
  React.useEffect(() => {
    setLocalTime(timePart);
  }, [timePart]);

  const selectedDate = React.useMemo(() => {
    if (!datePart) return undefined;
    const d = parse(datePart, "yyyy-MM-dd", new Date());
    return isValid(d) ? d : undefined;
  }, [datePart]);

  const isToday = datePart === todayStr;

  // Max time for <input type="time">: if today is selected, cap at current time
  const maxTime = isToday ? currentTimeStr : undefined;

  const displayValue = React.useMemo(() => {
    if (!selectedDate) return "";
    const timeDisplay = localTime || "00:00";
    return `${format(selectedDate, "dd/MM/yyyy", { locale: vi })} ${timeDisplay}`;
  }, [selectedDate, localTime]);

  const handleSelectDate = (date: Date | undefined) => {
    if (!date) {
      onChange("");
      return;
    }
    const newDatePart = format(date, "yyyy-MM-dd");
    const isSelectedToday = newDatePart === todayStr;
    // If switching to today and current time would be in future, clamp to now
    const clampedTime = (isSelectedToday && localTime > currentTimeStr) ? currentTimeStr : (localTime || "00:00");
    setLocalTime(clampedTime);
    onChange(`${newDatePart}T${clampedTime}`);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = e.target.value;
    // If today is selected, don't allow future times
    const safeTime = (isToday && t > currentTimeStr) ? currentTimeStr : t;
    setLocalTime(safeTime);
    if (datePart) {
      onChange(`${datePart}T${safeTime}`);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLocalTime("00:00");
    onChange("");
  };

  const handleNow = () => {
    const n = new Date();
    const newDatePart = format(n, "yyyy-MM-dd");
    const newTime = `${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`;
    setLocalTime(newTime);
    onChange(`${newDatePart}T${newTime}`);
    setOpen(false);
  };

  const handleConfirm = () => setOpen(false);

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
            {displayValue || placeholder}
          </span>
          {selectedDate && (
            <X
              className="ml-auto h-3 w-3 shrink-0 opacity-40 hover:opacity-100"
              onClick={handleClear}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelectDate}
          defaultMonth={selectedDate}
          locale={vi}
          disabled={{ after: now }}
          initialFocus
        />
        {/* Time picker row */}
        <div className="border-t px-3 py-2 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground shrink-0">Giờ:</span>
            <Input
              type="time"
              value={localTime}
              max={maxTime}
              onChange={handleTimeChange}
              className="h-7 text-sm flex-1 px-2 [&::-webkit-calendar-picker-indicator]:ml-auto [&::-webkit-calendar-picker-indicator]:cursor-pointer"
            />
          </div>
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 text-muted-foreground"
              onClick={handleClear}
            >
              Xóa
            </Button>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={handleNow}
              >
                Bây giờ
              </Button>
              <Button
                size="sm"
                className="text-xs h-7"
                onClick={handleConfirm}
                disabled={!selectedDate}
              >
                Xong
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
