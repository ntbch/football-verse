"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { http } from "@/shared/lib/api-client";
import { body, game } from "./shared";

export type CareerOperationPhase = "idle" | "submitting" | "checking";

type OperationStatus<T> = {
  requestId: string;
  action: string | null;
  state: "UNKNOWN" | "PENDING" | "COMPLETED";
  response: T | null;
};

type OperationOptions<TData, TVariables> = {
  onSuccess?: (data: TData, variables: TVariables) => void | Promise<void>;
};

const recoverable = (error: unknown) =>
  axios.isAxiosError(error) && (!error.response || error.response.status >= 500);

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

export function useCareerOperationMutation<TData, TVariables>(
  saveId: string,
  operation: (variables: TVariables, requestId: string) => Promise<TData>,
  options: OperationOptions<TData, TVariables> = {},
) {
  const [operationPhase, setOperationPhase] = useState<CareerOperationPhase>("idle");
  const mutation = useMutation({
    mutationFn: async (variables: TVariables) => {
      const requestId = crypto.randomUUID();
      setOperationPhase("submitting");
      try {
        return await operation(variables, requestId);
      } catch (initialError) {
        if (!recoverable(initialError)) throw initialError;
        setOperationPhase("checking");
        let lastError: unknown = initialError;

        for (let attempt = 0; attempt < 4; attempt += 1) {
          try {
            const status = await body<OperationStatus<TData>>(
              http.get(game(`/saves/${saveId}/operations/${requestId}`)),
            );
            if (status.state === "COMPLETED" && status.response !== null) {
              return status.response;
            }
          } catch (statusError) {
            lastError = statusError;
          }

          try {
            // UNKNOWN means the first delivery never reached Career. PENDING can
            // mean a previous mutation rolled back. Reusing the same ID is safe:
            // the server serializes and replays completed operations.
            return await operation(variables, requestId);
          } catch (retryError) {
            lastError = retryError;
            if (!recoverable(retryError)) throw retryError;
          }
          await wait(350 * (attempt + 1));
        }
        throw lastError;
      } finally {
        setOperationPhase("idle");
      }
    },
    onSuccess: options.onSuccess,
  });

  return { ...mutation, operationPhase };
}
