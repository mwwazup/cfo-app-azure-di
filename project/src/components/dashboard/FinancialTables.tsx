import React, { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
  ColumnFiltersState
} from '@tanstack/react-table';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';
import { FinancialStatement, FinancialDataRow, StatementType } from '../../models/FinancialStatement';
import { FinancialDataService } from '../../services/financialDataService';
import { 
  Table, 
  Search, 
  Download, 
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  DollarSign,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

interface FinancialTablesProps {
  statements: FinancialStatement[];
}

const columnHelper = createColumnHelper<FinancialDataRow>();

export function FinancialTables({ statements }: FinancialTablesProps) {
  const [selectedStatement, setSelectedStatement] = useState<string>('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  // Get the selected statement or the most recent one
  const currentStatement = useMemo(() => {
    if (selectedStatement) {
      return statements.find(s => s.id === selectedStatement);
    }
    return statements.length > 0 ? statements[0] : null;
  }, [statements, selectedStatement]);

  // Get table data
  const tableData = useMemo(() => {
    return currentStatement?.parsed_data?.data || [];
  }, [currentStatement]);

  // Define columns
  const columns = useMemo(() => [
    columnHelper.accessor('category', {
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-8 p-0 font-medium"
        >
          Category
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      ),
      cell: ({ getValue }) => (
        <span className="font-medium text-gray-900 dark:text-gray-100">
          {getValue()}
        </span>
      )
    }),
    columnHelper.accessor('account_name', {
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-8 p-0 font-medium"
        >
          Account Name
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      ),
      cell: ({ getValue }) => (
        <span className="text-gray-700 dark:text-gray-300">
          {getValue()}
        </span>
      )
    }),
    columnHelper.accessor('amount', {
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-8 p-0 font-medium justify-end"
        >
          Amount
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      ),
      cell: ({ getValue }) => {
        const amount = getValue();
        return (
          <div className="text-right">
            <span className={`font-medium ${amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${Math.abs(amount).toLocaleString()}
            </span>
            {amount < 0 && (
              <span className="text-red-600 ml-1">
                <TrendingDown className="h-3 w-3 inline" />
              </span>
            )}
            {amount > 0 && (
              <span className="text-green-600 ml-1">
                <TrendingUp className="h-3 w-3 inline" />
              </span>
            )}
          </div>
        );
      }
    }),
    columnHelper.accessor('percentage_of_total', {
      header: 'Percentage',
      cell: ({ getValue, row }) => {
        const percentage = getValue();
        if (percentage) {
          return (
            <span className="text-gray-600 dark:text-gray-400">
              {percentage.toFixed(1)}%
            </span>
          );
        }
        
        // Calculate percentage if not provided
        const totalAmount = currentStatement?.parsed_data?.categories
          ?.reduce((sum, cat) => sum + Math.abs(cat.total), 0) || 0;
        const rowPercentage = totalAmount > 0 ? (Math.abs(row.original.amount) / totalAmount) * 100 : 0;
        
        return (
          <span className="text-gray-600 dark:text-gray-400">
            {rowPercentage.toFixed(1)}%
          </span>
        );
      }
    })
  ], [currentStatement]);

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      globalFilter
    }
  });

  // Category summary
  const categorySummary = useMemo(() => {
    if (!currentStatement?.parsed_data?.categories) return [];
    
    return currentStatement.parsed_data.categories.map(category => ({
      name: category.name,
      total: category.total,
      percentage: category.percentage,
      itemCount: category.items.length,
      type: category.type
    }));
  }, [currentStatement]);

  // Export functionality
  const exportToCSV = () => {
    if (!tableData.length) return;

    const headers = ['Category', 'Account Name', 'Amount', 'Percentage'];
    const csvContent = [
      headers.join(','),
      ...tableData.map(row => [
        row.category,
        `"${row.account_name}"`,
        row.amount,
        row.percentage_of_total?.toFixed(2) || '0'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentStatement?.file_name || 'financial_data'}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (statements.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <Table className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No Financial Data
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Upload your financial statements to see detailed tables and analysis.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Table className="h-5 w-5" />
            Financial Data Tables
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Select Statement
              </label>
              <Select value={selectedStatement} onValueChange={setSelectedStatement}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a statement" />
                </SelectTrigger>
                <SelectContent>
                  {statements.map((statement) => (
                    <SelectItem key={statement.id} value={statement.id}>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs ${FinancialDataService.getStatementTypeColor(statement.statement_type)}`}>
                          {FinancialDataService.getStatementTypeLabel(statement.statement_type)}
                        </span>
                        <span>{statement.file_name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search accounts..."
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Filter by Category
              </label>
              <Select
                value={(table.getColumn('category')?.getFilterValue() as string) ?? ''}
                onValueChange={(value) => 
                  table.getColumn('category')?.setFilterValue(value === 'all' ? '' : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categorySummary.map((category) => (
                    <SelectItem key={category.name} value={category.name}>
                      {category.name} ({category.itemCount})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing {table.getFilteredRowModel().rows.length} of {tableData.length} entries
            </div>
            <Button onClick={exportToCSV} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Category Summary */}
      {categorySummary.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Category Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categorySummary.map((category) => (
                <div
                  key={category.name}
                  className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">
                      {category.name}
                    </h4>
                    <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded">
                      {category.itemCount} items
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className={`text-lg font-bold ${category.total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${Math.abs(category.total).toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {category.percentage.toFixed(1)}% of total
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {currentStatement ? (
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-sm ${FinancialDataService.getStatementTypeColor(currentStatement.statement_type)}`}>
                  {FinancialDataService.getStatementTypeLabel(currentStatement.statement_type)}
                </span>
                <span>{currentStatement.file_name}</span>
              </div>
            ) : (
              'Financial Data'
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-gray-200 dark:border-gray-700">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id} className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                      {headerGroup.headers.map((header) => (
                        <th key={header.id} className="px-4 py-3 text-left">
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="px-4 py-3">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={columns.length} className="h-24 text-center">
                        <div className="flex flex-col items-center justify-center py-8">
                          <Filter className="h-8 w-8 text-gray-400 mb-2" />
                          <span className="text-gray-500 dark:text-gray-400">No results found</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}