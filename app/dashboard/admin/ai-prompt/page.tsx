"use client";

import { useEffect, useState } from "react";
import { getDashboardData } from "@/lib/mock-data/admin-dashboard";
import {
  mockAIPrompts,
  mockPromptTemplates,
} from "@/lib/mock-data/admin-ai-prompt";
import { Button } from "@/components/ui/button";
import { Plus } from "@phosphor-icons/react";
import { DashboardSkeleton } from "@/components/admin";
import { DashboardLayout } from "@/components/admin/dashboard";
import {
  PromptEditor,
  PromptPreview,
  PromptTemplates,
} from "@/components/admin/ai-prompt";

const AIPromptPage = () => {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [selectedPrompt, setSelectedPrompt] = useState(mockAIPrompts[0]);
  const [showEditor, setShowEditor] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getDashboardData();
        setDashboardData(data);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading || !dashboardData) {
    return (
      <DashboardLayout
        favorites={[]}
        projects={[]}
        cloudStorage={{ used: 0, total: 0, percentage: 0, unit: "GB" }}
      >
        <DashboardSkeleton variant="editor" />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      favorites={dashboardData.favorites}
      projects={dashboardData.projects}
      cloudStorage={dashboardData.cloudStorage}
    >
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Cấu hình AI Prompt
            </h1>
            <p className="text-muted-foreground">
              Quản lý và chỉnh sửa AI prompts
            </p>
          </div>
          <Button onClick={() => setShowEditor(true)}>
            <Plus size={16} className="mr-2" />
            Tạo Prompt mới
          </Button>
        </div>

        {showEditor && (
          <PromptEditor
            onSave={(prompt) => {
              console.log("Save prompt:", prompt);
              setShowEditor(false);
            }}
            onCancel={() => setShowEditor(false)}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <PromptTemplates
              templates={mockPromptTemplates}
              onUseTemplate={(template) => {
                console.log("Use template:", template);
              }}
            />
          </div>
          <div>
            {selectedPrompt && (
              <PromptPreview
                prompt={selectedPrompt.prompt}
                variables={selectedPrompt.variables}
              />
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AIPromptPage;
