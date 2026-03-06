"use client";

import { useState, useEffect } from "react";
import { SOSDetailsPanelProps } from "@/type";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MapPin,
  Clock,
  Stethoscope,
  ForkKnife,
  Anchor,
  Lightning,
  X,
  TreeStructure,
  Users,
  Phone,
  FirstAid,
  Warning,
  WifiHigh,
  WifiSlash,
  Timer,
} from "@phosphor-icons/react";

// Panel width
const PANEL_WIDTH = 420;

// Time elapsed display component
function TimeElapsed({ date }: { date: Date }) {
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    const updateElapsed = () => {
      const now = Date.now();
      const minutes = Math.floor((now - date.getTime()) / 60000);
      if (minutes < 60) {
        setElapsed(`${minutes} phút trước`);
      } else {
        const hours = Math.floor(minutes / 60);
        if (hours < 24) {
          setElapsed(`${hours} giờ trước`);
        } else {
          const days = Math.floor(hours / 24);
          setElapsed(`${days} ngày trước`);
        }
      }
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 60000);
    return () => clearInterval(interval);
  }, [date]);

  return <span>{elapsed}</span>;
}

function ParsedMessage({ text }: { text?: string | null }) {
  if (!text) return null;
  
  if (!text.includes('|')) {
    return <p className="text-sm leading-relaxed whitespace-pre-wrap">{text}</p>;
  }

  const parts = text.split('|').map(p => p.trim()).filter(Boolean);

  return (
    <div className="space-y-2">
      {parts.map((part, index) => {
        if (part.startsWith('[') && part.endsWith(']')) {
          return (
            <div key={index} className="mb-1">
              <Badge variant="destructive" className="font-bold text-[10px] px-2 py-0 uppercase tracking-wider rounded">
                {part.replace(/[\[\]]/g, '')}
              </Badge>
            </div>
          );
        }

        const colonIndex = part.indexOf(':');
        if (colonIndex > -1) {
          const title = part.slice(0, colonIndex).trim();
          const content = part.slice(colonIndex + 1).trim();
          
          if (title.toLowerCase() === 'bị thương' && content.includes('(') && content.includes(')')) {
            const injuries = content.includes(';') 
              ? content.split(';').map(i => i.trim()).filter(Boolean)
              : [content.trim()];
            
            return (
              <div key={index} className="space-y-2 py-1">
                <span className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                  <FirstAid className="w-4 h-4 text-red-500" /> 
                  {title}:
                </span>
                <div className="flex flex-col gap-2">
                  {injuries.map((injury, i) => {
                    const match = injury.match(/(.*?)\s*\((.*?)\)$/);
                    if (match) {
                      const [, text, severity] = match;
                      let severityColor = "bg-muted text-muted-foreground border-border";
                      const lowerSeverity = severity.toLowerCase();
                      
                      if (lowerSeverity.includes("nghiêm trọng") || lowerSeverity.includes("nặng")) {
                        severityColor = "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/50";
                      } else if (lowerSeverity.includes("trung bình")) {
                        severityColor = "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900/50";
                      } else if (lowerSeverity.includes("nhẹ")) {
                        severityColor = "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-400 dark:border-yellow-900/50";
                      }
                      
                      const infoParts = text.split(':');
                      
                      return (
                        <div key={i} className="flex items-start justify-between gap-3 text-sm bg-background p-2.5 rounded-md border shadow-sm">
                          <div className="flex-1 min-w-0">
                            {infoParts.length > 1 ? (
                              <p className="leading-snug">
                                <span className="font-medium text-foreground">{infoParts[0].trim()}:</span>
                                <span className="text-muted-foreground ml-1.5">{infoParts.slice(1).join(':').trim()}</span>
                              </p>
                            ) : (
                              <p className="leading-snug text-muted-foreground">{text}</p>
                            )}
                          </div>
                          <Badge variant="outline" className={`shrink-0 text-[10.5px] px-2 py-0.5 h-6 font-medium ${severityColor}`}>
                            {severity}
                          </Badge>
                        </div>
                      );
                    }
                    
                    return (
                      <div key={i} className="text-sm text-muted-foreground bg-background p-2.5 rounded-md border shadow-sm">
                        {injury}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }
          
          if (title.toLowerCase() === 'ghi chú') {
            return (
              <div key={index} className="bg-muted/30 rounded-lg p-3.5 mt-2 border border-dashed flex gap-2 items-start">
                <span className="text-[13px] font-semibold text-foreground shrink-0 mt-0.5">{title}:</span>
                <p className="text-[13px] text-muted-foreground italic leading-relaxed">
                  {content}
                </p>
              </div>
            );
          }
          
          return (
            <div key={index} className="text-sm leading-relaxed">
              <span className="font-semibold text-foreground mr-1.5">{title}:</span>
              <span className="text-muted-foreground">{content}</span>
            </div>
          );
        }

        return (
          <div key={index} className="text-sm text-foreground leading-relaxed">
            {part}
          </div>
        );
      })}
    </div>
  );
}

const SOSDetailsPanel = ({
  open,
  onOpenChange,
  sosRequest,
  onProcessSOS,
  isProcessing = false,
  nearbySOSRequests,
  allSOSRequests,
}: SOSDetailsPanelProps) => {
  if (!sosRequest && !open) return null;

  const priorityColors = {
    P1: "bg-red-500",
    P2: "bg-orange-500",
    P3: "bg-yellow-500",
  };

  const statusLabels = {
    PENDING: { text: "Chờ xử lý", variant: "warning" as const },
    ASSIGNED: { text: "Đã phân công", variant: "info" as const },
    RESCUED: { text: "Đã cứu", variant: "success" as const },
  };

  // Handle case when sosRequest is null but panel is open (during close animation)
  if (!sosRequest) {
    return (
      <div
        className={cn(
          "absolute top-0 right-0 h-full z-[1000] transition-all duration-300 ease-in-out",
          open ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        style={{ width: PANEL_WIDTH }}
      />
    );
  }

  // Get risk factors from AI analysis
  const riskFactors = sosRequest.aiAnalysis?.riskFactors || [];

  return (
    <div
      className={cn(
        "absolute top-0 right-0 h-full z-[1000] transition-all duration-300 ease-in-out",
        open
          ? "opacity-100 translate-x-0"
          : "opacity-0 translate-x-full pointer-events-none",
      )}
      style={{ width: PANEL_WIDTH }}
    >
      <div className="h-full bg-background border-l shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-5 pb-4 border-b shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <div
                  className={cn(
                    "w-3 h-3 rounded-full animate-pulse",
                    priorityColors[sosRequest.priority],
                  )}
                />
                SOS #{sosRequest.id}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Chi tiết yêu cầu cứu hộ
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  sosRequest.priority === "P1"
                    ? "p1"
                    : sosRequest.priority === "P2"
                      ? "p2"
                      : "p3"
                }
                className="text-sm px-3"
              >
                {sosRequest.priority}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-muted rounded-lg p-3 text-center">
              <Badge variant={statusLabels[sosRequest.status].variant}>
                {statusLabels[sosRequest.status].text}
              </Badge>
            </div>
            <div className="bg-muted rounded-lg p-3 text-center">
              <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <div className="text-xs text-muted-foreground">
                {sosRequest.peopleCount
                  ? `${sosRequest.peopleCount.adult + sosRequest.peopleCount.child + sosRequest.peopleCount.elderly} người`
                  : "N/A"}
              </div>
            </div>
            <div className="bg-muted rounded-lg p-3 text-center">
              <Timer className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <div className="text-xs text-muted-foreground">
                {sosRequest.waitTimeMinutes != null &&
                sosRequest.waitTimeMinutes > 0 ? (
                  `Chờ ${sosRequest.waitTimeMinutes} phút`
                ) : (
                  <TimeElapsed date={sosRequest.createdAt} />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-5 space-y-5">
            {/* Sender Info */}
            {(sosRequest.senderPhone || sosRequest.senderName) && (
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Người gửi
                </h4>
                <div className="flex items-center justify-between">
                  <div className="text-sm space-y-1">
                    {sosRequest.senderName && (
                      <div className="font-medium">{sosRequest.senderName}</div>
                    )}
                    {sosRequest.senderPhone && (
                      <div className="text-muted-foreground">
                        {sosRequest.senderPhone}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {sosRequest.isOnline ? (
                      <div className="flex items-center gap-1.5 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-md border border-green-200 dark:border-green-800">
                        <WifiHigh
                          className="h-3.5 w-3.5 text-green-600 dark:text-green-400"
                          weight="fill"
                        />
                        <span className="text-xs font-medium text-green-700 dark:text-green-300">
                          Gửi qua Internet
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-md border border-orange-200 dark:border-orange-800">
                        <WifiSlash
                          className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400"
                          weight="fill"
                        />
                        <span className="text-xs font-medium text-orange-700 dark:text-orange-300">
                          Gửi ngoại tuyến (Mesh)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                {sosRequest.hopCount != null && sosRequest.hopCount > 0 && (
                  <div className="text-xs text-muted-foreground mt-2">
                    Tin nhắn qua {sosRequest.hopCount} hop relay
                  </div>
                )}
              </div>
            )}

            {/* People Count Details */}
            {sosRequest.peopleCount && (
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-500" weight="fill" />
                  Số người cần cứu
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-blue-700 dark:text-blue-300">
                      {sosRequest.peopleCount.adult}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Người lớn
                    </div>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-amber-700 dark:text-amber-300">
                      {sosRequest.peopleCount.child}
                    </div>
                    <div className="text-xs text-muted-foreground">Trẻ em</div>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-purple-700 dark:text-purple-300">
                      {sosRequest.peopleCount.elderly}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Người già
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Situation & Conditions */}
            {(sosRequest.situation || sosRequest.canMove !== undefined) && (
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Warning className="h-4 w-4 text-orange-500" weight="fill" />
                  Tình trạng
                </h4>
                <div className="flex flex-wrap gap-2">
                  {sosRequest.situation && (
                    <Badge variant="secondary" className="text-xs">
                      {sosRequest.situation === "TRAPPED"
                        ? "Bị mắc kẹt"
                        : sosRequest.situation === "ISOLATED"
                          ? "Bị cô lập"
                          : sosRequest.situation === "STRANDED"
                            ? "Mắc cạn"
                            : sosRequest.situation}
                    </Badge>
                  )}
                  {sosRequest.canMove === false && (
                    <Badge variant="secondary" className="text-xs">
                      Không thể di chuyển
                    </Badge>
                  )}
                  {sosRequest.hasInjured && (
                    <Badge variant="secondary" className="text-xs">
                      Có người bị thương
                    </Badge>
                  )}
                  {sosRequest.othersAreStable === false && (
                    <Badge variant="secondary" className="text-xs">
                      Tình trạng không ổn định
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Medical Issues */}
            {sosRequest.medicalIssues &&
              sosRequest.medicalIssues.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <FirstAid className="h-4 w-4 text-red-500" weight="fill" />
                    Vấn đề y tế
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {sosRequest.medicalIssues.map((issue, idx) => {
                      const issueLabels: Record<string, string> = {
                        FRACTURE: "Gãy xương",
                        BLEEDING: "Chảy máu",
                        CHRONIC_DISEASE: "Bệnh nền",
                        PREGNANCY: "Thai kỳ",
                        BREATHING_DIFFICULTY: "Khó thở",
                        MOBILITY_IMPAIRMENT: "Khó di chuyển",
                      };
                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-2 px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg"
                        >
                          <Stethoscope className="h-4 w-4" weight="fill" />
                          <span className="text-sm font-medium">
                            {issueLabels[issue] || issue}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            {/* Message */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Nội dung cầu cứu</h4>
              <div className="bg-muted/30 rounded-lg p-4 border shadow-sm">
                <ParsedMessage text={sosRequest.message} />
              </div>
              {sosRequest.additionalDescription && (
                <div className="bg-muted/30 rounded-lg p-3.5 mt-2 border border-dashed flex gap-2 items-start">
                  <span className="text-[13px] font-semibold text-foreground shrink-0 mt-0.5">Ghi chú thêm:</span>
                  <p className="text-[13px] text-muted-foreground italic leading-relaxed">
                    {sosRequest.additionalDescription}
                  </p>
                </div>
              )}
            </div>

            {/* Required Resources */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Yêu cầu hỗ trợ</h4>
              <div className="flex flex-wrap gap-2">
                {sosRequest.needs.medical && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg">
                    <Stethoscope className="h-4 w-4" weight="fill" />
                    <span className="text-sm font-medium">Y tế khẩn cấp</span>
                  </div>
                )}
                {sosRequest.needs.boat && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg">
                    <Anchor className="h-4 w-4" weight="fill" />
                    <span className="text-sm font-medium">Cần phương tiện</span>
                  </div>
                )}
                {sosRequest.needs.food && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-lg">
                    <ForkKnife className="h-4 w-4" weight="fill" />
                    <span className="text-sm font-medium">
                      Cần thực phẩm/nước
                    </span>
                  </div>
                )}
                {!sosRequest.needs.medical &&
                  !sosRequest.needs.boat &&
                  !sosRequest.needs.food && (
                    <div className="text-sm text-muted-foreground">
                      Không có yêu cầu cụ thể
                    </div>
                  )}
              </div>
            </div>

            {/* AI Risk Analysis */}
            {riskFactors.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Lightning
                    className="h-4 w-4 text-yellow-500"
                    weight="fill"
                  />
                  Phân tích AI
                </h4>
                <div className="flex flex-wrap gap-2">
                  {riskFactors.map((factor, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {factor}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Same-group SOS requests for cluster selection */}
            {(() => {
              if (nearbySOSRequests.length === 0) return null;
              return (
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <TreeStructure
                      className="h-4 w-4 text-violet-500"
                      weight="fill"
                    />
                    SOS gần đây trong bán kính 1 km ({nearbySOSRequests.length})
                  </h4>
                  <div className="space-y-2">
                    {nearbySOSRequests.map((sos) => (
                      <div
                        key={sos.id}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-violet-50/50 dark:bg-violet-900/10 border-violet-200 dark:border-violet-800/30"
                      >
                        <MapPin
                          className={cn(
                            "h-4 w-4 shrink-0",
                            sos.priority === "P1"
                              ? "text-red-500"
                              : sos.priority === "P2"
                                ? "text-orange-500"
                                : "text-yellow-500",
                          )}
                          weight="fill"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                sos.priority === "P1"
                                  ? "p1"
                                  : sos.priority === "P2"
                                    ? "p2"
                                    : "p3"
                              }
                              className="text-[10px] px-1.5 py-0 h-5"
                            >
                              {sos.priority}
                            </Badge>
                            <span className="text-xs font-mono text-muted-foreground">
                              SOS #{sos.id}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                            {sos.message}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </ScrollArea>

        {/* Footer - only show action button for PENDING requests */}
        {sosRequest.status === "PENDING" && nearbySOSRequests.length > 0 && (
          <div className="p-4 border-t shrink-0">
            <Button
              className="w-full bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 shadow-lg shadow-violet-500/20"
              size="lg"
              onClick={() =>
                onProcessSOS([
                  sosRequest.id,
                  ...nearbySOSRequests.map((s) => s.id),
                ])
              }
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5 mr-2"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Đang gom cụm & AI phân tích...
                </>
              ) : (
                <>
                  <TreeStructure className="h-5 w-5 mr-2" weight="fill" />
                  Gom cụm & AI phân tích ({nearbySOSRequests.length + 1} SOS)
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SOSDetailsPanel;
