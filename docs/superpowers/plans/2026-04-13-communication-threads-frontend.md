# Communication Threads & Read Receipts — Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add reply threading, read receipt timestamps, a "Resposta" badge in the sent list, and deep-link URL support to the Communication module.

**Architecture:** All changes stay within the existing 5-file module (`types`, `NewMessageModal`, `MessageDetail`, `MessageList`, `Communication`). No new files, no new queries — only additive changes to existing components and types. Deep linking uses `useSearchParams` from react-router-dom (already used in the codebase).

**Tech Stack:** React 19, TypeScript, TanStack Query v5, shadcn/ui, Tailwind CSS, React Router v7, date-fns/ptBR

---

## Pre-flight: what already exists vs. what's missing

| Feature | Current state | Delta needed |
|---------|--------------|--------------|
| Reply modal title / Re: subject | ✅ works | Add locked recipient + reference banner + pass `replyToId` to API |
| Mark as read on `getById` | ✅ backend does it | — |
| Read receipt `✓` symbol on recipients | ✅ works | Upgrade to full "Visualizado em: DD/MM HH:MM" label |
| Replies thread display | ❌ missing | Add replies section in `MessageDetail` |
| "Resposta" badge in sent list | ❌ missing | Add conditional badge in `MessageList` |
| Deep link `?msgId=` | ❌ missing | `useEffect` + `useSearchParams` in `Communication.tsx` |
| Types for `replyToId` / `replyTo` / `replies` | ❌ missing | Extend `communication.ts` |

---

## File map

| File | Change |
|------|--------|
| `src/types/communication.ts` | Add `replyToId`, `replyTo`, `replies` to `Message`; add `replyToId` to `MessageListItem`; add `MessageReply` type |
| `src/components/communication/NewMessageModal.tsx` | Pre-load locked recipient in reply mode; show reference banner; pass `replyToId` in POST |
| `src/components/communication/MessageDetail.tsx` | Upgrade read receipt display; add replies thread section |
| `src/components/communication/MessageList.tsx` | Add "Resposta" badge on sent items with `replyToId` |
| `src/pages/Communication.tsx` | Add `useSearchParams` deep-link `useEffect` |

---

## Task 1: Extend TypeScript types

**Files:**
- Modify: `src/types/communication.ts`

- [ ] **Step 1: Replace the file contents**

```typescript
export type MessageUser = {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string | null;
  jobTitle?: string | null;
};

export type MessageAttachment = {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
};

export type MessageRecipient = {
  id: string;
  userId: string;
  role: "TO" | "CC" | "BCC";
  canView: boolean;
  readAt: string | null;
  user: MessageUser;
};

export type MessageReply = {
  id: string;
  title: string;
  sentAt: string | null;
  creator: MessageUser;
  recipients: Array<{ userId: string; readAt: string | null }>;
};

export type MessageReplyTo = {
  id: string;
  title: string;
  sentAt: string | null;
  creator: MessageUser;
};

export type Message = {
  id: string;
  title: string;
  content: string;
  status: "DRAFT" | "SENT" | "READ" | "ARCHIVED";
  sentAt: string | null;
  readAt: string | null;
  replyToId: string | null;
  replyTo: MessageReplyTo | null;
  replies: MessageReply[];
  createdAt: string;
  creator: MessageUser;
  recipients: MessageRecipient[];
  attachments: MessageAttachment[];
  isCreator?: boolean;
  isRecipient?: boolean;
};

export type MessageListItem = {
  id: string;
  title: string;
  status: "DRAFT" | "SENT" | "READ" | "ARCHIVED";
  sentAt: string | null;
  replyToId: string | null;
  creator: MessageUser;
  recipients?: MessageRecipient[];
  isRead?: boolean;
};

export type Recipient = {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar?: string | null;
  role: string;
  hasPermission?: boolean;
};
```

- [ ] **Step 2: Type-check**

```bash
cd /d/PROJECTS/SIMP-FRONTEND
nvm use 22
npx tsc -b
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/communication.ts
git commit -m "feat(communication): extend types with replyToId, replyTo, replies, MessageReply"
```

---

## Task 2: Refactor NewMessageModal — reply mode improvements

**Files:**
- Modify: `src/components/communication/NewMessageModal.tsx`

Three things to add:
1. Pre-load original creator as a **locked** recipient when `open && replyTo`
2. Show a "Referência:" banner inside the ScrollArea above the subject field
3. Pass `replyToId` in the POST body

- [ ] **Step 1: Pre-load locked recipient on reply mode open**

Find the existing `useEffect` that fires on `[open, replyTo]` (lines 56–68) and replace it:

