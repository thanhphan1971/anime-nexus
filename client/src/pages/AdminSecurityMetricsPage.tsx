import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Shield, ShieldAlert, Loader2, ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";
import { Link } from "wouter";

interface OverviewData {
  totalRequestCreated: number;
  totalApprovalStarted: number;
  totalWebhookCredited: number;
  totalBlockedByType: Record<string, number>;
  topReasons: Array<{ eventType: string; reason: string; count: number }>;
}

interface BlockedData {
  series: Array<{ day: string; eventType: string; reason: string; count: number }>;
  totalsByReason: Array<{ eventType: string; reason: string; count: number }>;
}

export default function AdminSecurityMetricsPage() {
  const [days, setDays] = useState("30");

  const { data: overview, isLoading: overviewLoading, error: overviewError } = useQuery<OverviewData>({
    queryKey: ["/api/admin/security-metrics/overview", days],
    queryFn: async () => {
      const res = await fetch(`/api/admin/security-metrics/overview?days=${days}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to load overview");
      }
      return res.json();
    },
  });

  const { data: blocked, isLoading: blockedLoading, error: blockedError } = useQuery<BlockedData>({
    queryKey: ["/api/admin/security-metrics/blocked", days],
    queryFn: async () => {
      const res = await fetch(`/api/admin/security-metrics/blocked?days=${days}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to load blocked metrics");
      }
      return res.json();
    },
  });

  const isLoading = overviewLoading || blockedLoading;
  const error = overviewError || blockedError;

  const totalBlocked = overview ? Object.values(overview.totalBlockedByType).reduce((a, b) => a + b, 0) : 0;

  const getReasonLabel = (reason: string) => {
    const labels: Record<string, string> = {
      PURCHASES_DISABLED: "Purchases Disabled",
      DAILY_LIMIT: "Daily Limit",
      MONTHLY_LIMIT: "Monthly Limit",
      REQUEST_EXPIRED: "Request Expired",
      SUCCESS: "Success",
    };
    return labels[reason] || reason;
  };

  const getEventTypeLabel = (eventType: string) => {
    const labels: Record<string, string> = {
      REQUEST_BLOCKED: "Request",
      APPROVAL_BLOCKED: "Approval",
      WEBHOOK_BLOCKED: "Webhook",
      REQUEST_CREATED: "Request Created",
      APPROVAL_STARTED: "Approval Started",
      WEBHOOK_CREDITED: "Webhook Credited",
    };
    return labels[eventType] || eventType;
  };

  const getEventTypeBadgeVariant = (eventType: string) => {
    if (eventType.includes("BLOCKED")) return "destructive";
    return "default";
  };

  if (error) {
    return (
      <div className="min-h-screen p-6">
        <Card className="border-red-500/50 bg-red-500/10">
          <CardContent className="p-6 flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-red-500" />
            <span>Error: {(error as Error).message}</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <button className="flex items-center gap-2 text-muted-foreground hover:text-foreground" data-testid="link-back-admin">
              <ArrowLeft className="h-4 w-4" />
              Back to Admin
            </button>
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <Shield className="h-6 w-6" />
            Security Metrics
          </h1>
        </div>
        
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-[180px]" data-testid="select-days">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card data-testid="card-webhooks-credited">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Completed Purchases
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">{overview?.totalWebhookCredited.toLocaleString() || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Tokens delivered</p>
              </CardContent>
            </Card>

            <Card data-testid="card-total-blocked">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-red-500" />
                  Blocked Operations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-500">{totalBlocked.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">Last {days} days</p>
              </CardContent>
            </Card>

            <Card data-testid="card-requests-created">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  Requests Created
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.totalRequestCreated.toLocaleString() || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Purchase requests</p>
              </CardContent>
            </Card>

            <Card data-testid="card-approvals-started">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-yellow-500" />
                  Approvals Started
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.totalApprovalStarted.toLocaleString() || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Checkout initiated</p>
              </CardContent>
            </Card>

            <Card data-testid="card-conversion-rate">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-purple-500" />
                  Conversion Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {overview && overview.totalRequestCreated > 0 
                    ? ((overview.totalWebhookCredited / overview.totalRequestCreated) * 100).toFixed(1) + '%'
                    : '—'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Requests → Completed</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card data-testid="card-blocked-by-type">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-red-500" />
                  Blocked by Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                {overview && Object.keys(overview.totalBlockedByType).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(overview.totalBlockedByType).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between">
                        <span className="text-sm">{getEventTypeLabel(type)}</span>
                        <Badge variant="destructive">{count}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No blocked operations in this period</p>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-top-reasons">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  Top Block Reasons
                </CardTitle>
              </CardHeader>
              <CardContent>
                {overview?.topReasons && overview.topReasons.length > 0 ? (
                  <div className="space-y-3">
                    {overview.topReasons.slice(0, 5).map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant={getEventTypeBadgeVariant(item.eventType)}>
                            {getEventTypeLabel(item.eventType)}
                          </Badge>
                          <span className="text-sm">{getReasonLabel(item.reason)}</span>
                        </div>
                        <span className="font-medium">{item.count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No blocked operations in this period</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card data-testid="card-daily-breakdown">
            <CardHeader>
              <CardTitle>Daily Breakdown (Blocked)</CardTitle>
            </CardHeader>
            <CardContent>
              {blocked?.totalsByReason && blocked.totalsByReason.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event Type</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {blocked.totalsByReason.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <Badge variant={getEventTypeBadgeVariant(item.eventType)}>
                            {getEventTypeLabel(item.eventType)}
                          </Badge>
                        </TableCell>
                        <TableCell>{getReasonLabel(item.reason)}</TableCell>
                        <TableCell className="text-right font-medium">{item.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-sm py-4 text-center">No blocked operations in this period</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
