"use client";

import * as React from "react";
import {
  onlineManager,
  useMutation,
  useQueryClient,
  type UseMutationOptions,
  type UseMutationResult,
} from "@tanstack/react-query";

import {
  enqueueOfflineMutation,
  isLikelyOfflineMutationError,
  isOfflineMutationQueuedResult,
  markOfflineManagedRequest,
  processOfflineMutationQueue,
  type OfflineMutationDefinition,
  type OfflineQueuedMutationResult,
} from "@/lib/offline/mutation-queue";

type UseOfflineMutationOptions<TData, TError, TVariables, TContext> = Omit<
  UseMutationOptions<TData, TError, TVariables, TContext>,
  "mutationFn" | "mutationKey"
> & {
  definition: OfflineMutationDefinition<TVariables, TData>;
  onQueued?: (variables: TVariables, queued: OfflineQueuedMutationResult) => void;
};

type UseOfflineMutationResult<TData, TError, TVariables, TContext> = Omit<
  UseMutationResult<TData, TError, TVariables, TContext>,
  "mutate" | "mutateAsync"
> & {
  mutate: (variables: TVariables) => void;
  mutateAsync: (variables: TVariables) => Promise<TData | OfflineQueuedMutationResult>;
};

export const useOfflineMutation = <
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
>(
  options: UseOfflineMutationOptions<TData, TError, TVariables, TContext>,
): UseOfflineMutationResult<TData, TError, TVariables, TContext> => {
  const { definition, onQueued, onSuccess, ...mutationOptions } = options;
  const queryClient = useQueryClient();

  const wrappedExecute = React.useCallback(
    async (variables: TVariables): Promise<TData> => {
      if (!onlineManager.isOnline()) {
        const queued = enqueueOfflineMutation(definition.key, definition.label, variables);
        onQueued?.(variables, queued);
        return queued as unknown as TData;
      }

      const release = markOfflineManagedRequest();
      try {
        return await definition.execute(variables);
      } catch (error) {
        if (isLikelyOfflineMutationError(error)) {
          const queued = enqueueOfflineMutation(definition.key, definition.label, variables);
          onQueued?.(variables, queued);
          return queued as unknown as TData;
        }
        throw error;
      } finally {
        release();
      }
    },
    [definition, onQueued],
  );

  const wrappedOnSuccess = React.useCallback(
    (data: TData, variables: TVariables, context: TContext) => {
      if (isOfflineMutationQueuedResult(data)) {
        // Already routed to onQueued inside wrappedExecute. Don't fire onSuccess.
        return;
      }
      (onSuccess as ((d: TData, v: TVariables, c: TContext) => void) | undefined)?.(
        data,
        variables,
        context,
      );
    },
    [onSuccess],
  );

  const mutation = useMutation<TData, TError, TVariables, TContext>({
    ...mutationOptions,
    mutationKey: [definition.key],
    mutationFn: wrappedExecute,
    networkMode: "always",
    onSuccess: wrappedOnSuccess as unknown as UseMutationOptions<
      TData,
      TError,
      TVariables,
      TContext
    >["onSuccess"],
  });

  const mutateAsync = React.useCallback(
    async (variables: TVariables) => {
      const result = await mutation.mutateAsync(variables);
      void processOfflineMutationQueue(queryClient);
      return result;
    },
    [mutation, queryClient],
  );

  const mutate = React.useCallback(
    (variables: TVariables) => {
      void mutateAsync(variables).catch(() => {
        // Errors are routed through the mutation's onError callback and/or
        // surfaced as toasts by the caller. Swallow to avoid unhandled
        // rejection overlays when consumers only use `mutate`.
      });
    },
    [mutateAsync],
  );

  return {
    ...mutation,
    mutate,
    mutateAsync,
  };
};

export { isOfflineMutationQueuedResult };