```typescript
  // Pre-fill when replying
  useEffect(() => {
    if (open && replyTo) {
      setSubject(`Re: ${replyTo.subject}`);
      // Lock the original creator as TO recipient
      setSelectedRecipients([{
        id: replyTo.creatorId,
        name: replyTo.creatorName,
        username: "",
        email: "",
        avatar: null,
        jobRole: "",
        role: "TO"
      }]);
    }
    if (!open) {
      setSubject("");
      setBody("");
      setRecipientSearch("");
      setSearchResults([]);
      setSelectedRecipients([]);
      setPendingFiles([]);
    }
  }, [open, replyTo]);
```

- [ ] **Step 2: Lock the recipient field in reply mode**

The "Para" section is in `<div className="px-6 py-4 border-b border-slate-100">`. Replace its entire content with a version that hides the search input when `replyTo` is set:

```tsx
        {/* Campo "Para" — fora do ScrollArea para o dropdown não ser clipado */}
        <div className="px-6 py-4 border-b border-slate-100">
          <div className="space-y-2">
            <Label className="text-sm text-slate-600">Para</Label>

            {/* Chips selecionados */}
            {selectedRecipients.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedRecipients.map(r => (
                  <div
                    key={r.id}
                    className="flex items-center gap-1.5 bg-slate-100 rounded-full px-2 py-1 text-xs"
                  >
                    <button
                      type="button"
                      onClick={() => { if (!replyTo) toggleRole(r.id); }}
                      title={replyTo ? undefined : "Clique para alternar TO / CC / BCC"}
                      disabled={!!replyTo}
                    >
                      <Badge
                        variant={r.role === "TO" ? "default" : "outline"}
                        className="text-[10px] px-1.5 py-0 h-4 cursor-pointer"
                      >
                        {r.role}
                      </Badge>
                    </button>
                    <span className="text-slate-700 font-medium">{r.name}</span>
                    {r.jobRole && (
                      <span className="text-slate-400">· {r.jobRole}</span>
                    )}
                    {!replyTo && (
                      <button
                        type="button"
                        onClick={() => removeRecipient(r.id)}
                        className="text-slate-400 hover:text-red-500 transition-colors ml-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Search input — hidden in reply mode */}
            {!replyTo && (
              <div className="relative" ref={searchWrapperRef}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10" />
                <Input
                  value={recipientSearch}
                  onChange={e => setRecipientSearch(e.target.value)}
                  onFocus={() => setRecipientFocused(true)}
                  placeholder="Buscar destinatário por nome ou e-mail..."
                  className="pl-9"
                  autoComplete="off"
                />
                {searching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 animate-spin" />
                )}

                {recipientFocused && (searchResults.length > 0 || searching || (!searching && recipientSearch.trim().length > 0)) && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-50 border border-slate-200 rounded-lg bg-white shadow-lg max-h-52 overflow-y-auto">
                    {searching ? (
                      <div className="flex items-center justify-center py-4 text-slate-400 text-sm gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Buscando...
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className="py-4 text-center text-sm text-slate-400">
                        Nenhum destinatário encontrado
                      </div>
                    ) : (
                      searchResults.map(r => {
                        const blocked = r.hasPermission === false;
                        return (
                          <button
                            key={r.id}
                            type="button"
                            onMouseDown={e => { e.preventDefault(); addRecipient(r); }}
                            disabled={blocked}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors border-b border-slate-50 last:border-0 ${
                              blocked
                                ? 'opacity-50 cursor-not-allowed bg-slate-50'
                                : 'hover:bg-emerald-50'
                            }`}
                          >
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0 ${blocked ? 'bg-slate-400' : 'bg-emerald-600'}`}>
                              {r.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className={`text-sm font-medium ${blocked ? 'text-slate-400' : 'text-slate-800'}`}>{r.name}</p>
                              <p className="text-xs text-slate-400">{r.role} · {r.email}</p>
                              {blocked && (
                                <p className="flex items-center gap-1 text-[11px] text-amber-600 mt-0.5">
                                  <ShieldOff className="h-3 w-3" />
                                  Sem permissão (Edite em Roles)
                                </p>
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
```

- [ ] **Step 3: Add "Referência:" banner and pass `replyToId` in POST**

Inside the `<ScrollArea>` section, replace the existing subject field block and add a reference banner above it. Find this block (around line 322):

```tsx
            {/* Assunto */}
            <div className="space-y-2">
              <Label className="text-sm text-slate-600">Assunto</Label>
              <Input
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Assunto da mensagem"
              />
            </div>
```

Replace with:

```tsx
            {/* Referência (reply mode) */}
            {replyTo && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500">
                <Reply className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="font-medium text-slate-600 shrink-0">Referência:</span>
                <span className="truncate">{replyTo.subject}</span>
              </div>
            )}

            {/* Assunto */}
            <div className="space-y-2">
              <Label className="text-sm text-slate-600">Assunto</Label>
              <Input
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Assunto da mensagem"
              />
            </div>
```

