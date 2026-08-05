import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { data, http } from "@/shared/lib/api-client";
import { qk } from "@/shared/lib/query-keys";
import type { BillingPlan, Membership, PaymentHistory, PaymentOrder } from "./types";

export const useBillingPlans = () => useQuery({
  queryKey: qk.billing.plans(),
  queryFn: () => data<BillingPlan[]>(http.get("/billing/plans")),
  staleTime: 60_000,
});

export const useMembership = (enabled: boolean) => useQuery({
  queryKey: qk.billing.membership(),
  queryFn: () => data<Membership>(http.get("/billing/me")),
  enabled,
});

export const usePaymentHistory = (enabled: boolean) => useQuery({
  queryKey: qk.billing.history(),
  queryFn: () => data<PaymentHistory>(http.get("/billing/orders", { params: { page: 0, size: 20 } })),
  enabled,
});

export const usePaymentOrder = (invoice: string | null, enabled: boolean) => useQuery({
  queryKey: qk.billing.order(invoice ?? ""),
  queryFn: () => data<PaymentOrder>(http.get(`/billing/orders/${encodeURIComponent(invoice ?? "")}`)),
  enabled: enabled && Boolean(invoice),
  refetchInterval: (query) => query.state.data?.status === "PENDING" ? 5_000 : false,
});

export const useCreatePaymentOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (planCode: string) => data<PaymentOrder>(http.post(
      "/billing/orders",
      { planCode },
      { headers: { "X-Request-ID": crypto.randomUUID() } },
    )),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.billing.history() });
      void queryClient.invalidateQueries({ queryKey: qk.billing.membership() });
    },
  });
};

export const useHidePaymentOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invoice: string) => data<{ hidden: boolean }>(http.delete(`/billing/orders/${encodeURIComponent(invoice)}`)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.billing.history() });
    },
  });
};

export const useCancelPaymentOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invoice: string) => data<PaymentOrder>(http.post(`/billing/orders/${encodeURIComponent(invoice)}/cancel`, {})),
    onSuccess: (order) => {
      void queryClient.invalidateQueries({ queryKey: qk.billing.history() });
      void queryClient.setQueryData(qk.billing.order(order.invoiceNumber), order);
    },
  });
};
