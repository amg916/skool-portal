import { useState } from "react";
import { Link } from "wouter";
import { useGetAdminProgress } from "@workspace/api-client-react";
import { LineChart, ArrowLeft, Loader2, ChevronDown, ChevronRight, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

export default function AdminProgress() {
  const { data: progressRows, isLoading } = useGetAdminProgress();
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});

  const toggleRow = (id: number) => {
    setExpandedRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 w-full">
      <div className="mb-6">
        <Link href="/admin">
          <Button variant="ghost" size="sm" className="-ml-3 text-muted-foreground">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Admin
          </Button>
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <LineChart className="h-8 w-8 text-primary" />
          Member Progress
        </h1>
        <p className="text-muted-foreground mt-1">Track school completion rates across all users.</p>
      </div>

      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : !progressRows?.length ? (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
            <LineChart className="h-12 w-12 opacity-20 mb-4" />
            <p>No progress data available yet.</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead>User</TableHead>
                <TableHead className="text-right">Completed Lessons</TableHead>
                <TableHead className="w-[200px]">Overall Progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {progressRows.map(row => (
                <React.Fragment key={row.userId}>
                  <TableRow className="hover:bg-muted/30 cursor-pointer" onClick={() => toggleRow(row.userId)}>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                        {expandedRows[row.userId] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-xs">
                          {row.userName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{row.userName}</div>
                          <div className="text-xs text-muted-foreground">{row.userEmail}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      <span className="text-foreground font-medium">{row.completedLessons}</span> / {row.totalLessons}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Progress value={row.overallPercent} className="h-2 flex-1" />
                        <span className="text-sm font-medium w-10 text-right">{Math.round(row.overallPercent)}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                  {expandedRows[row.userId] && (
                    <TableRow className="bg-muted/10">
                      <TableCell colSpan={4} className="p-0 border-b">
                        <div className="p-4 pl-[88px] grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                          {row.bySegment.map(seg => (
                            <div key={seg.segmentId} className="flex items-center justify-between gap-4 text-sm">
                              <span className="truncate text-muted-foreground">{seg.segmentTitle}</span>
                              <div className="flex items-center gap-3 min-w-[120px]">
                                <Progress value={seg.percent} className="h-1.5 flex-1 bg-muted-foreground/20" />
                                <span className="text-xs font-medium w-8 text-right">{Math.round(seg.percent)}%</span>
                              </div>
                            </div>
                          ))}
                          {row.bySegment.length === 0 && (
                            <span className="text-sm text-muted-foreground">No segments available</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

// Ensure React is imported for React.Fragment
import React from "react";
