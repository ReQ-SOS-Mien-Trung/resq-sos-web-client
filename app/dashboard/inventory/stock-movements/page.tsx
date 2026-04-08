"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import StockMovementTable from '@/components/stock-movements/StockMovementTable';

const StockMovementsPage: React.FC = () => {
  const router = useRouter();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => router.push('/dashboard/inventory')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl tracking-tighter font-bold text-foreground">Truy xuất biến động kho</h1>
              <p className="text-sm tracking-tighter text-muted-foreground">
                Theo dõi tất cả các lần biến động kho
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1">
        <StockMovementTable />
      </div>
    </div>
  );
};

export default StockMovementsPage;