You also need to add `Reply` to the lucide-react import at the top. Change:

```typescript
import { Search, X, Paperclip, Send, Loader2, FileText, ShieldOff } from "lucide-react";
```

to:

```typescript
import { Search, X, Paperclip, Send, Loader2, FileText, ShieldOff, Reply } from "lucide-react";
```

- [ ] **Step 4: Pass `replyToId` in the POST body**

In `handleSend`, find the `apiRequest` call (around line 187) and update the body:

```typescript
      await apiRequest("/api/v1/communication/messages", {
        method: "POST",
        body: JSON.stringify({
          subject: subject.trim(),
          body: body.trim(),
          recipients: selectedRecipients.map(r => ({ userId: r.id, role: r.role })),
          ...(replyTo ? { replyToId: replyTo.id } : {}),
          ...(uploadedAttachments.length > 0 && { attachments: uploadedAttachments })
        })
      });
```

- [ ] **Step 5: Type-check**

```bash
cd /d/PROJECTS/SIMP-FRONTEND
nvm use 22
npx tsc -b
```

Expected: zero errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/communication/NewMessageModal.tsx
git commit -m "feat(communication): lock recipient in reply mode, show reference banner, pass replyToId"
```

---

## Task 3: Enhance MessageDetail — read receipts + replies thread

**Files:**
- Modify: `src/components/communication/MessageDetail.tsx`

Two additions:
1. Upgrade the read receipt from `✓` to "Visualizado em: DD/MM/AAAA HH:MM" (visible to creator)
2. Add a replies thread section below the message body

- [ ] **Step 1: Upgrade the recipients / read-receipt section**

Find the recipients block (lines 162–185):

```tsx
        {/* Destinatários */}
        {message.recipients.length > 0 && (
          <div className="flex items-start gap-2 text-xs text-slate-500">
            <Users className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <div className="flex flex-wrap gap-1.5">
              {message.recipients.map((r) => (
                <div key={r.id} className="flex items-center gap-1">
                  <span className="text-slate-700">
                    {r.user.firstName} {r.user.lastName}
                  </span>
                  {roleLabel(r.role) && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                      {roleLabel(r.role)}
                    </Badge>
                  )}
                  {r.readAt && (
                    <span className="text-emerald-500" title={`Lido em ${format(new Date(r.readAt), "dd/MM/yyyy HH:mm")}`}>
                      ✓
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
```

Replace with:

```tsx
        {/* Destinatários */}
        {message.recipients.length > 0 && (
          <div className="flex items-start gap-2 text-xs text-slate-500">
            <Users className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <div className="flex flex-col gap-1">
              {message.recipients.map((r) => (
                <div key={r.id} className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-slate-700 font-medium">
                    {r.user.firstName} {r.user.lastName}
                  </span>
                  {roleLabel(r.role) && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                      {roleLabel(r.role)}
                    </Badge>
                  )}
                  {r.readAt ? (
                    <span className="text-emerald-600 flex items-center gap-1">
                      <CheckCheck className="h-3.5 w-3.5" />
                      <span>
                        Visualizado em{" "}
                        {format(new Date(r.readAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </span>
                  ) : (
                    <span className="text-slate-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Aguardando leitura
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
```

Add `CheckCheck` and `Clock` to the lucide-react import. Change:

```typescript
import { Paperclip, Download, Reply, Trash2, Users, Mail, Loader2 } from "lucide-react";
```

to:

```typescript
import { Paperclip, Download, Reply, Trash2, Users, Mail, Loader2, CheckCheck, Clock, CornerDownRight } from "lucide-react";
```

- [ ] **Step 2: Add replies thread section**

After the attachments section (after the closing `</>` of the attachments block, before the closing `</div>` of the outer flex container), add:

```tsx
        {/* Thread de respostas */}
        {message.replies && message.replies.length > 0 && (
          <>
            <Separator />
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <CornerDownRight className="h-3.5 w-3.5" />
                Respostas ({message.replies.length})
              </p>
              <div className="flex flex-col gap-3">
                {message.replies.map((reply) => (
                  <div
                    key={reply.id}
                    className="border border-slate-200 rounded-xl p-4 bg-slate-50 flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-semibold text-white shrink-0">
                          {getInitials(reply.creator.firstName, reply.creator.lastName)}
                        </div>
                        <span className="text-sm font-medium text-slate-900">
                          {reply.creator.firstName} {reply.creator.lastName}
                        </span>
                      </div>
                      {reply.sentAt && (
                        <span className="text-xs text-slate-400 shrink-0">
                          {format(new Date(reply.sentAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-medium text-slate-600">{reply.title}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
```

- [ ] **Step 3: Type-check**

```bash
cd /d/PROJECTS/SIMP-FRONTEND
nvm use 22
npx tsc -b
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/communication/MessageDetail.tsx
git commit -m "feat(communication): show timestamped read receipts and replies thread in MessageDetail"
```

---

## Task 4: Add "Resposta" badge in sent list

**Files:**
- Modify: `src/components/communication/MessageList.tsx`

- [ ] **Step 1: Add the `CornerDownRight` import and conditional badge**

Add `CornerDownRight` to the lucide-react import. Change:

```typescript
import { Inbox, Send, Circle } from "lucide-react";
```

to:

```typescript
import { Inbox, Send, Circle, CornerDownRight } from "lucide-react";
```

- [ ] **Step 2: Add badge inside the message row**

Find the content section inside the `.map((msg) => {` block. Locate the `<div className="flex items-center gap-1.5">` that contains `isUnread` indicator and the title `{msg.title}`:

```tsx
                <div className="flex items-center gap-1.5">
                  {isUnread && (
                    <Circle className="h-2 w-2 fill-emerald-500 text-emerald-500 shrink-0" />
                  )}
                  <p
                    className={cn(
                      "text-xs truncate",
                      isUnread ? "text-slate-800 font-medium" : "text-slate-500"
                    )}
                  >
                    {msg.title}
                  </p>
                </div>
```

Replace with:

```tsx
                <div className="flex items-center gap-1.5">
                  {isUnread && (
                    <Circle className="h-2 w-2 fill-emerald-500 text-emerald-500 shrink-0" />
                  )}
                  <p
                    className={cn(
                      "text-xs truncate",
                      isUnread ? "text-slate-800 font-medium" : "text-slate-500"
                    )}
                  >
                    {msg.title}
                  </p>
                  {tab === "sent" && msg.replyToId && (
                    <span className="shrink-0 flex items-center gap-0.5 text-[10px] font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-1.5 py-0.5 leading-none">
                      <CornerDownRight className="h-2.5 w-2.5" />
                      Resposta
                    </span>
                  )}
                </div>
```

- [ ] **Step 3: Type-check**

```bash
cd /d/PROJECTS/SIMP-FRONTEND
nvm use 22
npx tsc -b
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/communication/MessageList.tsx
git commit -m "feat(communication): show Resposta badge on replied messages in sent list"
```

---

## Task 5: Deep linking via `?msgId=` URL param

**Files:**
- Modify: `src/pages/Communication.tsx`

- [ ] **Step 1: Add `useSearchParams` import and deep-link effect**

Add `useSearchParams` to the react-router-dom import. Change:

```typescript
import { useState, useCallback } from "react";
```

to:

```typescript
import { useState, useCallback, useEffect } from "react";
```

And add the router import (add after the existing imports at the top):

```typescript
import { useSearchParams } from "react-router-dom";
```

- [ ] **Step 2: Wire the deep-link effect**

Inside the `Communication` component function, after the existing state declarations, add:

```typescript
  const [searchParams] = useSearchParams();
```

Then add a `useEffect` after the queries are declared (after `detailQuery`):

```typescript
  // Deep linking: ?msgId=<id> auto-selects the message
  useEffect(() => {
    const msgId = searchParams.get("msgId");
    if (msgId && msgId !== selectedId) {
      setSelectedId(msgId);
    }
  // Only run once on mount (searchParams is stable for initial URL)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
```

- [ ] **Step 3: Type-check**

```bash
cd /d/PROJECTS/SIMP-FRONTEND
nvm use 22
npx tsc -b
```

Expected: zero errors.

- [ ] **Step 4: Run ESLint**

```bash
cd /d/PROJECTS/SIMP-FRONTEND
npx eslint src/pages/Communication.tsx src/components/communication/
```

Expected: zero errors (warnings OK).

- [ ] **Step 5: Commit**

```bash
git add src/pages/Communication.tsx
git commit -m "feat(communication): auto-select message from ?msgId= URL query param (deep link)"
```

---

## Self-review checklist

**Spec coverage:**

| Requirement | Covered by |
|-------------|-----------|
| Modal reutilizável para Responder | Task 2 |
| Props `replyToMessageId`, `initialRecipient`, `referenceSubject` | Task 2 (via existing `replyTo` prop — same data, prop already named correctly in page) |
| Título muda para "Responder Comunicação" | Already done before this plan (`replyTo ? "Responder mensagem" : "Nova Mensagem"`) |
| Campo "Para" pré-selecionado e bloqueado | Task 2, Step 1+2 |
| Elemento visual "Referência:" | Task 2, Step 3 |
| "Visualizado em: DD/MM/AAAA HH:MM" para remetente | Task 3, Step 1 |
| Thread/linha do tempo de respostas | Task 3, Step 2 |
| Botão Responder | Already present in `MessageDetail` — no change needed |
| Badge "Resposta" em Enviados | Task 4 |
| Deep linking `?msgId=` | Task 5 |

All requirements covered. ✅
