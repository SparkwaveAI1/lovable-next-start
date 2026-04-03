import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Props = {
  value: string; // 24h format: "HH:MM" or ""
  onChange: (val: string) => void;
  className?: string;
  id?: string;
  disabled?: boolean;
};

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

function to12h(h24: number) {
  const meridiem = h24 >= 12 ? "PM" : "AM" as const;
  let h = h24 % 12;
  if (h === 0) h = 12;
  return { hour12: h, meridiem } as const;
}

function to24h(hour12: number, meridiem: "AM" | "PM") {
  const h = hour12 % 12;
  return meridiem === "PM" ? h + 12 : (hour12 === 12 ? 0 : h);
}

export default function SimpleTimeInput({ value, onChange, className, id, disabled }: Props) {
  const [hour, setHour] = useState<string>(""); // 1-12
  const [minute, setMinute] = useState<string>(""); // 00-59
  const [meridiem, setMeridiem] = useState<"AM" | "PM">("AM");

  // Sync local state when external value changes
  useEffect(() => {
    if (TIME_RE.test(value)) {
      const [hStr, mStr] = value.split(":");
      const h24 = parseInt(hStr, 10);
      const { hour12, meridiem } = to12h(h24);
      setHour(String(hour12));
      setMinute(mStr);
      setMeridiem(meridiem);
    } else if (value === "") {
      // Keep partial user input; do not reset unless explicitly cleared
    }
  }, [value]);

  const emitIfValid = (nextHour: string, nextMinute: string, nextMeridiem: "AM" | "PM") => {
    const h = Number(nextHour);
    const m = Number(nextMinute);
    const hourOk = nextHour.length > 0 && h >= 1 && h <= 12;
    const minOk = nextMinute.length === 2 && m >= 0 && m <= 59;

    if (hourOk && minOk) {
      const h24 = to24h(h, nextMeridiem);
      const val = `${String(h24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      onChange(val);
    } else {
      onChange("");
    }
  };

  const onHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, "").slice(0, 2);
    setHour(raw);
    emitIfValid(raw, minute, meridiem);
  };
  const onHourBlur = () => {
    if (!hour) return;
    const h = Math.max(1, Math.min(12, Number(hour)));
    const normalized = String(h);
    setHour(normalized);
    emitIfValid(normalized, minute, meridiem);
  };

  const onMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, "").slice(0, 2);
    setMinute(raw);
    emitIfValid(hour, raw, meridiem);
  };
  const onMinuteBlur = () => {
    if (minute.length === 0) return;
    const m = Math.max(0, Math.min(59, Number(minute)));
    const normalized = String(m).padStart(2, "0");
    setMinute(normalized);
    emitIfValid(hour, normalized, meridiem);
  };

  const onMeridiemChange = (v: string) => {
    const next = (v === "PM" ? "PM" : "AM") as "AM" | "PM";
    setMeridiem(next);
    emitIfValid(hour, minute, next);
  };

  return (
    <div className={cn("flex items-center gap-2", className)} id={id}>
      <div className="w-14">
        <Input
          inputMode="numeric"
          placeholder="HH"
          value={hour}
          onChange={onHourChange}
          onBlur={onHourBlur}
          disabled={disabled}
          aria-label="Hour"
        />
      </div>
      <span className="select-none">:</span>
      <div className="w-14">
        <Input
          inputMode="numeric"
          placeholder="MM"
          value={minute}
          onChange={onMinuteChange}
          onBlur={onMinuteBlur}
          disabled={disabled}
          aria-label="Minute"
        />
      </div>
      <div className="w-24">
        <Select value={meridiem} onValueChange={onMeridiemChange} disabled={disabled}>
          <SelectTrigger aria-label="AM/PM">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AM">AM</SelectItem>
            <SelectItem value="PM">PM</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
