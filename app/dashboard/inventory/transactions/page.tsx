"use client";

import React from 'react';
import TransactionTable from '@/components/transactions/TransactionTable';

const TransactionsPage: React.FC = () => {
  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Truy xuất giao dịch</h1>
            <p className="text-sm text-muted-foreground">
              Theo dõi tất cả các giao dịch xuất nhập kho
            </p>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        <TransactionTable />
      </div>
    </div>
  );
};

export default TransactionsPage;