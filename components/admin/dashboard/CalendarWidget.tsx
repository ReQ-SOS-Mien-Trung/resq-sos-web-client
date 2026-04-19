"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CaretLeft,
  CaretRight,
  DotsThreeVertical,
} from "@phosphor-icons/react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  getDay,
} from "date-fns";
import { weekDays } from "@/lib/constants";
import { CalendarWidgetProps } from "@/type";
import { getMonthIndex } from "@/lib/getMonthIndex";

const CalendarWidget = ({ data }: CalendarWidgetProps) => {
  const [currentDate, setCurrentDate] = useState(
    new Date(data.currentYear, getMonthIndex(data.currentMonth), 1),
  );

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get first day of week for the month
  const firstDayOfWeek = getDay(monthStart);

  // Create array with empty cells for days before month starts
  const calendarDays = Array(firstDayOfWeek).fill(null).concat(daysInMonth);

  const highlightedDate = new Date(
    data.currentYear,
    getMonthIndex(data.currentMonth),
    data.highlightedDate,
  );

  const goToPreviousMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1),
    );
  };

  const goToNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1),
    );
  };

  const getMeetingPlatformStyles = (platform: string) => {
    switch (platform) {
      case "Google Meet":
        return "bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-400 dark:hover:bg-blue-900/50";
      case "Slack":
        return "bg-purple-50 text-purple-600 hover:bg-purple-100 dark:bg-purple-950/50 dark:text-purple-400 dark:hover:bg-purple-900/50";
      case "Zoom":
        return "bg-cyan-50 text-cyan-600 hover:bg-cyan-100 dark:bg-cyan-950/50 dark:text-cyan-400 dark:hover:bg-cyan-900/50";
      default:
        return "bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-gray-900/50 dark:text-gray-400";
    }
  };

  return (
    <Card className="border border-border/50 overflow-hidden hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">
            Lịch hoạt động
          </CardTitle>
          <DotsThreeVertical
            size={16}
            className="text-muted-foreground/50 cursor-pointer hover:text-muted-foreground transition-colors"
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Month Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-muted/80 transition-colors"
              onClick={goToPreviousMonth}
            >
              <CaretLeft size={16} />
            </Button>
            <span className="text-sm font-semibold">
              {format(currentDate, "MMMM yyyy")}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-muted/80 transition-colors"
              onClick={goToNextMonth}
            >
              <CaretRight size={16} />
            </Button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((day) => (
              <div
                key={day}
                className="text-center text-sm tracking-tighter font-medium text-muted-foreground py-2"
              >
                {day}
              </div>
            ))}
            {calendarDays.map((day, index) => {
              if (!day) {
                return <div key={`empty-${index}`} className="h-9" />;
              }
              const isHighlighted = isSameDay(day, highlightedDate);
              const isToday = isSameDay(day, new Date());
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "h-9 flex items-center justify-center text-sm rounded-full cursor-pointer transition-all duration-200",
                    isHighlighted
                      ? "bg-primary text-primary-foreground font-semibold shadow-md shadow-primary/30 scale-110"
                      : isToday
                        ? "bg-primary/10 text-primary font-medium ring-1 ring-primary/20"
                        : "hover:bg-muted/80 hover:scale-105",
                  )}
                >
                  {format(day, "d")}
                </div>
              );
            })}
          </div>

          {/* Meetings List */}
          <div className="space-y-3 pt-4 border-t border-border/50">
            {data.meetings.map((meeting, index) => (
              <div
                key={meeting.id}
                className="group flex items-start justify-between gap-3 p-3 rounded-xl border border-border/30 bg-linear-to-r from-card to-muted/20 hover:from-muted/30 hover:to-muted/40 hover:border-border/50 transition-all duration-300 cursor-pointer animate-in fade-in slide-in-from-bottom-2"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm mb-0.5 group-hover:text-primary transition-colors">
                    {meeting.title}
                  </div>
                  <div className="text-sm tracking-tighter text-muted-foreground">
                    {meeting.time}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex -space-x-2">
                      {Array.from({
                        length: Math.min(meeting.participants, 3),
                      }).map((_, i) => (
                        <div
                          key={i}
                          className={cn(
                            "h-6 w-6 rounded-full border-2 border-background flex items-center justify-center text-sm tracking-tighter font-medium ring-2 ring-background transition-transform group-hover:scale-110",
                            i === 0 && "bg-violet-500 text-white",
                            i === 1 && "bg-pink-500 text-white",
                            i === 2 && "bg-amber-500 text-white",
                          )}
                          style={{ transitionDelay: `${i * 50}ms` }}
                        >
                          {String.fromCharCode(65 + i)}
                        </div>
                      ))}
                    </div>
                    {meeting.participants > 3 && (
                      <span className="text-sm tracking-tighter text-muted-foreground font-medium bg-muted px-1.5 py-0.5 rounded-full">
                        +{meeting.participants - 3}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "text-sm tracking-tighter font-medium transition-all duration-200 group-hover:shadow-sm",
                    getMeetingPlatformStyles(meeting.platform),
                  )}
                  onClick={() =>
                    meeting.link && window.open(meeting.link, "_blank")
                  }
                >
                  On {meeting.platform}
                  <CaretRight className="h-3 w-3 ml-1 group-hover:translate-x-0.5 transition-transform" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CalendarWidget;
