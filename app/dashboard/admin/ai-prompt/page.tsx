"use client";

import { useEffect, useState, useCallback } from "react";
import { getDashboardData } from "@/lib/mock-data/admin-dashboard";
import { Button } from "@/components/ui/button";
import { Plus, ArrowCounterClockwise } from "@phosphor-icons/react";
import { DashboardSkeleton } from "@/components/admin";
import { DashboardLayout } from "@/components/admin/dashboard";
import {
  PromptEditor,
  PromptList,
  PromptDetailPanel,
  DeletePromptDialog,
} from "@/components/admin/ai-prompt";
import {
  usePrompts,
  usePromptById,
  useCreatePrompt,
  useUpdatePrompt,
  useDeletePrompt,
} from "@/services/prompt/hooks";
import type {
  PromptEntity,
  PromptDetailEntity,
  CreatePromptRequest,
  UpdatePromptRequest,
} from "@/services/prompt/type";
import type { EditorMode } from "@/type";

const AIPromptPage = () => {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  // Prompt state
  const [selectedPromptId, setSelectedPromptId] = useState<number | null>(null);
  const [editorMode, setEditorMode] = useState<EditorMode>("closed");
  const [editingPrompt, setEditingPrompt] = useState<PromptDetailEntity | null>(
    null,
  );
  const [deletingPrompt, setDeletingPrompt] = useState<PromptEntity | null>(
    null,
  );

  // API hooks
  const {
    data: promptsData,
    isLoading: promptsLoading,
    refetch: refetchPrompts,
  } = usePrompts({ params: { pageSize: 50 } });

  const { data: promptDetail, isLoading: detailLoading } = usePromptById(
    selectedPromptId ?? 0,
    !!selectedPromptId,
  );

  const createMutation = useCreatePrompt();
  const updateMutation = useUpdatePrompt();
  const deleteMutation = useDeletePrompt();

  // Dashboard layout data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getDashboardData();
        setDashboardData(data);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setDashboardLoading(false);
      }
    };
    fetchData();
  }, []);

  // Auto-select first prompt when data loads
  useEffect(() => {
    if (promptsData?.items?.length && !selectedPromptId) {
      setSelectedPromptId(promptsData.items[0].id);
    }
  }, [promptsData, selectedPromptId]);

  // --- Handlers ---

  const closeEditor = useCallback(() => {
    setEditorMode("closed");
    setEditingPrompt(null);
  }, []);

  const handleSelectPrompt = useCallback(
    (prompt: PromptEntity) => {
      setSelectedPromptId(prompt.id);
      closeEditor();
    },
    [closeEditor],
  );

  const handleCreateNew = useCallback(() => {
    setEditingPrompt(null);
    setEditorMode("creating");
  }, []);

  const handleEdit = useCallback((prompt: PromptEntity) => {
    setSelectedPromptId(prompt.id);
    setEditorMode("editing");
  }, []);

  // Populate editor with detail data when editing (skip when creating)
  useEffect(() => {
    if (
      editorMode === "editing" &&
      selectedPromptId &&
      promptDetail &&
      !editingPrompt
    ) {
      setEditingPrompt(promptDetail);
    }
  }, [editorMode, selectedPromptId, promptDetail, editingPrompt]);

  const handleSave = useCallback(
    async (data: CreatePromptRequest | UpdatePromptRequest) => {
      try {
        if (editingPrompt) {
          await updateMutation.mutateAsync({
            id: editingPrompt.id,
            data: data as UpdatePromptRequest,
          });
        } else {
          await createMutation.mutateAsync(data as CreatePromptRequest);
        }
        closeEditor();
      } catch (error) {
        console.error("Error saving prompt:", error);
      }
    },
    [editingPrompt, updateMutation, createMutation, closeEditor],
  );

  const handleDelete = useCallback(async () => {
    if (!deletingPrompt) return;
    try {
      await deleteMutation.mutateAsync(deletingPrompt.id);
      if (selectedPromptId === deletingPrompt.id) {
        setSelectedPromptId(null);
      }
      setDeletingPrompt(null);
    } catch (error) {
      console.error("Error deleting prompt:", error);
    }
  }, [deletingPrompt, deleteMutation, selectedPromptId]);

  if (dashboardLoading || !dashboardData) {
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

  const prompts = promptsData?.items ?? [];

  return (
    <DashboardLayout
      favorites={dashboardData.favorites}
      projects={dashboardData.projects}
      cloudStorage={dashboardData.cloudStorage}
    >
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-1">
              Cấu hình AI Prompt
            </h1>
            <p className="text-sm text-muted-foreground">
              Quản lý và chỉnh sửa AI prompts cho hệ thống cứu hộ
              {promptsData && (
                <span className="ml-1 text-foreground/60">
                  — {promptsData.totalCount} prompt
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchPrompts()}
              disabled={promptsLoading}
            >
              <ArrowCounterClockwise
                size={14}
                className={`mr-1.5 ${promptsLoading ? "animate-spin" : ""}`}
              />
              Làm mới
            </Button>
            <Button onClick={handleCreateNew} size="sm">
              <Plus size={14} className="mr-1.5" />
              Tạo Prompt mới
            </Button>
          </div>
        </div>

        {/* Editor (shown when creating/editing) */}
        {editorMode !== "closed" && (
          <PromptEditor
            prompt={editingPrompt}
            isSubmitting={createMutation.isPending || updateMutation.isPending}
            onSave={handleSave}
            onCancel={closeEditor}
          />
        )}

        {/* Main Content: List + Detail */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2">
            <PromptList
              prompts={prompts}
              isLoading={promptsLoading}
              selectedId={selectedPromptId}
              onSelect={handleSelectPrompt}
              onEdit={handleEdit}
              onDelete={setDeletingPrompt}
            />
          </div>
          <div className="lg:col-span-3">
            <PromptDetailPanel
              prompt={promptDetail ?? null}
              isLoading={detailLoading && !!selectedPromptId}
            />
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <DeletePromptDialog
        prompt={deletingPrompt}
        open={!!deletingPrompt}
        isDeleting={deleteMutation.isPending}
        onClose={() => setDeletingPrompt(null)}
        onConfirm={handleDelete}
      />
    </DashboardLayout>
  );
};

export default AIPromptPage;
