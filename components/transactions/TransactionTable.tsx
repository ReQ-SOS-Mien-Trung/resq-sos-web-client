"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  CalendarIcon,
  X,
  FileText,
  Package,
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import {
  useDepotTransactions,
  useInventoryActionTypes,
  useInventorySourceTypes,
  type GetDepotTransactionsParams,
} from '@/services/inventory';
import { type TransactionEntity } from '@/services/inventory/type';
import { TransactionDetailSheet } from './TransactionDetailSheet';

const PAGE_SIZES = [10, 25, 50, 100];

const TransactionTable: React.FC = () => {
  // State for filters
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [selectedActionTypes, setSelectedActionTypes] = useState<string[]>([]);
  const [selectedSourceTypes, setSelectedSourceTypes] = useState<string[]>([]);
  const [selectedSourceNames, setSelectedSourceNames] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionEntity | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page when filters change
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setPage(0);
    }, 0);
    return () => clearTimeout(timer);
  }, [debouncedSearch, selectedActionTypes, selectedSourceTypes, selectedSourceNames, dateRange]);

  // Query filters
  const queryFilters = useMemo((): GetDepotTransactionsParams => ({
    pageNumber: page + 1,
    pageSize: pageSize,
    actionTypes: selectedActionTypes.length > 0 ? selectedActionTypes : undefined,
    sourceTypes: selectedSourceTypes.length > 0 ? selectedSourceTypes : undefined,
    fromDate: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
    toDate: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
  }), [page, pageSize, selectedActionTypes, selectedSourceTypes, dateRange]);

  // Fetch data
  const { data: transactionsData, isLoading: loadingTransactions, error: transactionsError } = useDepotTransactions(queryFilters);

  const { data: actionTypes = [] } = useInventoryActionTypes();

  const { data: sourceTypes = [] } = useInventorySourceTypes();

  // Transform data — one row per transaction
  const transactions = useMemo(() => {
    if (!transactionsData) return null;

    return {
      content: transactionsData.items.map((transaction, idx) => ({
        id: `${transaction.transactionId}-${idx}`,
        transactionId: transaction.transactionId,
        actionType: transaction.actionType,
        sourceType: transaction.sourceType,
        sourceName: transaction.sourceName,
        sourceId: transaction.sourceId?.toString() || '',
        notes: transaction.note,
        createdAt: transaction.createdAt,
        createdByName: transaction.performedByName,
        items: transaction.items,
        rawTransaction: transaction,
      })),
      totalElements: transactionsData.totalCount,
      totalPages: transactionsData.totalPages,
      size: transactionsData.pageSize,
      number: transactionsData.pageNumber,
      first: !transactionsData.hasPreviousPage,
      last: !transactionsData.hasNextPage,
    };
  }, [transactionsData]);

  // Get unique source names from transactions for filter
  const uniqueSourceNames = useMemo(() => {
    if (!transactionsData?.items) return [];
    const names = new Set(transactionsData.items.map(t => t.sourceName));
    return Array.from(names).sort();
  }, [transactionsData]);

  // Filter transactions by source name and search
  const filteredTransactions = useMemo(() => {
    if (!transactions) return null;
    
    let filtered = transactions.content;
    
    // Filter by search term
    if (debouncedSearch.trim()) {
      const term = debouncedSearch.toLowerCase();
      filtered = filtered.filter(t =>
        t.sourceName.toLowerCase().includes(term) ||
        t.items.some(i => i.itemName.toLowerCase().includes(term))
      );
    }
    
    // Filter by selected source names
    if (selectedSourceNames.length > 0) {
      filtered = filtered.filter(t => selectedSourceNames.includes(t.sourceName));
    }
    
    return {
      ...transactions,
      content: filtered
    };
  }, [transactions, debouncedSearch, selectedSourceNames]);

  // Clear filters
  const clearFilters = () => {
    setSearch('');
    setSelectedActionTypes([]);
    setSelectedSourceTypes([]);
    setSelectedSourceNames([]);
    setDateRange(undefined);
  };

  const hasActiveFilters = useMemo(() => {
    return search.trim() !== '' ||
      selectedActionTypes.length > 0 ||
      selectedSourceTypes.length > 0 ||
      selectedSourceNames.length > 0 ||
        dateRange?.from ||
        dateRange?.to;
  }, [search, selectedActionTypes, selectedSourceTypes, selectedSourceNames, dateRange]);

  const ACTION_TYPE_MAP: Record<string, { label: string; className: string }> = {
    Import:      { label: "Nhập kho",    className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    Export:      { label: "Xuất kho",    className: "bg-red-100 text-red-700 border-red-200" },
    Adjust:      { label: "Điều chỉnh",  className: "bg-orange-100 text-orange-700 border-orange-200" },
    Return:      { label: "Hoàn trả",    className: "bg-blue-100 text-blue-700 border-blue-200" },
    TransferIn:  { label: "Chuyển nhập", className: "bg-teal-100 text-teal-700 border-teal-200" },
    TransferOut: { label: "Chuyển xuất", className: "bg-purple-100 text-purple-700 border-purple-200" },
  };

  const SOURCE_TYPE_MAP: Record<string, string> = {
    Donation:   "Quyên góp",
    Mission:    "Nhiệm vụ",
    Purchase:   "Mua sắm",
    Adjustment: "Điều chỉnh",
    Transfer:   "Chuyển kho",
    Manual:     "Thủ công",
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: vi });
  };

  // Get action type badge with Vietnamese label + proper color
  const getActionTypeBadge = (actionType: string) => {
    const config = ACTION_TYPE_MAP[actionType];
    if (config) {
      return (
        <Badge variant="outline" className={config.className}>
          {config.label}
        </Badge>
      );
    }
    return <Badge variant="outline">{actionType}</Badge>;
  };

  const displayTransactions = filteredTransactions || transactions;

  return (
    <div className="flex flex-col pb-6">
      {/* Filters Section */}
      <Card className="mx-6 mt-4 mb-4">
        <CardHeader className="pb-0.5">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Bộ lọc
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Clear */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Input
                placeholder="Tìm kiếm theo tên nguồn hoặc vật tư..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
               <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            </div>
            {hasActiveFilters && (
              <Button
                variant="outline"
                onClick={clearFilters}
                className="shrink-0"
              >
                <X className="h-4 w-4 mr-2" />
                Xóa bộ lọc
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Action Types Filter */}
            <div className="space-y-2">
              <Label className="text-sm tracking-tighter font-mono">Loại hành động</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    {selectedActionTypes.length === 0 
                      ? "Chọn loại hành động..." 
                      : `${selectedActionTypes.length} đã chọn`
                    }
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="start">
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {actionTypes.map((actionType) => (
                      <div key={actionType.key} className="flex items-center space-x-2">
                        <Checkbox
                          id={`action-${actionType.key}`}
                          checked={selectedActionTypes.includes(actionType.key)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedActionTypes([...selectedActionTypes, actionType.key]);
                            } else {
                              setSelectedActionTypes(selectedActionTypes.filter(key => key !== actionType.key));
                            }
                          }}
                        />
                        <Label htmlFor={`action-${actionType.key}`} className="text-sm tracking-tighter">
                          {ACTION_TYPE_MAP[actionType.key]?.label ?? actionType.value}
                        </Label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Source Types Filter */}
            <div className="space-y-2">
              <Label className="text-sm tracking-tighter font-mono">Loại nguồn</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    {selectedSourceTypes.length === 0 
                      ? "Chọn loại nguồn..." 
                      : `${selectedSourceTypes.length} đã chọn`
                    }
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="start">
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {sourceTypes.map((sourceType) => (
                      <div key={sourceType.key} className="flex items-center space-x-2">
                        <Checkbox
                          id={`source-${sourceType.key}`}
                          checked={selectedSourceTypes.includes(sourceType.key)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedSourceTypes([...selectedSourceTypes, sourceType.key]);
                            } else {
                              setSelectedSourceTypes(selectedSourceTypes.filter(key => key !== sourceType.key));
                            }
                          }}
                        />
                        <Label htmlFor={`source-${sourceType.key}`} className="text-sm tracking-tighter">
                          {SOURCE_TYPE_MAP[sourceType.key] ?? sourceType.value}
                        </Label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Source Names Filter */}
            <div className="space-y-2">
              <Label className="text-sm tracking-tighter font-mono">Tên nguồn</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    {selectedSourceNames.length === 0 
                      ? "Chọn tên nguồn..." 
                      : `${selectedSourceNames.length} đã chọn`
                    }
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="start">
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {uniqueSourceNames.map((sourceName) => (
                      <div key={sourceName} className="flex items-center space-x-2">
                        <Checkbox
                          id={`source-name-${sourceName}`}
                          checked={selectedSourceNames.includes(sourceName)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedSourceNames([...selectedSourceNames, sourceName]);
                            } else {
                              setSelectedSourceNames(selectedSourceNames.filter(name => name !== sourceName));
                            }
                          }}
                        />
                        <Label htmlFor={`source-name-${sourceName}`} className="text-sm tracking-tighter">
                          {sourceName || "Không có"}
                        </Label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Date Range Filter */}
            <div className="space-y-2">
              <Label className="text-sm tracking-tighter font-mono">Khoảng thời gian</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateRange?.from && "font-medium"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange?.to ? (
                        <>
                          {format(dateRange.from, "dd/MM/yyyy", { locale: vi })} -{" "}
                          {format(dateRange.to, "dd/MM/yyyy", { locale: vi })}
                        </>
                      ) : (
                        format(dateRange.from, "dd/MM/yyyy", { locale: vi })
                      )
                    ) : (
                      "Chọn khoảng thời gian"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                    locale={vi}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <div className="mx-6">
        <Card>
          <CardHeader className="pb-1">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Lịch sử xuất nhập kho
              </CardTitle>
              <div className="flex items-center gap-2 text-sm tracking-tighter text-muted-foreground">
                {displayTransactions && (
                  <>
                    <span>
                      Trang {page + 1} / {displayTransactions.totalPages}
                    </span>
                    <Separator orientation="vertical" className="h-4" />
                    <span>
                      Tổng {displayTransactions.totalElements.toLocaleString('vi-VN')} lần
                    </span>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div>
              {/* Table wrapper with scroll */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="pl-6">Mã</TableHead>
                      <TableHead>Loại hành động</TableHead>
                      <TableHead>Nguồn</TableHead>
                      <TableHead>Vật tư</TableHead>
                      <TableHead>Thời gian</TableHead>                   
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingTransactions ? (
                      Array.from({ length: pageSize }, (_, i) => (
                        <TableRow key={i}>
                          <TableCell><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                          <TableCell><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                          <TableCell><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                          <TableCell><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                          <TableCell><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                          <TableCell><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                          <TableCell><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                          <TableCell><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                        </TableRow>
                      ))
                    ) : transactionsError ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <div className="flex flex-col items-center gap-2">
                            <Package className="h-8 w-8 text-muted-foreground" />
                            <p className="text-muted-foreground tracking-tighter">
                              Không thể tải dữ liệu.
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : !displayTransactions?.content?.length ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <div className="flex flex-col items-center gap-2">
                            <Package className="h-8 w-8 text-muted-foreground" />
                            <p className="text-muted-foreground tracking-tighter">
                              Không có dữ liệu xuất nhập kho nào.
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      displayTransactions.content.map((transaction) => (
                        <TableRow
                          key={transaction.id}
                          className="hover:bg-muted/50 cursor-pointer"
                          onClick={() => {
                            setSelectedTransaction(transaction.rawTransaction as TransactionEntity);
                            setSheetOpen(true);
                          }}
                        >
                          <TableCell className="font-regular text-sm pl-6">
                            {transaction.transactionId}
                          </TableCell>
                          <TableCell>
                            {getActionTypeBadge(transaction.actionType)}
                          </TableCell>
                          <TableCell>
                            {transaction.sourceName || "—"}
                          </TableCell>
                          <TableCell>
                            {transaction.items.length === 1 ? (
                              <div>
                                <p className="font-medium text-sm">{transaction.items[0].itemName}</p>
                                <p className="text-xs text-muted-foreground">{transaction.items[0].categoryName}</p>
                                {transaction.items[0].receivedDate && (
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    Nhập: {format(new Date(transaction.items[0].receivedDate), "dd/MM/yyyy", { locale: vi })}
                                    {transaction.items[0].expiredDate && (
                                      <> • Hết hạn: <span className={new Date(transaction.items[0].expiredDate) < new Date() ? "text-red-500 font-medium" : ""}>
                                        {format(new Date(transaction.items[0].expiredDate), "dd/MM/yyyy", { locale: vi })}
                                      </span></>
                                    )}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <div>
                                <p className="font-medium text-sm">{transaction.items[0].itemName}</p>
                                <p className="text-xs text-muted-foreground">{transaction.items[0].categoryName}</p>
                                <p className="text-xs text-muted-foreground mt-0.5 italic">+{transaction.items.length - 1} mặt hàng khác</p>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDate(transaction.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {displayTransactions && displayTransactions.totalPages > 0 && (
                <div className="border-t bg-background px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm tracking-tighter text-muted-foreground">
                      <span>Hiển thị</span>
                      <Select
                        value={pageSize.toString()}
                        onValueChange={(value) => {
                          setPageSize(Number(value));
                          setPage(0);
                        }}
                      >
                        <SelectTrigger className="w-20 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PAGE_SIZES.map((size) => (
                            <SelectItem key={size} value={size.toString()}>
                              {size}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span>/ {displayTransactions.totalElements} kết quả</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page - 1)}
                        disabled={displayTransactions.first || loadingTransactions}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Trước
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        {page + 1} / {displayTransactions.totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page + 1)}
                        disabled={displayTransactions.last || loadingTransactions}
                      >
                        Sau
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      <TransactionDetailSheet
        transaction={selectedTransaction}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
};

export default TransactionTable;