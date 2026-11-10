/** Unsaved Log sheet text, kept when the sheet closes so a stray tap loses nothing (05-ui Log sheet). */
export type Draft = { id: string; openedAt: string; text: string };

export const newDraft = (): Draft => ({ id: crypto.randomUUID(), openedAt: new Date().toISOString(), text: '' });

/**
 * One draft per sheet ('now', or 'fill:<slot start>'). The id and form-open time stay with the text, so a resend after an
 * unknown result can't create a second Entry (AC-2.2). Empty text means a fresh draft next time.
 */
export const drafts = new Map<string, Draft>();

/** Forget kept drafts (tests). */
export const clearDrafts = () => drafts.clear();
