"use client";

import { Button, Modal } from "@heroui/react";

export type WarningModalLevel = "warning" | "danger";

interface BudgetWarningModalProps {
  /** Which cat to show. `null` keeps the modal closed. */
  level: WarningModalLevel | null;
  onClose: () => void;
}

/**
 * Friendly cat-art popup that greets the user on /analytics when at least
 * one monthly budget is in a warning/danger state. Intentionally mild
 * (emoji + Chinese copy + single dismiss button) — it's a family PWA,
 * not an alerting system. Dedup of "show once per month per session" is
 * done by the caller via sessionStorage.
 */
export function BudgetWarningModal({ level, onClose }: BudgetWarningModalProps) {
  const isDanger = level === "danger";
  const imgSrc = isDanger ? "/danger_cat.png" : "/warning_cat.png";
  const heading = isDanger ? "预算超支提醒" : "预算接近上限";
  const message = isDanger
    ? "已有支出类别超出或即将超出月度预算，注意查看。"
    : "有支出类别按当前节奏预计本月会超支，注意控制。";

  return (
    <Modal.Backdrop
      isOpen={level !== null}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Modal.Container>
        <Modal.Dialog className="sm:max-w-[400px]">
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>{heading}</Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            <div className="flex flex-col items-center gap-3">
              {level && (
                // Public static image — loaded once per browser cache.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imgSrc}
                  alt={heading}
                  className="w-full max-w-[280px] rounded-2xl"
                />
              )}
              <p className="text-center text-sm text-muted">{message}</p>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="primary" onPress={onClose}>
              知道了
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
