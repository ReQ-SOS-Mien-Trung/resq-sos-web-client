"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { vi as viLocale } from "date-fns/locale";
import { DashboardLayout } from "@/components/admin/dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowClockwise,
  ArrowDown,
  ArrowUp,
  CalendarBlank,
  Database,
} from "@phosphor-icons/react";
import {
  useSystemFund,
  useSystemFundTransactions,
  useSystemFundTransactionTypes,
} from "@/services/system_fund";
import type { SystemFundTransactionType } from "@/services/system_fund";
import { useQueryClient } from "@tanstack/react-query";

function formatMoney(value: number) {
  return value.toLocaleString("vi-VN") + "đ";
}

function formatMoneyInput(value: string | number): string {
  const raw =
    typeof value === "string"
      ? value.replace(/\D/g, "")
      : String(Math.round(value));
  const parsed = Number(raw);
  if (!raw || !Number.isFinite(parsed)) return "";
  return parsed.toLocaleString("vi-VN");
}

function formatDateToYmd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function SystemFundPage() {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [transactionTypeInput, setTransactionTypeInput] = useState<
    "all" | SystemFundTransactionType
  >("all");
  const [transactionType, setTransactionType] = useState<
    "all" | SystemFundTransactionType
  >("all");
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();
  const [appliedFromDate, setAppliedFromDate] = useState<Date | undefined>();
  const [appliedToDate, setAppliedToDate] = useState<Date | undefined>();
  const [fromDateOpen, setFromDateOpen] = useState(false);
  const [toDateOpen, setToDateOpen] = useState(false);
  const [minAmountInput, setMinAmountInput] = useState("");
  const [maxAmountInput, setMaxAmountInput] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [dateError, setDateError] = useState("");
  const [amountError, setAmountError] = useState("");

  const { data: systemFund, isLoading: loadingSystemFund } = useSystemFund();
  const { data: transactionTypeMetadata = [] } =
    useSystemFundTransactionTypes();

  const transactionParams = useMemo(
    () => ({
      pageNumber: page,
      pageSize,
      search: search || undefined,
      fromDate: appliedFromDate ? formatDateToYmd(appliedFromDate) : undefined,
      toDate: appliedToDate ? formatDateToYmd(appliedToDate) : undefined,
      minAmount: minAmount ? Number(minAmount) : undefined,
      maxAmount: maxAmount ? Number(maxAmount) : undefined,
      transactionTypes:
        transactionType === "all" ? undefined : [transactionType],
    }),
    [
      appliedFromDate,
      appliedToDate,
      maxAmount,
      minAmount,
      page,
      pageSize,
      search,
      transactionType,
    ],
  );

  const { data: transactionData, isLoading: loadingTransactions } =
    useSystemFundTransactions(transactionParams);

  const transactionTypeMap = useMemo(
    () =>
      Object.fromEntries(
        transactionTypeMetadata.map((item) => [item.key, item.value]),
      ),
    [transactionTypeMetadata],
  );

  const resetFilters = () => {
    setSearchInput("");
    setSearch("");
    setTransactionTypeInput("all");
    setTransactionType("all");
    setFromDate(undefined);
    setToDate(undefined);
    setAppliedFromDate(undefined);
    setAppliedToDate(undefined);
    setFromDateOpen(false);
    setToDateOpen(false);
    setMinAmountInput("");
    setMaxAmountInput("");
    setMinAmount("");
    setMaxAmount("");
    setDateError("");
    setAmountError("");
    setPage(1);
  };

  const applyFilters = () => {
    if (fromDate && toDate && fromDate > toDate) {
      setDateError("Ngày bắt đầu không được sau ngày kết thúc");
      return;
    }

    setDateError("");

    const min = minAmountInput ? Number(minAmountInput) : undefined;
    const max = maxAmountInput ? Number(maxAmountInput) : undefined;

    if (min !== undefined && max !== undefined && min > max) {
      setAmountError("Số tiền tối thiểu không được lớn hơn tối đa");
      return;
    }

    setAmountError("");
    setSearch(searchInput.trim());
    setTransactionType(transactionTypeInput);
    setAppliedFromDate(fromDate);
    setAppliedToDate(toDate);
    setMinAmount(minAmountInput);
    setMaxAmount(maxAmountInput);
    setPage(1);
  };

  return (
    <DashboardLayout
      favorites={[]}
      projects={[]}
      cloudStorage={{ used: 0, total: 0, percentage: 0, unit: "GB" }}
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-4 mb-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2.5">
              <Database size={20} weight="bold" className="text-foreground" />
              <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Tài chính
              </p>
            </div>
            <h1 className="text-2xl font-bold tracking-tighter text-foreground sm:text-3xl">
              {loadingSystemFund ? "—" : systemFund?.name || "Quỹ hệ thống"}
            </h1>
            <p className="mt-1.5 text-base tracking-tighter text-muted-foreground">
              Theo dõi số dư và lịch sử giao dịch quỹ hệ thống
            </p>
          </div>
          <div className="flex flex-col items-start gap-1.5 self-start sm:items-end sm:self-auto">
            <Button
              variant="ghost"
              onClick={() => {
                setIsRefreshing(true);
                queryClient
                  .invalidateQueries()
                  .finally(() => setIsRefreshing(false));
              }}
              disabled={isRefreshing}
              className="gap-1.5 text-muted-foreground"
            >
              <ArrowClockwise
                size={15}
                className={isRefreshing ? "animate-spin" : ""}
              />
              Làm mới
            </Button>
            <p className="text-sm tracking-tighter">
              Cập nhật lúc:{" "}
              {systemFund?.lastUpdatedAt
                ? new Date(systemFund.lastUpdatedAt).toLocaleString("vi-VN")
                : "—"}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="min-w-[260px] flex-1">
                <Input
                  className="h-8 text-sm tracking-tighter"
                  placeholder="Tìm trong ghi chú..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      applyFilters();
                    }
                  }}
                />
              </div>

              <Select
                value={transactionTypeInput}
                onValueChange={(value) =>
                  setTransactionTypeInput(
                    value as "all" | SystemFundTransactionType,
                  )
                }
              >
                <SelectTrigger className="h-8 w-full min-w-[220px] shrink-0 text-sm tracking-tighter sm:w-[220px]">
                  <SelectValue placeholder="Loại giao dịch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả loại</SelectItem>
                  {transactionTypeMetadata.map((item) => (
                    <SelectItem key={item.key} value={item.key}>
                      {item.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap sm:shrink-0">
                <Popover open={fromDateOpen} onOpenChange={setFromDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 min-w-32 flex-1 justify-start gap-1.5 px-2.5 text-sm font-normal sm:flex-none"
                    >
                      <CalendarBlank size={14} />
                      {fromDate ? (
                        format(fromDate, "dd/MM/yyyy")
                      ) : (
                        <span className="text-muted-foreground">Từ ngày</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={fromDate}
                      onSelect={(date) => {
                        if (date && toDate && date > toDate) {
                          setToDate(undefined);
                        }
                        setFromDate(date);
                        setFromDateOpen(false);
                      }}
                      disabled={(date) => (toDate ? date > toDate : false)}
                      locale={viLocale}
                      initialFocus
                    />
                    {fromDate && (
                      <div className="border-t px-3 py-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-full text-sm text-muted-foreground"
                          onClick={() => {
                            setFromDate(undefined);
                            setFromDateOpen(false);
                          }}
                        >
                          Xóa
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
                <span className="text-xs text-muted-foreground">–</span>
                <Popover open={toDateOpen} onOpenChange={setToDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 min-w-32 flex-1 justify-start gap-1.5 px-2.5 text-sm font-normal sm:flex-none"
                    >
                      <CalendarBlank size={14} />
                      {toDate ? (
                        format(toDate, "dd/MM/yyyy")
                      ) : (
                        <span className="text-muted-foreground">Đến ngày</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={toDate}
                      onSelect={(date) => {
                        if (date && fromDate && date < fromDate) {
                          setFromDate(undefined);
                        }
                        setToDate(date);
                        setToDateOpen(false);
                      }}
                      disabled={(date) => (fromDate ? date < fromDate : false)}
                      locale={viLocale}
                      initialFocus
                    />
                    {toDate && (
                      <div className="border-t px-3 py-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-full text-sm text-muted-foreground"
                          onClick={() => {
                            setToDate(undefined);
                            setToDateOpen(false);
                          }}
                        >
                          Xóa
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap sm:shrink-0">
                <Input
                  type="text"
                  inputMode="numeric"
                  className="h-8 min-w-37 flex-1 text-sm tracking-tighter sm:w-37 sm:flex-none"
                  placeholder="Tiền tối thiểu"
                  value={formatMoneyInput(minAmountInput)}
                  onChange={(e) => {
                    const rawValue = e.target.value.replace(/\D/g, "");
                    setMinAmountInput(rawValue);
                    setAmountError(
                      maxAmountInput &&
                        Number(rawValue) > Number(maxAmountInput)
                        ? "Số tiền tối thiểu không được lớn hơn tối đa"
                        : "",
                    );
                  }}
                />
                <span className="text-xs text-muted-foreground">–</span>
                <Input
                  type="text"
                  inputMode="numeric"
                  className="h-8 min-w-37 flex-1 text-sm tracking-tighter sm:w-37 sm:flex-none"
                  placeholder="Tiền tối đa"
                  value={formatMoneyInput(maxAmountInput)}
                  onChange={(e) => {
                    const rawValue = e.target.value.replace(/\D/g, "");
                    setMaxAmountInput(rawValue);
                    setAmountError(
                      minAmountInput &&
                        Number(rawValue) < Number(minAmountInput)
                        ? "Số tiền tối đa không được nhỏ hơn tối thiểu"
                        : "",
                    );
                  }}
                />
              </div>

              <div className="flex w-full items-center gap-2 md:ml-auto md:w-[260px] xl:w-[280px]">
                <Button
                  size="sm"
                  className="h-8 min-w-0 flex-1 px-3 text-sm tracking-tighter"
                  onClick={applyFilters}
                  disabled={!!dateError || !!amountError}
                >
                  Áp dụng bộ lọc
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 min-w-0 flex-1 px-3 text-sm tracking-tighter"
                  onClick={resetFilters}
                >
                  Đặt lại
                </Button>
              </div>
            </div>

            {(dateError || amountError) && (
              <p className="text-xs tracking-tighter text-rose-500">
                {dateError || amountError}
              </p>
            )}
          </div>

          {loadingTransactions ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : !transactionData?.items?.length ? (
            <div className="rounded-xl border border-dashed border-border/60 p-8 text-center">
              <Database
                size={28}
                className="mx-auto mb-2 text-muted-foreground/30"
              />
              <p className="text-sm tracking-tighter text-muted-foreground">
                Chưa có giao dịch quỹ hệ thống
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-lg border border-border/60 bg-background">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="w-10 text-center text-sm">
                        #
                      </TableHead>
                      <TableHead className="text-sm">Loại giao dịch</TableHead>
                      <TableHead className="text-sm">Tham chiếu</TableHead>
                      <TableHead className="text-sm">Ghi chú</TableHead>
                      <TableHead className="text-right text-sm">
                        Số tiền
                      </TableHead>
                      <TableHead className="text-right text-sm">
                        Thời gian
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactionData.items.map((tx, index) => {
                      const isIn = tx.amount >= 0;
                      return (
                        <TableRow key={tx.id}>
                          <TableCell className="text-center text-sm text-muted-foreground">
                            {(page - 1) * pageSize + index + 1}
                          </TableCell>
                          <TableCell className="text-sm font-medium">
                            <span
                              className={`inline-flex items-center gap-1 ${
                                isIn ? "text-emerald-600" : "text-rose-600"
                              }`}
                            >
                              {isIn ? (
                                <ArrowUp size={12} weight="bold" />
                              ) : (
                                <ArrowDown size={12} weight="bold" />
                              )}
                              {transactionTypeMap[tx.transactionType] ??
                                tx.transactionType}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {tx.referenceId != null
                              ? `${tx.referenceType} #${tx.referenceId}`
                              : tx.referenceType || "—"}
                          </TableCell>
                          <TableCell className="max-w-72 truncate text-sm text-muted-foreground">
                            {tx.note || "—"}
                          </TableCell>
                          <TableCell
                            className={`text-right text-sm font-bold ${
                              isIn ? "text-emerald-600" : "text-rose-600"
                            }`}
                          >
                            {isIn ? "+" : ""}
                            {formatMoney(tx.amount)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-right text-sm text-muted-foreground">
                            {new Date(tx.createdAt).toLocaleString("vi-VN")}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col gap-2 border-t border-border/40 pt-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <p className="text-sm tracking-tight text-muted-foreground">
                    Trang {transactionData.pageNumber} /{" "}
                    {transactionData.totalPages} · {transactionData.totalCount}{" "}
                    giao dịch
                  </p>
                  <Select
                    value={String(pageSize)}
                    onValueChange={(value) => {
                      setPageSize(Number(value));
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="h-7 w-16 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[5, 10, 20, 50, 100].map((size) => (
                        <SelectItem key={size} value={String(size)}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-sm tracking-tight text-muted-foreground">
                    / trang
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    disabled={!transactionData.hasPreviousPage}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  >
                    Trước
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    disabled={!transactionData.hasNextPage}
                    onClick={() => setPage((prev) => prev + 1)}
                  >
                    Tiếp
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
