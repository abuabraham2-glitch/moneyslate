export function shouldAllowDialogClose(isDirty: boolean) {
  return !isDirty;
}

export function maybeCloseDirtyDialog(isDirty: boolean, onOpenChange: (open: boolean) => void) {
  if (isDirty) return;
  onOpenChange(false);
}