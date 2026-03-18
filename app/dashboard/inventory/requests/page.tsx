// "use client";

// import { useMemo } from "react";
// import { useRouter } from "next/navigation";
// import { ArrowLeft, Clock } from "@phosphor-icons/react";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge";
// import { Skeleton } from "@/components/ui/skeleton";
// import { useSupplyRequests } from "@/services/inventory/hooks";

// const sourceStatusLabels: Record<string, string> = {
//   Pending: "Chờ duyệt",
//   Accepted: "Đã chấp nhận",
//   Preparing: "Đang chuẩn bị",
//   Shipping: "Đang gửi hàng",
//   Completed: "Hoàn thành",
//   Rejected: "Từ chối",
// };

// const requestingStatusLabels: Record<string, string> = {
//   WaitingForApproval: "Chờ phê duyệt",
//   Approved: "Đã duyệt",
//   InTransit: "Đang được chi viện đến",
//   Received: "Đã nhận",
//   Rejected: "Từ chối",
// };

// export default function InventoryRequestsPage() {
//   const router = useRouter();
//   const { data, isLoading, isError, refetch, isFetching } = useSupplyRequests({
//     pageNumber: 1,
//     pageSize: 100,
//   });

//   const sortedItems = useMemo(
//     () =>
//       [...(data?.items ?? [])].sort(
//         (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
//       ),
//     [data],
//   );

//   return (
//     <div className="flex min-h-screen flex-col bg-background">
//       <header className="border-b bg-background px-6 py-4">
//         <div className="flex items-center justify-between">
//           <div className="flex items-center gap-3">
//             <Button
//               variant="ghost"
//               size="icon"
//               className="h-8 w-8"
//               onClick={() => router.push("/dashboard/inventory")}
//             >
//               <ArrowLeft className="h-4 w-4" />
//             </Button>
//             <div>
//               <h1 className="text-2xl font-bold tracking-tighter">Tất cả yêu cầu chi viện</h1>
//               <p className="text-sm tracking-tighter text-muted-foreground">
//                 Danh sách yêu cầu từ API /logistics/inventory/supply-requests
//               </p>
//             </div>
//           </div>

//           <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
//             Làm mới
//           </Button>
//         </div>
//       </header>

//       <main className="flex-1 p-6">
//         {isLoading && (
//           <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
//             {Array.from({ length: 6 }).map((_, i) => (
//               <Card key={i} className="border-border/60">
//                 <CardContent className="p-4 space-y-3">
//                   <Skeleton className="h-5 w-56" />
//                   <Skeleton className="h-4 w-40" />
//                   <Skeleton className="h-10 w-full" />
//                 </CardContent>
//               </Card>
//             ))}
//           </div>
//         )}

//         {!isLoading && isError && (
//           <div className="text-sm text-destructive tracking-tighter">
//             Không thể tải danh sách yêu cầu. Vui lòng thử lại.
//           </div>
//         )}

//         {!isLoading && !isError && sortedItems.length === 0 && (
//           <div className="text-sm text-muted-foreground tracking-tighter">
//             Chưa có yêu cầu nào.
//           </div>
//         )}

//         {!isLoading && !isError && sortedItems.length > 0 && (
//           <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
//             {sortedItems.map((request) => (
//               <Card key={request.id} className="border-border/60">
//                 <CardHeader className="pb-2">
//                   <div className="flex items-start justify-between gap-3">
//                     <div>
//                       <CardTitle className="text-base tracking-tighter">
//                         Yêu cầu #{request.id} • {request.sourceDepotName}
//                       </CardTitle>
//                       <p className="text-sm text-muted-foreground tracking-tighter mt-1">
//                         Kho yêu cầu: {request.requestingDepotName}
//                       </p>
//                     </div>
//                     <div className="flex flex-wrap gap-1.5 justify-end">
//                       <Badge variant="info">
//                         {requestingStatusLabels[request.requestingStatus] ?? request.requestingStatus}
//                       </Badge>
//                     </div>
//                   </div>
//                 </CardHeader>

//                 <CardContent className="space-y-3">
//                   <div className="text-xs text-muted-foreground tracking-tighter flex items-center gap-1">
//                     <Clock className="h-3.5 w-3.5" />
//                     {new Date(request.createdAt).toLocaleString("vi-VN")}
//                   </div>

//                   <div className="space-y-1.5">
//                     {request.items.map((item) => (
//                       <div
//                         key={`${request.id}-${item.reliefItemId}`}
//                         className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-sm tracking-tighter flex items-center justify-between"
//                       >
//                         <span className="font-medium">{item.reliefItemName}</span>
//                         <span className="font-semibold text-primary">
//                           {item.quantity.toLocaleString("vi-VN")} {item.unit}
//                         </span>
//                       </div>
//                     ))}
//                   </div>

//                   {request.note && (
//                     <p className="text-sm text-muted-foreground tracking-tighter">
//                       Ghi chú: {request.note}
//                     </p>
//                   )}
//                 </CardContent>
//               </Card>
//             ))}
//           </div>
//         )}
//       </main>
//     </div>
//   );
// }
