import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle, XCircle, Loader2, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

interface PaymentException {
  requestId: string;
  status: string;
  createdAt: string;
  expiresAt: string;
  approvedAt: string | null;
  paidAt: string | null;
  parent: {
    id: string;
    username: string;
    email: string;
    name: string | null;
  };
  child: {
    id: string;
    username: string;
    handle: string;
    name: string | null;
  };
  tokenAmount: number;
  priceCents: number;
  currency: string;
  stripeCheckoutSessionId: string | null;
  stripePaymentIntentId: string | null;
  hasLedgerEntry: boolean;
}

export default function AdminPaymentExceptionsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("EXPIRED_AFTER_PAYMENT");
  const [confirmDialog, setConfirmDialog] = useState<{
    type: "grant" | "resolve";
    requestId: string;
    tokenAmount: number;
  } | null>(null);

  const { data: exceptions, isLoading, error } = useQuery<PaymentException[]>({
    queryKey: ["/api/admin/payments-exceptions", statusFilter],
    queryFn: async () => {
      const res = await fetch(`/api/admin/payments-exceptions?status=${statusFilter}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to load exceptions");
      }
      return res.json();
    },
  });

  const grantMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const res = await fetch(`/api/admin/purchase-requests/${requestId}/grant-tokens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to grant tokens");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Tokens granted successfully");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payments-exceptions"] });
      setConfirmDialog(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const res = await fetch(`/api/admin/purchase-requests/${requestId}/mark-resolved`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to resolve request");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Request marked as resolved");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payments-exceptions"] });
      setConfirmDialog(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const formatPrice = (cents: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString();
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
      <div className="flex items-center gap-4">
        <Link href="/admin">
          <Button variant="ghost" size="sm" data-testid="button-back-admin">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Payment Exceptions</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Purchase Requests Requiring Review
            </CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[280px]" data-testid="select-status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EXPIRED_AFTER_PAYMENT">Expired After Payment</SelectItem>
                <SelectItem value="PAID_ADMIN_GRANTED">Paid - Admin Granted</SelectItem>
                <SelectItem value="RESOLVED_NO_GRANT">Resolved - No Grant</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : exceptions && exceptions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No payment exceptions found with status: {statusFilter}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Child</TableHead>
                  <TableHead>Parent</TableHead>
                  <TableHead>Tokens</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Expired</TableHead>
                  <TableHead>Paid At</TableHead>
                  <TableHead>Ledger Entry</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exceptions?.map((exc) => (
                  <TableRow key={exc.requestId} data-testid={`row-exception-${exc.requestId}`}>
                    <TableCell className="font-mono text-xs">
                      {exc.requestId.slice(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={exc.status === "EXPIRED_AFTER_PAYMENT" ? "destructive" : "secondary"}
                        data-testid={`badge-status-${exc.requestId}`}
                      >
                        {exc.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{exc.child.name || exc.child.handle}</div>
                        <div className="text-xs text-muted-foreground">@{exc.child.username}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{exc.parent.name || exc.parent.username}</div>
                        <div className="text-xs text-muted-foreground">{exc.parent.email}</div>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">
                      {exc.tokenAmount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {formatPrice(exc.priceCents, exc.currency)}
                    </TableCell>
                    <TableCell className="text-xs">
                      {formatDate(exc.createdAt)}
                    </TableCell>
                    <TableCell className="text-xs text-red-500">
                      {formatDate(exc.expiresAt)}
                    </TableCell>
                    <TableCell className="text-xs">
                      {formatDate(exc.paidAt)}
                    </TableCell>
                    <TableCell>
                      {exc.hasLedgerEntry ? (
                        <Badge variant="outline" className="text-green-500 border-green-500">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Yes
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-500 border-amber-500">
                          <XCircle className="h-3 w-3 mr-1" />
                          No
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {exc.status === "EXPIRED_AFTER_PAYMENT" && !exc.hasLedgerEntry && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => setConfirmDialog({
                              type: "grant",
                              requestId: exc.requestId,
                              tokenAmount: exc.tokenAmount,
                            })}
                            data-testid={`button-grant-${exc.requestId}`}
                          >
                            Grant Tokens
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setConfirmDialog({
                              type: "resolve",
                              requestId: exc.requestId,
                              tokenAmount: exc.tokenAmount,
                            })}
                            data-testid={`button-resolve-${exc.requestId}`}
                          >
                            Mark Resolved
                          </Button>
                        </div>
                      )}
                      {exc.status === "EXPIRED_AFTER_PAYMENT" && exc.hasLedgerEntry && (
                        <Badge variant="outline" className="text-green-500">Already Granted</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog?.type === "grant" ? "Grant Tokens?" : "Mark as Resolved?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog?.type === "grant" ? (
                <>
                  This will credit <strong>{confirmDialog.tokenAmount.toLocaleString()} tokens</strong> to the child's account and mark the request as PAID_ADMIN_GRANTED. This action will be logged in the admin audit log.
                </>
              ) : (
                <>
                  This will mark the request as RESOLVED_NO_GRANT without crediting any tokens. Use this if the payment was refunded or resolved through other means. This action will be logged in the admin audit log.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-confirm">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDialog?.type === "grant") {
                  grantMutation.mutate(confirmDialog.requestId);
                } else if (confirmDialog?.type === "resolve") {
                  resolveMutation.mutate(confirmDialog.requestId);
                }
              }}
              disabled={grantMutation.isPending || resolveMutation.isPending}
              data-testid="button-confirm-action"
            >
              {(grantMutation.isPending || resolveMutation.isPending) && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              {confirmDialog?.type === "grant" ? "Grant Tokens" : "Mark Resolved"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
