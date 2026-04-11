"use client";

import { useEffect, useState, useCallback } from "react";
import { getDashboardData } from "@/lib/mock-data/admin-dashboard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
  PromptType,
  CreatePromptRequest,
  UpdatePromptRequest,
} from "@/services/prompt/type";
import type { EditorMode } from "@/type";
import { PROMPT_TYPE_OPTIONS } from "@/lib/constants";

const AIPromptPage = () => {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  // Prompt state
  const [selectedPromptId, setSelectedPromptId] = useState<number | null>(null);
  const [selectedPromptType, setSelectedPromptType] =
    useState<PromptType | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>("closed");
  const [editingPromptSeed, setEditingPromptSeed] =
    useState<PromptEntity | null>(null);
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

  // --- Handlers ---

  const closeEditor = useCallback(() => {
    setEditorMode("closed");
    setEditingPromptSeed(null);
    setEditingPrompt(null);
  }, []);

  const handleSelectPrompt = useCallback(
    (prompt: PromptEntity) => {
      setSelectedPromptId(prompt.id);
      closeEditor();
      setIsDetailModalOpen(true);
    },
    [closeEditor],
  );

  const handleCreateNew = useCallback(() => {
    setIsDetailModalOpen(false);
    setEditingPromptSeed(null);
    setEditingPrompt(null);
    setEditorMode("creating");
  }, []);

  const handleEdit = useCallback((prompt: PromptEntity) => {
    setIsDetailModalOpen(false);
    setEditingPromptSeed(prompt);
    setEditingPrompt(null);
    setSelectedPromptId(prompt.id);
    setSelectedPromptType(prompt.promptType);
    setEditorMode("editing");
  }, []);

  const handleSelectPromptType = useCallback(
    (promptType: PromptType) => {
      setSelectedPromptType(promptType);
      setSelectedPromptId(null);
      setIsDetailModalOpen(false);
      closeEditor();
    },
    [closeEditor],
  );

  // Populate editor with detail data when editing (skip when creating)
  useEffect(() => {
    if (
      editorMode === "editing" &&
      selectedPromptId &&
      promptDetail &&
      promptDetail.id === selectedPromptId
    ) {
      const promptSummary = promptsData?.items?.find(
        (item) => item.id === selectedPromptId,
      );
      const resolvedModel =
        promptDetail.model?.trim() ||
        editingPromptSeed?.model?.trim() ||
        promptSummary?.model?.trim() ||
        null;

      setEditingPrompt({
        ...promptDetail,
        model: resolvedModel,
      });
    }
  }, [
    editorMode,
    selectedPromptId,
    promptDetail,
    promptsData,
    editingPromptSeed,
  ]);

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
        setSelectedPromptType(data.prompt_type);
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
  const filteredPrompts = selectedPromptType
    ? prompts.filter((prompt) => prompt.promptType === selectedPromptType)
    : [];
  const selectedPromptDetail =
    promptDetail && selectedPromptId && promptDetail.id === selectedPromptId
      ? promptDetail
      : null;
  const promptTypeCounts = PROMPT_TYPE_OPTIONS.reduce(
    (acc, option) => {
      acc[option.value] = prompts.filter(
        (prompt) => prompt.promptType === option.value,
      ).length;
      return acc;
    },
    {} as Record<PromptType, number>,
  );

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
            <h1 className="text-3xl font-bold text-foreground mb-1">
              Cấu hình AI Prompt
            </h1>
            <p className="text-base text-muted-foreground">
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

        {/* Main Content: Prompt List */}
        <div>
          <PromptList
            prompts={filteredPrompts}
            isLoading={promptsLoading}
            selectedId={selectedPromptId}
            selectedPromptType={selectedPromptType}
            promptTypeCounts={promptTypeCounts}
            onSelectPromptType={handleSelectPromptType}
            onSelect={handleSelectPrompt}
            onEdit={handleEdit}
            onDelete={setDeletingPrompt}
          />
        </div>
      </div>

      <Dialog
        open={editorMode !== "closed"}
        onOpenChange={(open) => {
          if (!open) {
            closeEditor();
          }
        }}
      >
        <DialogContent className="max-w-[min(1180px,96vw)] max-h-[94vh] overflow-y-auto p-0 [&>button]:hidden">
          <PromptEditor
            prompt={editingPrompt}
            isSubmitting={createMutation.isPending || updateMutation.isPending}
            onSave={handleSave}
            onCancel={closeEditor}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-[min(1180px,96vw)] max-h-[94vh] overflow-y-auto p-0">
          <PromptDetailPanel
            prompt={selectedPromptDetail}
            isLoading={
              Boolean(selectedPromptId) &&
              (detailLoading || !selectedPromptDetail)
            }
          />
        </DialogContent>
      </Dialog>

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
