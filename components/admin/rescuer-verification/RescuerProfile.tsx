"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RescuerProfileProps } from "@/type";

const RescuerProfile = ({ verification }: RescuerProfileProps) => {
  return (
    <Card className="border border-border/50">
      <CardHeader>
        <CardTitle>Thông tin cứu hộ viên</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-semibold text-lg text-foreground mb-4">
            {verification.rescuerName}
          </h3>
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-medium text-foreground/80">Email:</span>{" "}
              <span className="text-foreground">{verification.email}</span>
            </p>
            <p>
              <span className="font-medium text-foreground/80">SĐT:</span>{" "}
              <span className="text-foreground">{verification.phone}</span>
            </p>
            <p>
              <span className="font-medium text-foreground/80">Khu vực:</span>{" "}
              <span className="text-foreground">{verification.region}</span>
            </p>
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-foreground mb-2">Kinh nghiệm</h4>
          <p className="text-sm text-foreground/80">
            {verification.profile.experience}
          </p>
        </div>

        <div>
          <h4 className="font-semibold text-foreground mb-2">Kỹ năng</h4>
          <div className="flex flex-wrap gap-2">
            {verification.profile.skills.map((skill, idx) => (
              <Badge key={idx} variant="outline">
                {skill}
              </Badge>
            ))}
          </div>
        </div>

        {verification.profile.certifications.length > 0 && (
          <div>
            <h4 className="font-semibold text-foreground mb-2">Chứng chỉ</h4>
            <div className="flex flex-wrap gap-2">
              {verification.profile.certifications.map((cert, idx) => (
                <Badge
                  key={idx}
                  className="bg-blue-500/10 text-blue-700 dark:text-blue-400"
                >
                  {cert}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {verification.profile.previousWork && (
          <div>
            <h4 className="font-semibold text-foreground mb-2">
              Công việc trước đây
            </h4>
            <p className="text-sm text-foreground/80">
              {verification.profile.previousWork}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RescuerProfile;
