"use client";

import { useRef, useState, ReactNode } from "react";
import { AlertDialog, Button, useOverlayState } from "@heroui/react";

/**
 * Imperative replacement for window.confirm() using HeroUI's AlertDialog.
 *
 * Usage:
 *   const [confirm, ConfirmDialog] = useConfirmDialog();
 *
 *   async function handleDelete() {
 *     const ok = await confirm({
 *       heading: "确定删除？",
 *       body: "此操作不可恢复。",
 *       status: "danger",
 *     });
 *     if (!ok) return;
 *     // ...delete
 *   }
 *
 *   return <>
 *     <Button onPress={handleDelete}>删除</Button>
 *     <ConfirmDialog />
 *   </>;
 */

export interface ConfirmDialogOptions {
  heading: string;
  body: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  status?: "danger" | "warning" | "accent" | "success";
}

type Resolver = (value: boolean) => void;

export function useConfirmDialog(): [
  (options: ConfirmDialogOptions) => Promise<boolean>,
  () => React.ReactElement | null,
] {
  const state = useOverlayState();
  const resolverRef = useRef<Resolver | null>(null);
  const [options, setOptions] = useState<ConfirmDialogOptions | null>(null);

  function confirm(opts: ConfirmDialogOptions): Promise<boolean> {
    setOptions(opts);
    state.open();
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }

  function resolve(value: boolean) {
    resolverRef.current?.(value);
    resolverRef.current = null;
    state.close();
  }

  function Renderer() {
    if (!options) return null;

    return (
      <AlertDialog.Backdrop
        isOpen={state.isOpen}
        onOpenChange={(next) => {
          // Any close (backdrop click, Escape, X button) resolves as cancel
          // if we still have a pending resolver.
          if (!next && resolverRef.current) {
            resolverRef.current(false);
            resolverRef.current = null;
          }
          state.setOpen(next);
        }}
      >
        <AlertDialog.Container>
          <AlertDialog.Dialog className="sm:max-w-[400px]">
            <AlertDialog.CloseTrigger />
            <AlertDialog.Header>
              <AlertDialog.Icon status={options.status ?? "danger"} />
              <AlertDialog.Heading>{options.heading}</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>{options.body}</AlertDialog.Body>
            <AlertDialog.Footer>
              <Button variant="tertiary" onPress={() => resolve(false)}>
                {options.cancelLabel ?? "取消"}
              </Button>
              <Button
                variant={options.status === "danger" ? "danger" : "primary"}
                onPress={() => resolve(true)}
              >
                {options.confirmLabel ?? "确认"}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    );
  }

  return [confirm, Renderer];
}
