import React, { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { Clock, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DaySchedule {
  isOpen: boolean;
  slots: { open: string; close: string }[];
}

interface OpeningHoursData {
  [key: string]: DaySchedule;
}

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

interface OpeningHoursInputProps {
  value: string | OpeningHoursData;
  onChange: (value: OpeningHoursData) => void;
}

export const OpeningHoursInput: React.FC<OpeningHoursInputProps> = ({ value, onChange }) => {
  // We'll manage a single "Global" schedule in the UI, but it maps to all days in the data
  const [globalSchedule, setGlobalSchedule] = useState<DaySchedule>(() => {
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        if (typeof parsed === "object" && parsed !== null) {
          // Take Monday as representative for the UI
          return parsed.monday || { isOpen: true, slots: [{ open: "09:00", close: "22:00" }] };
        }
      } catch (e) {}
    } else if (typeof value === "object" && value !== null) {
      return value.monday || { isOpen: true, slots: [{ open: "09:00", close: "22:00" }] };
    }
    return { isOpen: true, slots: [{ open: "09:00", close: "22:00" }] };
  });

  const updateAllDays = (schedule: DaySchedule) => {
    const newData: OpeningHoursData = {};
    DAYS.forEach(day => {
      newData[day] = { ...schedule };
    });
    onChange(newData);
  };

  const handleToggle = (checked: boolean) => {
    const newSchedule = { ...globalSchedule, isOpen: checked };
    setGlobalSchedule(newSchedule);
    updateAllDays(newSchedule);
  };

  const handleSlotChange = (index: number, field: "open" | "close", time: string) => {
    const newSlots = [...globalSchedule.slots];
    newSlots[index] = { ...newSlots[index], [field]: time };
    
    const newSchedule = { ...globalSchedule, slots: newSlots };
    setGlobalSchedule(newSchedule);
    updateAllDays(newSchedule);
  };

  const addSlot = () => {
    const newSchedule = {
      ...globalSchedule,
      slots: [...globalSchedule.slots, { open: "09:00", close: "22:00" }],
    };
    setGlobalSchedule(newSchedule);
    updateAllDays(newSchedule);
  };

  const removeSlot = (index: number) => {
    if (globalSchedule.slots.length <= 1) return;
    const newSlots = globalSchedule.slots.filter((_, i) => i !== index);
    const newSchedule = { ...globalSchedule, slots: newSlots };
    setGlobalSchedule(newSchedule);
    updateAllDays(newSchedule);
  };

  return (
    <div className="space-y-3 w-full">
      <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 transition-all shadow-sm">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2.5">
            <div className={cn(
              "w-2 h-2 rounded-full",
              globalSchedule.isOpen ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" : "bg-muted"
            )} />
            <span className={cn("font-bold text-base", !globalSchedule.isOpen && "text-muted-foreground")}>
              {globalSchedule.isOpen ? "Open Daily" : "Closed Daily"}
            </span>
          </div>
          <div className="flex items-center gap-2.5 bg-background/50 px-2.5 py-1 rounded-full border border-border/50 scale-90 origin-right">
            <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground mr-1">
              {globalSchedule.isOpen ? "ON" : "OFF"}
            </span>
            <Switch
              checked={globalSchedule.isOpen}
              onCheckedChange={handleToggle}
              className="scale-90"
            />
          </div>
        </div>

        {globalSchedule.isOpen && (
          <div className="space-y-2.5 animate-in fade-in duration-300">
            {globalSchedule.slots.map((slot, index) => (
              <div key={index} className="flex items-center gap-2.5">
                <div className="flex-1 flex items-center gap-2 bg-background p-0.5 rounded-lg border border-border/50">
                  <div className="flex-1 flex flex-col px-2.5 py-0.5">
                    <span className="text-[8px] font-black text-muted-foreground uppercase mb-0">Open From</span>
                    <input
                      type="time"
                      value={slot.open}
                      onChange={(e) => handleSlotChange(index, "open", e.target.value)}
                      className="bg-transparent border-none p-0 text-[13px] font-bold focus:ring-0 w-full leading-none"
                    />
                  </div>
                  <div className="h-4 w-px bg-border/50" />
                  <div className="flex-1 flex flex-col px-2.5 py-0.5">
                    <span className="text-[8px] font-black text-muted-foreground uppercase mb-0">Close At</span>
                    <input
                      type="time"
                      value={slot.close}
                      onChange={(e) => handleSlotChange(index, "close", e.target.value)}
                      className="bg-transparent border-none p-0 text-[13px] font-bold focus:ring-0 w-full leading-none"
                    />
                  </div>
                </div>
                
                <div className="flex gap-1 flex-shrink-0">
                  {globalSchedule.slots.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => removeSlot(index)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  
                  {index === globalSchedule.slots.length - 1 && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 rounded-lg text-primary border-primary/20 hover:bg-primary/5 hover:border-primary/40"
                      onClick={() => addSlot()}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!globalSchedule.isOpen && (
          <div className="text-sm text-muted-foreground text-center py-4 border-2 border-dashed border-muted-foreground/10 rounded-xl bg-background/20">
            Business is closed all days of the week.
          </div>
        )}
      </div>
      
      <p className="text-[10px] text-muted-foreground/60 text-center italic mt-2 py-1 px-4">
        Note: These hours apply to every day of the week automatically.
      </p>
    </div>
  );
};
