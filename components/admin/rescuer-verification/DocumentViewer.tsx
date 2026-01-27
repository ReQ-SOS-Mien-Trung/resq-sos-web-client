"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, FileText, Download } from "lucide-react";
import type { RescuerVerification } from "@/types/admin-pages";

interface DocumentViewerProps {
  verification: RescuerVerification;
  onVerify?: (docId: string) => void;
  onReject?: (docId: string) => void;
}

export function DocumentViewer({
  verification,
  onVerify,
  onReject,
}: DocumentViewerProps) {
  const getDocTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      id: "CMND/CCCD",
      certificate: "Chứng chỉ",
      license: "Giấy phép",
      "background-check": "Lý lịch tư pháp",
      other: "Khác",
    };
    return labels[type] || type;
  };

  return (
    <Card className="border border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Tài liệu
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {verification.documents.map((doc) => (
            <div
              key={doc.id}
              className="p-4 border border-border/50 rounded-lg"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold text-foreground">
                      {doc.name}
                    </h4>
                    <Badge variant="outline">
                      {getDocTypeLabel(doc.type)}
                    </Badge>
                    {doc.verified ? (
                      <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Đã xác minh
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400">
                        Chưa xác minh
                      </Badge>
                    )}
                  </div>
                  {doc.verified && doc.verifiedAt && (
                    <p className="text-xs text-muted-foreground">
                      Xác minh bởi {doc.verifiedBy} vào{" "}
                      {new Date(doc.verifiedAt).toLocaleString("vi-VN")}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href={doc.url} target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4 mr-1" />
                      Xem
                    </a>
                  </Button>
                  {!doc.verified && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onVerify?.(doc.id)}
                        className="text-emerald-600 dark:text-emerald-400"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onReject?.(doc.id)}
                        className="text-rose-600 dark:text-rose-400"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
