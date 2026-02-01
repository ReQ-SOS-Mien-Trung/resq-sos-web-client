"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Play } from "@phosphor-icons/react";
import { PromptPreviewProps } from "@/type";

const PromptPreview = ({ prompt, variables, onTest }: PromptPreviewProps) => {
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [output, setOutput] = useState<string>("");

  const handleTest = () => {
    let result = prompt;
    variables.forEach((variable) => {
      const value = inputs[variable] || `{${variable}}`;
      result = result.replace(new RegExp(`\\{${variable}\\}`, "g"), value);
    });
    setOutput(result);
    onTest?.(inputs);
  };

  return (
    <Card className="border border-border/50">
      <CardHeader>
        <CardTitle>Preview & Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {variables.length > 0 && (
          <div className="space-y-3">
            <Label>Nhập giá trị cho các biến:</Label>
            {variables.map((variable) => (
              <div key={variable}>
                <Label htmlFor={variable}>{variable}</Label>
                <Input
                  id={variable}
                  value={inputs[variable] || ""}
                  onChange={(e) =>
                    setInputs({ ...inputs, [variable]: e.target.value })
                  }
                  placeholder={`Nhập giá trị cho ${variable}`}
                  className="mt-1"
                />
              </div>
            ))}
            <Button onClick={handleTest} className="w-full">
              <Play size={16} className="mr-2" />
              Test Prompt
            </Button>
          </div>
        )}

        {output && (
          <div>
            <Label>Kết quả:</Label>
            <Textarea
              value={output}
              readOnly
              rows={6}
              className="mt-1 font-mono text-sm bg-muted"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PromptPreview;
