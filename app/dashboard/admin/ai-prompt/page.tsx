"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getDashboardData } from "@/lib/mock-data/admin-dashboard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Plus,
  ArrowCounterClockwise,
  ArrowsIn,
  ArrowsOut,
  DotsSixVertical,
  X,
} from "@phosphor-icons/react";
import { toast } from "sonner";
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
import { cn } from "@/lib/utils";

const EDITOR_MIN_PANEL_HEIGHT = 320;
const EDITOR_DEFAULT_PANEL_HEIGHT = 760;

const AIPromptPage = () => {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  // Prompt state
  const [selectedPromptId, setSelectedPromptId] = useState<number | null>(null);
  const [selectedPromptType, setSelectedPromptType] =
    useState<PromptType | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>("closed");
  const [editorPanelHeight, setEditorPanelHeight] = useState(
    EDITOR_DEFAULT_PANEL_HEIGHT,
  );
  const [isEditorFullscreen, setIsEditorFullscreen] = useState(false);
  const [editingPromptSeed, setEditingPromptSeed] =
    useState<PromptEntity | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<PromptDetailEntity | null>(
    null,
  );
  const [deletingPrompt, setDeletingPrompt] = useState<PromptEntity | null>(
    null,
  );

  const editorDragStartY = useRef(0);
  const editorDragStartHeight = useRef(0);
  const isEditorDragging = useRef(false);

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
    setIsEditorFullscreen(false);
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
    setEditorPanelHeight(EDITOR_DEFAULT_PANEL_HEIGHT);
    setIsEditorFullscreen(false);
    setEditorMode("creating");
  }, []);

  const handleEdit = useCallback((prompt: PromptEntity) => {
    setIsDetailModalOpen(false);
    setEditingPromptSeed(prompt);
    setEditingPrompt(null);
    setSelectedPromptId(prompt.id);
    setSelectedPromptType(prompt.promptType);
    setEditorPanelHeight(EDITOR_DEFAULT_PANEL_HEIGHT);
    setIsEditorFullscreen(false);
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

  useEffect(() => {
    if (editorMode === "closed") {
      return;
    }

    setEditorPanelHeight(EDITOR_DEFAULT_PANEL_HEIGHT);
    setIsEditorFullscreen(false);
  }, [editorMode]);

  useEffect(() => {
    if (editorMode === "closed") {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeEditor();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editorMode, closeEditor]);

  const handleEditorPointerDown = useCallback(
    (event: React.PointerEvent) => {
      if (isEditorFullscreen) {
        return;
      }

      event.preventDefault();
      editorDragStartY.current = event.clientY;
      editorDragStartHeight.current = editorPanelHeight;
      isEditorDragging.current = true;

      const maxHeight =
        typeof window !== "undefined" ? window.innerHeight * 0.94 : 900;

      const onMove = (moveEvent: PointerEvent) => {
        if (!isEditorDragging.current) {
          return;
        }

        const delta = editorDragStartY.current - moveEvent.clientY;
        const nextHeight = Math.max(
          EDITOR_MIN_PANEL_HEIGHT,
          Math.min(maxHeight, editorDragStartHeight.current + delta),
        );

        setEditorPanelHeight(nextHeight);
      };

      const onUp = () => {
        isEditorDragging.current = false;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [editorPanelHeight, isEditorFullscreen],
  );

  const handleSave = useCallback(
    async (data: CreatePromptRequest | UpdatePromptRequest) => {
      try {
        if (editingPrompt) {
          await updateMutation.mutateAsync({
            id: editingPrompt.id,
            data: data as UpdatePromptRequest,
          });
          toast.success("Đã cập nhật prompt thành công.");
        } else {
          await createMutation.mutateAsync(data as CreatePromptRequest);
          toast.success("Đã tạo prompt mới thành công.");
        }
        setSelectedPromptType(data.prompt_type);
        closeEditor();
      } catch (error) {
        console.error("Error saving prompt:", error);
        toast.error("Không thể lưu prompt. Vui lòng kiểm tra lại cấu hình.");
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
      toast.success("Đã xóa prompt.");
    } catch (error) {
      console.error("Error deleting prompt:", error);
      toast.error("Không thể xóa prompt.");
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

      <AnimatePresence>
        {editorMode !== "closed" ? (
          <>
            <motion.div
              key="editor-backdrop"
              className="fixed inset-0 z-50 bg-black/25 backdrop-blur-[1.5px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={closeEditor}
            />

            <motion.div
              key="editor-drawer"
              className={cn(
                "fixed z-50 flex",
                isEditorFullscreen
                  ? "inset-0 items-stretch justify-stretch"
                  : "inset-x-0 bottom-0 items-end justify-stretch",
              )}
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{
                type: "spring",
                stiffness: 320,
                damping: 30,
                mass: 0.9,
              }}
            >
              <div
                className={cn(
                  "relative overflow-hidden flex flex-col bg-background text-[14px] shadow-2xl",
                  isEditorFullscreen
                    ? "h-screen w-screen rounded-none border-0"
                    : "w-full rounded-t-2xl border-t border-border/60",
                )}
                style={
                  isEditorFullscreen ? undefined : { height: editorPanelHeight }
                }
              >
                <div className="relative px-5 pt-2.5 pb-1 shrink-0">
                  <div className="flex justify-center">
                    {!isEditorFullscreen ? (
                      <div
                        className="flex flex-col items-center select-none group touch-none cursor-ns-resize"
                        onPointerDown={handleEditorPointerDown}
                      >
                        <div className="h-1.5 w-14 rounded-full bg-border group-hover:bg-primary/50 group-active:bg-primary/70 transition-colors duration-150" />
                        <span className="text-sm text-muted-foreground/80 mt-1 group-hover:text-muted-foreground/70 transition-colors flex items-center gap-0.5 tracking-tighter">
                          <DotsSixVertical className="h-3 w-3" />
                          Kéo để xem nhiều nội dung hơn
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground tracking-tighter">
                        Đang ở chế độ xem đầy đủ
                      </span>
                    )}
                  </div>

                  <div className="absolute right-5 top-2.5 flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md"
                      onClick={() => setIsEditorFullscreen((prev) => !prev)}
                    >
                      {isEditorFullscreen ? (
                        <ArrowsIn className="h-4 w-4" />
                      ) : (
                        <ArrowsOut className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md"
                      onClick={closeEditor}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto">
                  <PromptEditor
                    prompt={editingPrompt}
                    isSubmitting={
                      createMutation.isPending || updateMutation.isPending
                    }
                    onSave={handleSave}
                    onCancel={closeEditor}
                    hideHeaderClose
                  />
                </div>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

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
