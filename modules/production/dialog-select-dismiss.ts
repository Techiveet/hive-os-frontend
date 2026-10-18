/**
 * Portaled Select / popover menus render outside DialogContent. A click that
 * dismisses the menu is also treated as an outside interaction and closes the
 * dialog. Spread these props on Production create/edit DialogContent so only
 * Cancel / X close the form.
 */
function blockOutsideDismiss(event: { preventDefault: () => void }) {
  event.preventDefault();
}

function isPortaledMenuTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest('[data-slot="select-content"]') ||
      target.closest("[data-radix-select-content]") ||
      target.closest("[data-radix-popper-content-wrapper]") ||
      target.closest('[data-slot="popover-content"]') ||
      target.closest("[data-radix-popover-content]") ||
      target.closest('[role="listbox"]'),
  );
}

function preventDialogDismissForPortaledMenu(event: {
  preventDefault: () => void;
  target: EventTarget | null;
}) {
  if (isPortaledMenuTarget(event.target)) event.preventDefault();
}

export const dialogSelectDismissProps = {
  onPointerDownOutside: blockOutsideDismiss,
  onInteractOutside: blockOutsideDismiss,
  onFocusOutside: preventDialogDismissForPortaledMenu,
} as const;
