# Convênios — Refinamento Avançado: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the Convênios module from a static-typed MVP to a fully relational, permission-aware, UX-polished system with dynamic types, linked entities, and auto-calculated date fields.

**Architecture:** Backend: remove `CovenantType` enum → new `CovenantType` / `Convenente` / `Concedente` Prisma models; `Covenant` gains FKs for `typeId`, `proponentId`, `convenenteId`, `concedenteId`. New sub-resource CRUD endpoints under `/api/v1/covenants/`. Frontend: `CovenantFormDialog` rewritten with dynamic selects + inline "create entity" mini-dialogs; `CovenantsPage` and `CovenantDetailSheet` updated to match new schema.

**Tech Stack:** Prisma 5, Fastify, Zod, TypeScript 5, React 19, TanStack Query v5, shadcn/ui, date-fns, Tailwind CSS

---

## File Map

**Backend (SIMP-BACKEND)**
- Modify: `prisma/schema.prisma` — remove enum, add 3 new models, update `Covenant`
- Modify: `src/controllers/covenant.controller.ts` — full rewrite: updated schemas + 3 new sub-resource controllers
- Modify: `src/routes/covenant.routes.ts` — add sub-resource routes before `/:id`
- Modify: `src/controllers/role.controller.ts` — add `covenants` to `AVAILABLE_PERMISSIONS`

**Frontend (SIMP-FRONTEND)**
- Modify: `src/lib/api/covenants.ts` — new types + service functions for types/convenentes/concedentes
- Modify: `src/hooks/useCovenants.ts` — new hooks
- Modify: `src/pages/convenios/CovenantFormDialog.tsx` — full rewrite
- Modify: `src/pages/convenios/CovenantsPage.tsx` — dynamic type filter + updated column rendering
- Modify: `src/pages/convenios/CovenantDetailSheet.tsx` — updated field display
- Modify: `src/pages/admin/AdminOrganizationDetailPage.tsx` — add `covenants` to `MODULE_LABELS`
- Modify: `src/pages/Roles.tsx` — add covenants to `FALLBACK_CATALOG` + `CATEGORY_MODULE_MAP`

---

## Task 1: Prisma Schema Migration

**Files:**
- Modify: `D:/PROJECTS/SIMP-BACKEND/prisma/schema.prisma`

- [ ] **Step 1.1: Replace the CovenantType enum and update the Covenant model**

Find and replace the entire block from `// ─── Convênios` to the end of the file with:

```prisma
// ─── Convênios, Emendas e Transferências ─────────────────────────────────────

model CovenantType {
  id             String   @id @default(uuid())
  organizationId String   @map("organization_id")
  name           String
  createdAt      DateTime @default(now()) @map("created_at")

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  covenants    Covenant[]

  @@unique([organizationId, name])
  @@map("covenant_types")
}

model Convenente {
  id             String   @id @default(uuid())
  organizationId String   @map("organization_id")
  name           String
  cnpj           String?
  createdAt      DateTime @default(now()) @map("created_at")

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  covenants    Covenant[]

  @@unique([organizationId, name])
  @@map("convenentes")
}

model Concedente {
  id             String   @id @default(uuid())
  organizationId String   @map("organization_id")
  name           String
  cnpj           String?
  createdAt      DateTime @default(now()) @map("created_at")

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  covenants    Covenant[]

  @@unique([organizationId, name])
  @@map("concedentes")
}

enum CovenantStatus {
  EM_ANALISE
  APROVADO
  EM_EXECUCAO
  PRESTACAO_CONTAS
  CONCLUIDO
  DEVOLVIDO
}

model Covenant {
  id             String  @id @default(uuid())
  organizationId String  @map("organization_id")
  number         String

  typeId         String?  @map("type_id")
  proponentId    String?  @map("proponent_id")
  convenenteId   String?  @map("convenente_id")
  concedenteId   String?  @map("concedente_id")

  processObject   String  @db.Text @map("process_object")
  budgetaryAction String? @map("budgetary_action")

  executionStartDate DateTime?  @map("execution_start_date")
  validityStartDate  DateTime?  @map("validity_start_date")
  validityEndDate    DateTime?  @map("validity_end_date")
  termDays           Int?       @map("term_days")

  transferValue    Decimal?  @db.Decimal(15, 2) @map("transfer_value")
  counterpartValue Decimal?  @db.Decimal(15, 2) @map("counterpart_value")

  status       CovenantStatus @default(EM_ANALISE)

  bankName     String?  @map("bank_name")
  bankAgency   String?  @map("bank_agency")
  bankAccount  String?  @map("bank_account")

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt      @map("updated_at")

  organization     Organization          @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  covenantType     CovenantType?         @relation(fields: [typeId], references: [id], onDelete: SetNull)
  proponent        VirtualProcessCompany? @relation(fields: [proponentId], references: [id], onDelete: SetNull)
  convenente       Convenente?           @relation(fields: [convenenteId], references: [id], onDelete: SetNull)
  concedente       Concedente?           @relation(fields: [concedenteId], references: [id], onDelete: SetNull)
  virtualProcesses VirtualProcess[]
  libraryDocuments LibraryDocument[]

  @@unique([organizationId, number])
  @@index([organizationId, status])
  @@index([organizationId, typeId])
  @@map("covenants")
}
```

- [ ] **Step 1.2: Add reverse relation to VirtualProcessCompany**

In `schema.prisma`, find the `VirtualProcessCompany` model and add `covenants Covenant[]` before the closing `@@unique`:

```prisma
model VirtualProcessCompany {
  id             String   @id @default(uuid())
  organizationId String   @map("organization_id")
  name           String
  cnpj           String?
  createdAt      DateTime @default(now()) @map("created_at")

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  covenants    Covenant[]

  @@unique([organizationId, name])
  @@map("virtual_process_companies")
}
```

- [ ] **Step 1.3: Add reverse relations to Organization model**

In `schema.prisma`, find the `Organization` model. After `covenants Covenant[]` add:

```prisma
  covenantTypes  CovenantType[]
  convenentes    Convenente[]
  concedentes    Concedente[]
```

- [ ] **Step 1.4: Run db push and generate**

```bash
cd D:/PROJECTS/SIMP-BACKEND
nvm use 22
npx prisma db push
npx prisma generate
```

Expected: `Your database is now in sync with your Prisma schema.` and `Generated Prisma Client`.

---

## Task 2: Backend — Covenant Controller Rewrite

**Files:**
- Modify: `D:/PROJECTS/SIMP-BACKEND/src/controllers/covenant.controller.ts`

- [ ] **Step 2.1: Replace the entire file**

```typescript
import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma, db } from '@/utils/database.js'
import { logger } from '@/utils/logger.js'
import { z } from 'zod'
import { CovenantStatus } from '@prisma/client'

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const covenantCreateSchema = z.object({
  number:          z.string().min(1),
  typeId:          z.string().uuid().optional(),
  proponentId:     z.string().uuid().optional(),
  convenenteId:    z.string().uuid().optional(),
  concedenteId:    z.string().uuid().optional(),
  processObject:   z.string().min(1),
  status:          z.nativeEnum(CovenantStatus).default('EM_ANALISE'),
  budgetaryAction:    z.string().optional(),
  executionStartDate: z.coerce.date().optional(),
  validityStartDate:  z.coerce.date().optional(),
  validityEndDate:    z.coerce.date().optional(),
  termDays:           z.coerce.number().int().positive().optional(),
  transferValue:      z.coerce.number().positive().optional(),
  counterpartValue:   z.coerce.number().nonnegative().optional(),
  bankName:    z.string().optional(),
  bankAgency:  z.string().optional(),
  bankAccount: z.string().optional(),
})

const covenantUpdateSchema = covenantCreateSchema.partial()

const entitySchema = z.object({
  name: z.string().min(1),
  cnpj: z.string().optional(),
})

const idParam = z.object({ id: z.string().uuid() })

// ─── Covenant CRUD ────────────────────────────────────────────────────────────

export class CovenantController {
  async list(request: FastifyRequest, reply: FastifyReply) {
    try {
      const organizationId = (request as { user: { organizationId: string; isSuperAdmin: boolean } }).user.organizationId
      const isSuperAdmin   = (request as { user: { organizationId: string; isSuperAdmin: boolean } }).user.isSuperAdmin
      const orgFilter      = isSuperAdmin ? {} : { organizationId }

      const querySchema = z.object({
        page:   z.coerce.number().min(1).default(1),
        limit:  z.coerce.number().min(1).max(100).default(50),
        search: z.string().optional(),
        typeId: z.string().optional(),
        status: z.nativeEnum(CovenantStatus).optional(),
      })

      const query = querySchema.parse(request.query)
      const where: Record<string, unknown> = { ...orgFilter }

      if (query.search) {
        where.OR = [
          { number:        { contains: query.search, mode: 'insensitive' } },
          { processObject: { contains: query.search, mode: 'insensitive' } },
          { proponent:     { name: { contains: query.search, mode: 'insensitive' } } },
        ]
      }
      if (query.typeId) where.typeId = query.typeId
      if (query.status) where.status = query.status

      const total     = await prisma.covenant.count({ where })
      const covenants = await prisma.covenant.findMany({
        where,
        skip:    (query.page - 1) * query.limit,
        take:    query.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          covenantType: { select: { id: true, name: true } },
          proponent:    { select: { id: true, name: true, cnpj: true } },
          convenente:   { select: { id: true, name: true, cnpj: true } },
          concedente:   { select: { id: true, name: true, cnpj: true } },
          _count: { select: { virtualProcesses: true, libraryDocuments: true } },
        },
      })

      return reply.send(db.paginate(covenants, query.page, query.limit, total))
    } catch (error: unknown) {
      logger.error(error, 'Failed to list covenants')
      return reply.code(500).send({ error: 'Fetch Failed', message: (error as Error).message })
    }
  }

  async getOne(request: FastifyRequest, reply: FastifyReply) {
    try {
      const organizationId = (request as { user: { organizationId: string } }).user.organizationId
      const { id } = idParam.parse(request.params)

      const covenant = await prisma.covenant.findFirst({
        where: { id, organizationId },
        include: {
          covenantType: { select: { id: true, name: true } },
          proponent:    { select: { id: true, name: true, cnpj: true } },
          convenente:   { select: { id: true, name: true, cnpj: true } },
          concedente:   { select: { id: true, name: true, cnpj: true } },
          virtualProcesses: {
            select: {
              id: true, processNumber: true, status: true, subject: true,
              documents: {
                select: {
                  id: true, tag: true, description: true,
                  fileName: true, fileUrl: true, fileSize: true, uploadedAt: true,
                  uploader: { select: { id: true, firstName: true, lastName: true } },
                },
              },
            },
          },
          libraryDocuments: {
            where: { deletedAt: null },
            select: {
              id: true, title: true, fileName: true, fileSize: true,
              mimeType: true, accessLevel: true, createdAt: true,
              uploader: { select: { id: true, firstName: true, lastName: true, avatar: true } },
              category: { select: { id: true, name: true } },
            },
          },
        },
      })

      if (!covenant) return reply.code(404).send({ error: 'Not Found', message: 'Convênio não encontrado' })
      return reply.send(covenant)
    } catch (error: unknown) {
      logger.error(error, 'Failed to get covenant')
      return reply.code(500).send({ error: 'Fetch Failed', message: (error as Error).message })
    }
  }

  async create(request: FastifyRequest, reply: FastifyReply) {
    try {
      const organizationId = (request as { user: { organizationId: string } }).user.organizationId
      const data = covenantCreateSchema.parse(request.body)

      const covenant = await prisma.covenant.create({
        data: {
          number:        data.number,
          processObject: data.processObject,
          status:        data.status,
          organization:  { connect: { id: organizationId } },
          ...(data.typeId       && { covenantType: { connect: { id: data.typeId } } }),
          ...(data.proponentId  && { proponent:    { connect: { id: data.proponentId } } }),
          ...(data.convenenteId && { convenente:   { connect: { id: data.convenenteId } } }),
          ...(data.concedenteId && { concedente:   { connect: { id: data.concedenteId } } }),
          budgetaryAction:    data.budgetaryAction,
          executionStartDate: data.executionStartDate,
          validityStartDate:  data.validityStartDate,
          validityEndDate:    data.validityEndDate,
          termDays:           data.termDays,
          transferValue:      data.transferValue,
          counterpartValue:   data.counterpartValue,
          bankName:    data.bankName,
          bankAgency:  data.bankAgency,
          bankAccount: data.bankAccount,
        },
      })

      return reply.code(201).send(covenant)
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Validation Error', issues: error.issues })
      }
      logger.error(error, 'Failed to create covenant')
      return reply.code(500).send({ error: 'Create Failed', message: (error as Error).message })
    }
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    try {
      const organizationId = (request as { user: { organizationId: string } }).user.organizationId
      const { id } = idParam.parse(request.params)
      const data = covenantUpdateSchema.parse(request.body)

      const existing = await prisma.covenant.findFirst({ where: { id, organizationId } })
      if (!existing) return reply.code(404).send({ error: 'Not Found', message: 'Convênio não encontrado' })

      const updated = await prisma.covenant.update({
        where: { id },
        data: {
          ...(data.number        !== undefined && { number: data.number }),
          ...(data.processObject !== undefined && { processObject: data.processObject }),
          ...(data.status        !== undefined && { status: data.status }),
          ...(data.typeId        !== undefined && { covenantType: data.typeId ? { connect: { id: data.typeId } } : { disconnect: true } }),
          ...(data.proponentId   !== undefined && { proponent:   data.proponentId  ? { connect: { id: data.proponentId } }  : { disconnect: true } }),
          ...(data.convenenteId  !== undefined && { convenente:  data.convenenteId ? { connect: { id: data.convenenteId } } : { disconnect: true } }),
          ...(data.concedenteId  !== undefined && { concedente:  data.concedenteId ? { connect: { id: data.concedenteId } } : { disconnect: true } }),
          budgetaryAction:    data.budgetaryAction,
          executionStartDate: data.executionStartDate,
          validityStartDate:  data.validityStartDate,
          validityEndDate:    data.validityEndDate,
          termDays:           data.termDays,
          transferValue:      data.transferValue,
          counterpartValue:   data.counterpartValue,
          bankName:    data.bankName,
          bankAgency:  data.bankAgency,
          bankAccount: data.bankAccount,
        },
      })

      return reply.send(updated)
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Validation Error', issues: error.issues })
      }
      logger.error(error, 'Failed to update covenant')
      return reply.code(500).send({ error: 'Update Failed', message: (error as Error).message })
    }
  }

  async delete(request: FastifyRequest, reply: FastifyReply) {
    try {
      const organizationId = (request as { user: { organizationId: string } }).user.organizationId
      const { id } = idParam.parse(request.params)

      const existing = await prisma.covenant.findFirst({ where: { id, organizationId } })
      if (!existing) return reply.code(404).send({ error: 'Not Found', message: 'Convênio não encontrado' })

      await prisma.covenant.delete({ where: { id } })
      return reply.code(204).send()
    } catch (error: unknown) {
      logger.error(error, 'Failed to delete covenant')
      return reply.code(500).send({ error: 'Delete Failed', message: (error as Error).message })
    }
  }
}

// ─── CovenantType sub-resource ────────────────────────────────────────────────

export const covenantTypeController = {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const organizationId = (request as { user: { organizationId: string; isSuperAdmin: boolean } }).user.organizationId
    const isSuperAdmin   = (request as { user: { organizationId: string; isSuperAdmin: boolean } }).user.isSuperAdmin
    const orgFilter      = isSuperAdmin ? {} : { organizationId }
    const types = await prisma.covenantType.findMany({
      where: orgFilter, orderBy: { name: 'asc' },
    })
    return reply.send(types)
  },

  async create(request: FastifyRequest, reply: FastifyReply) {
    try {
      const organizationId = (request as { user: { organizationId: string } }).user.organizationId
      const { name } = z.object({ name: z.string().min(1) }).parse(request.body)
      const type = await prisma.covenantType.create({
        data: { organizationId, name },
      })
      return reply.code(201).send(type)
    } catch (error: unknown) {
      if (error instanceof z.ZodError) return reply.code(400).send({ error: 'Validation Error', issues: error.issues })
      return reply.code(500).send({ error: 'Create Failed', message: (error as Error).message })
    }
  },

  async delete(request: FastifyRequest, reply: FastifyReply) {
    try {
      const organizationId = (request as { user: { organizationId: string } }).user.organizationId
      const { id } = idParam.parse(request.params)
      const existing = await prisma.covenantType.findFirst({ where: { id, organizationId } })
      if (!existing) return reply.code(404).send({ error: 'Not Found' })
      await prisma.covenantType.delete({ where: { id } })
      return reply.code(204).send()
    } catch (error: unknown) {
      return reply.code(500).send({ error: 'Delete Failed', message: (error as Error).message })
    }
  },
}

// ─── Convenente sub-resource ──────────────────────────────────────────────────

export const convenenteController = {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const organizationId = (request as { user: { organizationId: string; isSuperAdmin: boolean } }).user.organizationId
    const isSuperAdmin   = (request as { user: { organizationId: string; isSuperAdmin: boolean } }).user.isSuperAdmin
    const orgFilter      = isSuperAdmin ? {} : { organizationId }
    const items = await prisma.convenente.findMany({
      where: orgFilter, orderBy: { name: 'asc' },
    })
    return reply.send(items)
  },

  async create(request: FastifyRequest, reply: FastifyReply) {
    try {
      const organizationId = (request as { user: { organizationId: string } }).user.organizationId
      const data = entitySchema.parse(request.body)
      const item = await prisma.convenente.create({
        data: { organizationId, name: data.name, cnpj: data.cnpj },
      })
      return reply.code(201).send(item)
    } catch (error: unknown) {
      if (error instanceof z.ZodError) return reply.code(400).send({ error: 'Validation Error', issues: error.issues })
      return reply.code(500).send({ error: 'Create Failed', message: (error as Error).message })
    }
  },

  async delete(request: FastifyRequest, reply: FastifyReply) {
    try {
      const organizationId = (request as { user: { organizationId: string } }).user.organizationId
      const { id } = idParam.parse(request.params)
      const existing = await prisma.convenente.findFirst({ where: { id, organizationId } })
      if (!existing) return reply.code(404).send({ error: 'Not Found' })
      await prisma.convenente.delete({ where: { id } })
      return reply.code(204).send()
    } catch (error: unknown) {
      return reply.code(500).send({ error: 'Delete Failed', message: (error as Error).message })
    }
  },
}

// ─── Concedente sub-resource ──────────────────────────────────────────────────

export const concedenteController = {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const organizationId = (request as { user: { organizationId: string; isSuperAdmin: boolean } }).user.organizationId
    const isSuperAdmin   = (request as { user: { organizationId: string; isSuperAdmin: boolean } }).user.isSuperAdmin
    const orgFilter      = isSuperAdmin ? {} : { organizationId }
    const items = await prisma.concedente.findMany({
      where: orgFilter, orderBy: { name: 'asc' },
    })
    return reply.send(items)
  },

  async create(request: FastifyRequest, reply: FastifyReply) {
    try {
      const organizationId = (request as { user: { organizationId: string } }).user.organizationId
      const data = entitySchema.parse(request.body)
      const item = await prisma.concedente.create({
        data: { organizationId, name: data.name, cnpj: data.cnpj },
      })
      return reply.code(201).send(item)
    } catch (error: unknown) {
      if (error instanceof z.ZodError) return reply.code(400).send({ error: 'Validation Error', issues: error.issues })
      return reply.code(500).send({ error: 'Create Failed', message: (error as Error).message })
    }
  },

  async delete(request: FastifyRequest, reply: FastifyReply) {
    try {
      const organizationId = (request as { user: { organizationId: string } }).user.organizationId
      const { id } = idParam.parse(request.params)
      const existing = await prisma.concedente.findFirst({ where: { id, organizationId } })
      if (!existing) return reply.code(404).send({ error: 'Not Found' })
      await prisma.concedente.delete({ where: { id } })
      return reply.code(204).send()
    } catch (error: unknown) {
      return reply.code(500).send({ error: 'Delete Failed', message: (error as Error).message })
    }
  },
}

export const covenantController = new CovenantController()
```

---

## Task 3: Backend — Update Routes

**Files:**
- Modify: `D:/PROJECTS/SIMP-BACKEND/src/routes/covenant.routes.ts`

- [ ] **Step 3.1: Replace the entire file**

```typescript
import { FastifyInstance } from 'fastify'
import {
  covenantController,
  covenantTypeController,
  convenenteController,
  concedenteController,
} from '@/controllers/covenant.controller.js'
import { authMiddleware, requireAnyPermission, requireModule } from '@/middleware/auth.middleware.js'

export async function covenantRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware)
  app.addHook('preHandler', requireModule('covenants'))

  // ── CovenantType sub-resource ─────────────────────────────────────────────
  app.get(
    '/types',
    { preHandler: [requireAnyPermission(['covenants:read', 'covenants:write', 'covenants:delete'])] },
    covenantTypeController.list.bind(covenantTypeController)
  )
  app.post(
    '/types',
    { preHandler: [requireAnyPermission(['covenants:write'])] },
    covenantTypeController.create.bind(covenantTypeController)
  )
  app.delete(
    '/types/:id',
    { preHandler: [requireAnyPermission(['covenants:delete'])] },
    covenantTypeController.delete.bind(covenantTypeController)
  )

  // ── Convenente sub-resource ───────────────────────────────────────────────
  app.get(
    '/convenentes',
    { preHandler: [requireAnyPermission(['covenants:read', 'covenants:write', 'covenants:delete'])] },
    convenenteController.list.bind(convenenteController)
  )
  app.post(
    '/convenentes',
    { preHandler: [requireAnyPermission(['covenants:write'])] },
    convenenteController.create.bind(convenenteController)
  )
  app.delete(
    '/convenentes/:id',
    { preHandler: [requireAnyPermission(['covenants:delete'])] },
    convenenteController.delete.bind(convenenteController)
  )

  // ── Concedente sub-resource ───────────────────────────────────────────────
  app.get(
    '/concedentes',
    { preHandler: [requireAnyPermission(['covenants:read', 'covenants:write', 'covenants:delete'])] },
    concedenteController.list.bind(concedenteController)
  )
  app.post(
    '/concedentes',
    { preHandler: [requireAnyPermission(['covenants:write'])] },
    concedenteController.create.bind(concedenteController)
  )
  app.delete(
    '/concedentes/:id',
    { preHandler: [requireAnyPermission(['covenants:delete'])] },
    concedenteController.delete.bind(concedenteController)
  )

  // ── Covenant CRUD (/:id must come AFTER static sub-routes) ───────────────
  app.get(
    '/',
    { preHandler: [requireAnyPermission(['covenants:read', 'covenants:write', 'covenants:delete'])] },
    covenantController.list.bind(covenantController)
  )
  app.get(
    '/:id',
    { preHandler: [requireAnyPermission(['covenants:read', 'covenants:write', 'covenants:delete'])] },
    covenantController.getOne.bind(covenantController)
  )
  app.post(
    '/',
    { preHandler: [requireAnyPermission(['covenants:write'])] },
    covenantController.create.bind(covenantController)
  )
  app.put(
    '/:id',
    { preHandler: [requireAnyPermission(['covenants:write'])] },
    covenantController.update.bind(covenantController)
  )
  app.delete(
    '/:id',
    { preHandler: [requireAnyPermission(['covenants:delete'])] },
    covenantController.delete.bind(covenantController)
  )
}
```

---

## Task 4: Backend — Add Covenants to AVAILABLE_PERMISSIONS

**Files:**
- Modify: `D:/PROJECTS/SIMP-BACKEND/src/controllers/role.controller.ts`

- [ ] **Step 4.1: Add covenants entry after the `library` block (around line 82, before the closing `}` of AVAILABLE_PERMISSIONS)**

Find:
```typescript
  library: {
    displayName: 'Biblioteca Digital (GED)',
    permissions: [
      { key: 'library:read',   description: 'Visualizar e baixar documentos da biblioteca', level: 'read' },
      { key: 'library:write',  description: 'Fazer upload de documentos',                   level: 'write' },
      { key: 'library:delete', description: 'Excluir documentos da biblioteca',              level: 'delete' },
      { key: 'library:logs',   description: 'Visualizar histórico de auditoria da biblioteca', level: 'read' }
    ]
  }
}
```

Replace with:
```typescript
  library: {
    displayName: 'Biblioteca Digital (GED)',
    permissions: [
      { key: 'library:read',   description: 'Visualizar e baixar documentos da biblioteca', level: 'read' },
      { key: 'library:write',  description: 'Fazer upload de documentos',                   level: 'write' },
      { key: 'library:delete', description: 'Excluir documentos da biblioteca',              level: 'delete' },
      { key: 'library:logs',   description: 'Visualizar histórico de auditoria da biblioteca', level: 'read' }
    ]
  },
  covenants: {
    displayName: 'Convênios, Emendas e Transferências',
    permissions: [
      { key: 'covenants:read',   description: 'Visualizar convênios e transferências', level: 'read' },
      { key: 'covenants:write',  description: 'Criar e editar convênios',              level: 'write' },
      { key: 'covenants:delete', description: 'Excluir convênios',                     level: 'delete' },
    ]
  }
}
```

---

## Task 5: Backend TypeScript Check + Commit

- [ ] **Step 5.1: Run type check**

```bash
cd D:/PROJECTS/SIMP-BACKEND
nvm use 22
npx tsc -b
```

Expected: zero errors. If errors appear, fix them before continuing.

- [ ] **Step 5.2: Commit backend changes**

```bash
cd D:/PROJECTS/SIMP-BACKEND
git add prisma/schema.prisma src/controllers/covenant.controller.ts src/routes/covenant.routes.ts src/controllers/role.controller.ts
git commit -m "$(cat <<'EOF'
feat(covenants): dynamic types, convenente/concedente entities, new sub-resource endpoints

- Replace CovenantType enum with dynamic CovenantType model (per-org)
- Add Convenente and Concedente models (name + cnpj, covenants-only)
- Add proponentId FK to VirtualProcessCompany (shared with processos)
- Add validityStartDate + validityEndDate, replace single validityDate
- New GET/POST/DELETE routes for /types, /convenentes, /concedentes
- Add covenants category to AVAILABLE_PERMISSIONS

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Frontend — Update API Types and Service

**Files:**
- Modify: `D:/PROJECTS/SIMP-FRONTEND/src/lib/api/covenants.ts`

- [ ] **Step 6.1: Replace the entire file**

```typescript
import { api } from '../api'
import type { VirtualProcessCompany } from './virtual-processes'

// ─── Status (still an enum — unchanged) ─────────────────────────────────────

export type CovenantStatus =
  | 'EM_ANALISE'
  | 'APROVADO'
  | 'EM_EXECUCAO'
  | 'PRESTACAO_CONTAS'
  | 'CONCLUIDO'
  | 'DEVOLVIDO'

// ─── Related entity types ────────────────────────────────────────────────────

export interface CovenantType {
  id: string
  organizationId: string
  name: string
  createdAt: string
}

export interface Convenente {
  id: string
  organizationId: string
  name: string
  cnpj?: string | null
  createdAt: string
}

export interface Concedente {
  id: string
  organizationId: string
  name: string
  cnpj?: string | null
  createdAt: string
}

// ─── Covenant ────────────────────────────────────────────────────────────────

export interface Covenant {
  id: string
  organizationId: string
  number: string
  typeId?: string | null
  proponentId?: string | null
  convenenteId?: string | null
  concedenteId?: string | null
  processObject: string
  budgetaryAction?: string | null
  executionStartDate?: string | null
  validityStartDate?: string | null
  validityEndDate?: string | null
  termDays?: number | null
  transferValue?: string | null
  counterpartValue?: string | null
  status: CovenantStatus
  bankName?: string | null
  bankAgency?: string | null
  bankAccount?: string | null
  createdAt: string
  updatedAt: string
  // Relations (populated by getOne/list)
  covenantType?: Pick<CovenantType, 'id' | 'name'> | null
  proponent?: Pick<VirtualProcessCompany, 'id' | 'name' | 'cnpj'> | null
  convenente?: Pick<Convenente, 'id' | 'name' | 'cnpj'> | null
  concedente?: Pick<Concedente, 'id' | 'name' | 'cnpj'> | null
  _count?: { virtualProcesses: number; libraryDocuments: number }
}

export interface CovenantListResponse {
  data: Covenant[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

export interface CreateCovenantDTO {
  number: string
  typeId?: string
  proponentId?: string
  convenenteId?: string
  concedenteId?: string
  processObject: string
  budgetaryAction?: string
  executionStartDate?: string
  validityStartDate?: string
  validityEndDate?: string
  termDays?: number
  transferValue?: number
  counterpartValue?: number
  status?: CovenantStatus
  bankName?: string
  bankAgency?: string
  bankAccount?: string
}

export type UpdateCovenantDTO = Partial<CreateCovenantDTO>

// ─── Service ─────────────────────────────────────────────────────────────────

export const covenantService = {
  list: async (params?: {
    page?: number; limit?: number; search?: string
    typeId?: string; status?: CovenantStatus
  }) => {
    const q = new URLSearchParams()
    if (params?.page)   q.append('page',   String(params.page))
    if (params?.limit)  q.append('limit',  String(params.limit))
    if (params?.search) q.append('search', params.search)
    if (params?.typeId) q.append('typeId', params.typeId)
    if (params?.status) q.append('status', params.status)
    const qs = q.toString() ? `?${q.toString()}` : ''
    const res = await api.get<CovenantListResponse>(`/covenants/${qs}`)
    return res.data
  },

  getOne: async (id: string) => {
    const res = await api.get<Covenant>(`/covenants/${id}`)
    return res.data
  },

  create: async (data: CreateCovenantDTO) => {
    const res = await api.post<Covenant>('/covenants/', data)
    return res.data
  },

  update: async (id: string, data: UpdateCovenantDTO) => {
    const res = await api.put<Covenant>(`/covenants/${id}`, data)
    return res.data
  },

  delete: async (id: string) => {
    await api.delete(`/covenants/${id}`)
  },

  // ── CovenantType ───────────────────────────────────────────────────────────
  listTypes: async () => {
    const res = await api.get<CovenantType[]>('/covenants/types')
    return res.data
  },
  createType: async (name: string) => {
    const res = await api.post<CovenantType>('/covenants/types', { name })
    return res.data
  },
  deleteType: async (id: string) => {
    await api.delete(`/covenants/types/${id}`)
  },

  // ── Convenente ─────────────────────────────────────────────────────────────
  listConvenentes: async () => {
    const res = await api.get<Convenente[]>('/covenants/convenentes')
    return res.data
  },
  createConvenente: async (data: { name: string; cnpj?: string }) => {
    const res = await api.post<Convenente>('/covenants/convenentes', data)
    return res.data
  },
  deleteConvenente: async (id: string) => {
    await api.delete(`/covenants/convenentes/${id}`)
  },

  // ── Concedente ─────────────────────────────────────────────────────────────
  listConcedentes: async () => {
    const res = await api.get<Concedente[]>('/covenants/concedentes')
    return res.data
  },
  createConcedente: async (data: { name: string; cnpj?: string }) => {
    const res = await api.post<Concedente>('/covenants/concedentes', data)
    return res.data
  },
  deleteConcedente: async (id: string) => {
    await api.delete(`/covenants/concedentes/${id}`)
  },
}
```

---

## Task 7: Frontend — Update useCovenants Hooks

**Files:**
- Modify: `D:/PROJECTS/SIMP-FRONTEND/src/hooks/useCovenants.ts`

- [ ] **Step 7.1: Replace the entire file**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { covenantService } from '@/lib/api/covenants'
import type { CreateCovenantDTO, UpdateCovenantDTO, CovenantStatus } from '@/lib/api/covenants'

export function useCovenants(filters?: {
  page?: number; limit?: number; search?: string
  typeId?: string; status?: CovenantStatus
}) {
  return useQuery({
    queryKey: ['covenants', filters],
    queryFn:  () => covenantService.list(filters),
  })
}

export function useCreateCovenant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateCovenantDTO) => covenantService.create(data),
    onSuccess:  () => { queryClient.invalidateQueries({ queryKey: ['covenants'] }) },
  })
}

export function useUpdateCovenant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCovenantDTO }) =>
      covenantService.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['covenants'] }) },
  })
}

export function useDeleteCovenant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => covenantService.delete(id),
    onSuccess:  () => { queryClient.invalidateQueries({ queryKey: ['covenants'] }) },
  })
}

// ── CovenantType hooks ────────────────────────────────────────────────────────

export function useCovenantTypes() {
  return useQuery({
    queryKey: ['covenant-types'],
    queryFn:  () => covenantService.listTypes(),
  })
}

export function useCreateCovenantType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => covenantService.createType(name),
    onSuccess:  () => { queryClient.invalidateQueries({ queryKey: ['covenant-types'] }) },
  })
}

// ── Convenente hooks ──────────────────────────────────────────────────────────

export function useConvenentes() {
  return useQuery({
    queryKey: ['convenentes'],
    queryFn:  () => covenantService.listConvenentes(),
  })
}

export function useCreateConvenente() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; cnpj?: string }) => covenantService.createConvenente(data),
    onSuccess:  () => { queryClient.invalidateQueries({ queryKey: ['convenentes'] }) },
  })
}

// ── Concedente hooks ──────────────────────────────────────────────────────────

export function useConcedentes() {
  return useQuery({
    queryKey: ['concedentes'],
    queryFn:  () => covenantService.listConcedentes(),
  })
}

export function useCreateConcedente() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; cnpj?: string }) => covenantService.createConcedente(data),
    onSuccess:  () => { queryClient.invalidateQueries({ queryKey: ['concedentes'] }) },
  })
}
```

---

## Task 8: Frontend — Rewrite CovenantFormDialog

**Files:**
- Modify: `D:/PROJECTS/SIMP-FRONTEND/src/pages/convenios/CovenantFormDialog.tsx`

- [ ] **Step 8.1: Replace the entire file**

```tsx
import { useEffect, useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { CalendarIcon, Loader2, Plus } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from '@/hooks/use-toast'
import { useCreateCovenant, useUpdateCovenant } from '@/hooks/useCovenants'
import { useCovenantTypes, useCreateCovenantType } from '@/hooks/useCovenants'
import { useConvenentes, useCreateConvenente } from '@/hooks/useCovenants'
import { useConcedentes, useCreateConcedente } from '@/hooks/useCovenants'
import { useVirtualProcessCompanies, useCreateVirtualProcessCompany } from '@/hooks/useVirtualProcesses'
import type { Covenant, CovenantStatus, CreateCovenantDTO } from '@/lib/api/covenants'

// ─── Status options ───────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: CovenantStatus; label: string }[] = [
  { value: 'EM_ANALISE',       label: 'Em Análise' },
  { value: 'APROVADO',         label: 'Aprovado' },
  { value: 'EM_EXECUCAO',      label: 'Em Execução' },
  { value: 'PRESTACAO_CONTAS', label: 'Prestação de Contas' },
  { value: 'CONCLUIDO',        label: 'Concluído' },
  { value: 'DEVOLVIDO',        label: 'Devolvido' },
]

// ─── Currency helpers ─────────────────────────────────────────────────────────

function parseCurrency(raw: string): string {
  // Remove tudo que não seja dígito ou vírgula
  const digits = raw.replace(/[^\d,]/g, '')
  return digits
}

function formatCurrencyInput(raw: string): string {
  if (!raw) return ''
  const num = parseFloat(raw.replace(',', '.'))
  if (isNaN(num)) return raw
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num)
}

function currencyToNumber(raw: string): number | undefined {
  if (!raw) return undefined
  const cleaned = raw.replace(/\./g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return isNaN(n) ? undefined : n
}

// ─── DateField ────────────────────────────────────────────────────────────────

function DateField({ label, date, onChange }: {
  label: string; date: Date | undefined; onChange: (d: Date | undefined) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button" variant="outline"
            className={`w-full justify-start text-left font-normal text-sm ${!date ? 'text-muted-foreground' : ''}`}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
            {date ? format(date, 'dd/MM/yyyy') : 'Selecionar data'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={date} onSelect={onChange} locale={ptBR} initialFocus />
        </PopoverContent>
      </Popover>
    </div>
  )
}

// ─── EntitySelectField ────────────────────────────────────────────────────────
// Generic select + "+" button to create a new entity inline.

interface EntityItem { id: string; name: string }

function EntitySelectField({
  label, required, value, onChange, items, placeholder, onAddNew, isLoading,
}: {
  label: string
  required?: boolean
  value: string
  onChange: (v: string) => void
  items: EntityItem[]
  placeholder: string
  onAddNew: () => void
  isLoading?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}{required && <span className="text-red-500 ml-0.5">*</span>}</Label>
      <div className="flex gap-1.5">
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="flex-1 text-sm">
            <SelectValue placeholder={isLoading ? 'Carregando…' : placeholder} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">— Nenhum —</SelectItem>
            {items.map(item => (
              <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button" variant="outline" size="icon"
          className="shrink-0 h-9 w-9"
          title={`Novo ${label}`}
          onClick={onAddNew}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

// ─── Mini create dialog (name + optional cnpj) ────────────────────────────────

function CreateEntityDialog({
  open, onOpenChange, title, onSave, isSaving,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  title: string
  onSave: (name: string, cnpj?: string) => void
  isSaving: boolean
}) {
  const [name, setName] = useState('')
  const [cnpj, setCnpj] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    onSave(name.trim(), cnpj.trim() || undefined)
  }

  // Reset on open
  useEffect(() => { if (open) { setName(''); setCnpj('') } }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="entity-name">Nome <span className="text-red-500">*</span></Label>
            <Input
              id="entity-name" required autoFocus
              placeholder="Ex: Fundo Municipal de Saúde"
              value={name} onChange={e => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="entity-cnpj">CNPJ</Label>
            <Input
              id="entity-cnpj"
              placeholder="00.000.000/0000-00"
              value={cnpj} onChange={e => setCnpj(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving || !name.trim()} className="bg-emerald-600 hover:bg-emerald-700">
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── CreateTypeDialog (name only) ─────────────────────────────────────────────

function CreateTypeDialog({
  open, onOpenChange, onSave, isSaving,
}: {
  open: boolean; onOpenChange: (v: boolean) => void
  onSave: (name: string) => void; isSaving: boolean
}) {
  const [name, setName] = useState('')
  useEffect(() => { if (open) setName('') }, [open])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    onSave(name.trim())
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Novo Tipo de Convênio</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="type-name">Nome <span className="text-red-500">*</span></Label>
            <Input
              id="type-name" required autoFocus
              placeholder="Ex: Emenda Especial"
              value={name} onChange={e => setName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancelar</Button>
            <Button type="submit" disabled={isSaving || !name.trim()} className="bg-emerald-600 hover:bg-emerald-700">
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Form state ───────────────────────────────────────────────────────────────

interface FormState {
  number:             string
  typeId:             string
  proponentId:        string
  convenenteId:       string
  concedenteId:       string
  processObject:      string
  budgetaryAction:    string
  status:             CovenantStatus | ''
  executionStartDate: Date | undefined
  validityStartDate:  Date | undefined
  validityEndDate:    Date | undefined
  termDays:           string
  transferValue:      string
  counterpartValue:   string
  bankName:           string
  bankAgency:         string
  bankAccount:        string
}

const EMPTY: FormState = {
  number: '', typeId: '', proponentId: '', convenenteId: '', concedenteId: '',
  processObject: '', budgetaryAction: '', status: '',
  executionStartDate: undefined, validityStartDate: undefined, validityEndDate: undefined,
  termDays: '', transferValue: '', counterpartValue: '',
  bankName: '', bankAgency: '', bankAccount: '',
}

// ─── Main dialog ──────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  covenant: Covenant | null
}

export default function CovenantFormDialog({ open, onOpenChange, covenant }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY)

  // Sub-resource dialogs
  const [typeDialogOpen,       setTypeDialogOpen]       = useState(false)
  const [proponentDialogOpen,  setProponentDialogOpen]  = useState(false)
  const [convenenteDialogOpen, setConvenenteDialogOpen] = useState(false)
  const [concedenteDialogOpen, setConcedenteDialogOpen] = useState(false)

  // Queries
  const { data: covenantTypes = [],  isLoading: loadingTypes }      = useCovenantTypes()
  const { data: convenentes   = [],  isLoading: loadingConvenentes } = useConvenentes()
  const { data: concedentes   = [],  isLoading: loadingConcedentes } = useConcedentes()
  const { data: companies     = [],  isLoading: loadingCompanies }   = useVirtualProcessCompanies()

  // Mutations
  const createCovenant   = useCreateCovenant()
  const updateCovenant   = useUpdateCovenant()
  const createType       = useCreateCovenantType()
  const createConvenente = useCreateConvenente()
  const createConcedente = useCreateConcedente()
  const createCompany    = useCreateVirtualProcessCompany()

  const isBusy = createCovenant.isPending || updateCovenant.isPending

  // Populate form when editing
  useEffect(() => {
    if (covenant) {
      setForm({
        number:             covenant.number,
        typeId:             covenant.typeId         ?? '',
        proponentId:        covenant.proponentId    ?? '',
        convenenteId:       covenant.convenenteId   ?? '',
        concedenteId:       covenant.concedenteId   ?? '',
        processObject:      covenant.processObject,
        budgetaryAction:    covenant.budgetaryAction ?? '',
        status:             covenant.status,
        executionStartDate: covenant.executionStartDate ? new Date(covenant.executionStartDate) : undefined,
        validityStartDate:  covenant.validityStartDate  ? new Date(covenant.validityStartDate)  : undefined,
        validityEndDate:    covenant.validityEndDate    ? new Date(covenant.validityEndDate)    : undefined,
        termDays:           covenant.termDays != null ? String(covenant.termDays) : '',
        transferValue:      covenant.transferValue    != null ? formatCurrencyInput(String(Number(covenant.transferValue)))  : '',
        counterpartValue:   covenant.counterpartValue != null ? formatCurrencyInput(String(Number(covenant.counterpartValue))) : '',
        bankName:    covenant.bankName    ?? '',
        bankAgency:  covenant.bankAgency  ?? '',
        bankAccount: covenant.bankAccount ?? '',
      })
    } else {
      setForm(EMPTY)
    }
  }, [covenant, open])

  // Auto-calculate termDays from validity dates
  useEffect(() => {
    if (form.validityStartDate && form.validityEndDate) {
      const days = differenceInDays(form.validityEndDate, form.validityStartDate)
      if (days >= 0) {
        setForm(prev => ({ ...prev, termDays: String(days) }))
      }
    }
  }, [form.validityStartDate, form.validityEndDate])

  function set(field: keyof FormState, value: string | Date | undefined) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  // ── Sub-resource creation handlers ──────────────────────────────────────────

  async function handleCreateType(name: string) {
    try {
      const created = await createType.mutateAsync(name)
      setForm(prev => ({ ...prev, typeId: created.id }))
      setTypeDialogOpen(false)
    } catch {
      toast({ title: 'Erro ao criar tipo.', variant: 'destructive' })
    }
  }

  async function handleCreateProponent(name: string, cnpj?: string) {
    try {
      const created = await createCompany.mutateAsync({ name, cnpj: cnpj ?? null })
      setForm(prev => ({ ...prev, proponentId: created.id }))
      setProponentDialogOpen(false)
    } catch {
      toast({ title: 'Erro ao criar empresa.', variant: 'destructive' })
    }
  }

  async function handleCreateConvenente(name: string, cnpj?: string) {
    try {
      const created = await createConvenente.mutateAsync({ name, cnpj })
      setForm(prev => ({ ...prev, convenenteId: created.id }))
      setConvenenteDialogOpen(false)
    } catch {
      toast({ title: 'Erro ao criar convenente.', variant: 'destructive' })
    }
  }

  async function handleCreateConcedente(name: string, cnpj?: string) {
    try {
      const created = await createConcedente.mutateAsync({ name, cnpj })
      setForm(prev => ({ ...prev, concedenteId: created.id }))
      setConcedenteDialogOpen(false)
    } catch {
      toast({ title: 'Erro ao criar concedente.', variant: 'destructive' })
    }
  }

  // ── Submit ───────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.status) {
      toast({ title: 'Status é obrigatório.', variant: 'destructive' })
      return
    }

    const payload: CreateCovenantDTO = {
      number:        form.number,
      processObject: form.processObject,
      status:        form.status as CovenantStatus,
      typeId:        form.typeId        || undefined,
      proponentId:   form.proponentId   || undefined,
      convenenteId:  form.convenenteId  || undefined,
      concedenteId:  form.concedenteId  || undefined,
      budgetaryAction:    form.budgetaryAction    || undefined,
      executionStartDate: form.executionStartDate?.toISOString(),
      validityStartDate:  form.validityStartDate?.toISOString(),
      validityEndDate:    form.validityEndDate?.toISOString(),
      termDays:           form.termDays ? Number(form.termDays) : undefined,
      transferValue:      currencyToNumber(form.transferValue),
      counterpartValue:   currencyToNumber(form.counterpartValue),
      bankName:    form.bankName    || undefined,
      bankAgency:  form.bankAgency  || undefined,
      bankAccount: form.bankAccount || undefined,
    }

    try {
      if (covenant) {
        await updateCovenant.mutateAsync({ id: covenant.id, data: payload })
        toast({ title: 'Convênio atualizado com sucesso.' })
      } else {
        await createCovenant.mutateAsync(payload)
        toast({ title: 'Convênio criado com sucesso.' })
      }
      onOpenChange(false)
    } catch {
      toast({ title: 'Erro ao salvar convênio.', variant: 'destructive' })
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl overflow-hidden p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle>{covenant ? 'Editar Convênio' : 'Novo Convênio'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <ScrollArea className="max-h-[70vh]">
              <div className="px-6 py-5 space-y-5">

                {/* Row: Número + Tipo */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="number">Número <span className="text-red-500">*</span></Label>
                    <Input
                      id="number" required placeholder="010400.00464/2021"
                      value={form.number} onChange={e => set('number', e.target.value)}
                    />
                  </div>
                  <EntitySelectField
                    label="Tipo"
                    value={form.typeId}
                    onChange={v => set('typeId', v === '__none__' ? '' : v)}
                    items={covenantTypes}
                    placeholder="Selecionar tipo"
                    onAddNew={() => setTypeDialogOpen(true)}
                    isLoading={loadingTypes}
                  />
                </div>

                {/* Proponente */}
                <EntitySelectField
                  label="Proponente"
                  value={form.proponentId}
                  onChange={v => set('proponentId', v === '__none__' ? '' : v)}
                  items={companies}
                  placeholder="Selecionar empresa"
                  onAddNew={() => setProponentDialogOpen(true)}
                  isLoading={loadingCompanies}
                />

                {/* Row: Convenente + Concedente */}
                <div className="grid grid-cols-2 gap-4">
                  <EntitySelectField
                    label="Convenente"
                    value={form.convenenteId}
                    onChange={v => set('convenenteId', v === '__none__' ? '' : v)}
                    items={convenentes}
                    placeholder="Selecionar convenente"
                    onAddNew={() => setConvenenteDialogOpen(true)}
                    isLoading={loadingConvenentes}
                  />
                  <EntitySelectField
                    label="Concedente"
                    value={form.concedenteId}
                    onChange={v => set('concedenteId', v === '__none__' ? '' : v)}
                    items={concedentes}
                    placeholder="Selecionar concedente"
                    onAddNew={() => setConcedenteDialogOpen(true)}
                    isLoading={loadingConcedentes}
                  />
                </div>

                {/* Objeto */}
                <div className="space-y-1.5">
                  <Label htmlFor="processObject">Objeto <span className="text-red-500">*</span></Label>
                  <Textarea
                    id="processObject" required rows={3}
                    placeholder="Descrição do objeto do convênio…"
                    value={form.processObject} onChange={e => set('processObject', e.target.value)}
                  />
                </div>

                {/* Ação Orçamentária + Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="budgetaryAction">Ação Orçamentária</Label>
                    <Input
                      id="budgetaryAction" placeholder="Ex: 2055"
                      value={form.budgetaryAction} onChange={e => set('budgetaryAction', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Status <span className="text-red-500">*</span></Label>
                    <Select value={form.status} onValueChange={v => set('status', v)}>
                      <SelectTrigger><SelectValue placeholder="Selecionar status" /></SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Datas */}
                <div className="grid grid-cols-2 gap-4">
                  <DateField label="Início de Execução" date={form.executionStartDate}
                    onChange={d => set('executionStartDate', d)} />
                  <DateField label="Vigência — Início" date={form.validityStartDate}
                    onChange={d => set('validityStartDate', d)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <DateField label="Vigência — Fim" date={form.validityEndDate}
                    onChange={d => set('validityEndDate', d)} />
                  <div className="space-y-1.5">
                    <Label htmlFor="termDays">Prazo (dias)</Label>
                    <Input
                      id="termDays" readOnly
                      placeholder="Calculado automaticamente"
                      className="bg-slate-50 cursor-not-allowed text-slate-500"
                      value={form.termDays}
                    />
                    {!form.validityStartDate || !form.validityEndDate ? (
                      <p className="text-xs text-slate-400">Preencha Vigência Início e Fim</p>
                    ) : null}
                  </div>
                </div>

                {/* Valores */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="transferValue">Valor da Transferência (R$)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">R$</span>
                      <Input
                        id="transferValue" className="pl-9" placeholder="0,00"
                        value={form.transferValue}
                        onChange={e => set('transferValue', parseCurrency(e.target.value))}
                        onBlur={() => set('transferValue', formatCurrencyInput(form.transferValue))}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="counterpartValue">Contrapartida (R$)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">R$</span>
                      <Input
                        id="counterpartValue" className="pl-9" placeholder="0,00"
                        value={form.counterpartValue}
                        onChange={e => set('counterpartValue', parseCurrency(e.target.value))}
                        onBlur={() => set('counterpartValue', formatCurrencyInput(form.counterpartValue))}
                      />
                    </div>
                  </div>
                </div>

                {/* Dados bancários */}
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Dados Bancários
                  </p>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="bankName">Banco</Label>
                      <Input id="bankName" placeholder="Caixa Econômica"
                        value={form.bankName} onChange={e => set('bankName', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="bankAgency">Agência</Label>
                      <Input id="bankAgency" placeholder="0001"
                        value={form.bankAgency} onChange={e => set('bankAgency', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="bankAccount">Conta</Label>
                      <Input id="bankAccount" placeholder="12345-6"
                        value={form.bankAccount} onChange={e => set('bankAccount', e.target.value)} />
                    </div>
                  </div>
                </div>

              </div>
            </ScrollArea>

            <DialogFooter className="px-6 py-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isBusy}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isBusy} className="bg-emerald-600 hover:bg-emerald-700">
                {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {covenant ? 'Salvar alterações' : 'Criar convênio'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Sub-resource creation dialogs */}
      <CreateTypeDialog
        open={typeDialogOpen}
        onOpenChange={setTypeDialogOpen}
        onSave={handleCreateType}
        isSaving={createType.isPending}
      />
      <CreateEntityDialog
        open={proponentDialogOpen}
        onOpenChange={setProponentDialogOpen}
        title="Nova Empresa (Proponente)"
        onSave={handleCreateProponent}
        isSaving={createCompany.isPending}
      />
      <CreateEntityDialog
        open={convenenteDialogOpen}
        onOpenChange={setConvenenteDialogOpen}
        title="Novo Convenente"
        onSave={handleCreateConvenente}
        isSaving={createConvenente.isPending}
      />
      <CreateEntityDialog
        open={concedenteDialogOpen}
        onOpenChange={setConcedenteDialogOpen}
        title="Novo Concedente"
        onSave={handleCreateConcedente}
        isSaving={createConcedente.isPending}
      />
    </>
  )
}
```

---

## Task 9: Frontend — Update CovenantsPage

**Files:**
- Modify: `D:/PROJECTS/SIMP-FRONTEND/src/pages/convenios/CovenantsPage.tsx`

- [ ] **Step 9.1: Replace the `TYPE_LABELS` block, type filter Select, and column rendering**

The page needs three changes:

**A) Remove the `TYPE_LABELS` const and `CovenantType` import; add `useCovenantTypes` import and hook:**

Find at top:
```tsx
import { useCovenants, useDeleteCovenant } from '@/hooks/useCovenants'
import type { Covenant, CovenantStatus, CovenantType } from '@/lib/api/covenants'
```
Replace with:
```tsx
import { useCovenants, useDeleteCovenant, useCovenantTypes } from '@/hooks/useCovenants'
import type { Covenant, CovenantStatus } from '@/lib/api/covenants'
```

**B) Remove `TYPE_LABELS` constant (lines 19–26):**
```tsx
// DELETE this block entirely:
const TYPE_LABELS: Record<CovenantType, string> = {
  CONVENIO:               'Convênio',
  EMENDA_INDIVIDUAL:      'Emenda Individual',
  EMENDA_BANCADA:         'Emenda de Bancada',
  TRANSFERENCIA_ESPECIAL: 'Transf. Especial',
  FUNDO_A_FUNDO:          'Fundo a Fundo',
}
```

**C) Update the main component state + add types query:**

Find:
```tsx
  const [typeFilter, setType]     = useState<CovenantType | 'ALL'>('ALL')
```
Replace with:
```tsx
  const [typeFilter, setType]     = useState<string>('')
```

Find (add after the `useCovenants` call):
```tsx
  const { data, isLoading, isError } = useCovenants({
```
After the `useCovenants` query add:
```tsx
  const { data: covenantTypes = [] } = useCovenantTypes()
```

Update the `useCovenants` call to pass `typeId` instead of `type`:
```tsx
  const { data, isLoading, isError } = useCovenants({
    page,
    limit: 20,
    search:  search     || undefined,
    status:  statusFilter !== 'ALL' ? statusFilter : undefined,
    typeId:  typeFilter  || undefined,
  })
```

**D) Replace the static type filter Select:**

Find:
```tsx
          <Select
            value={typeFilter}
            onValueChange={v => { setType(v as CovenantType | 'ALL'); setPage(1) }}
          >
            <SelectTrigger className="h-8 w-52 text-sm bg-white">
              <SelectValue placeholder="Todos os tipos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os tipos</SelectItem>
              {(Object.keys(TYPE_LABELS) as CovenantType[]).map(t => (
                <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
```
Replace with:
```tsx
          <Select
            value={typeFilter || 'ALL'}
            onValueChange={v => { setType(v === 'ALL' ? '' : v); setPage(1) }}
          >
            <SelectTrigger className="h-8 w-52 text-sm bg-white">
              <SelectValue placeholder="Todos os tipos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os tipos</SelectItem>
              {covenantTypes.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
```

**E) Update column rendering — proponent and type cells:**

Find (in the table row):
```tsx
                        <td className="px-4 py-3 text-slate-800 max-w-[220px] truncate">
                          {covenant.proponent}
                        </td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                          {TYPE_LABELS[covenant.type] ?? covenant.type}
                        </td>
```
Replace with:
```tsx
                        <td className="px-4 py-3 text-slate-800 max-w-[220px] truncate">
                          {covenant.proponent?.name ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                          {covenant.covenantType?.name ?? '—'}
                        </td>
```

**F) Update `validityDate` reference to `validityEndDate`:**

Find:
```tsx
                          {formatDate(covenant.validityDate)}
```
Replace with:
```tsx
                          {formatDate(covenant.validityEndDate)}
```

---

## Task 10: Frontend — Update CovenantDetailSheet

**Files:**
- Modify: `D:/PROJECTS/SIMP-FRONTEND/src/pages/convenios/CovenantDetailSheet.tsx`

- [ ] **Step 10.1: Remove old type imports**

Find:
```tsx
import type { Covenant, CovenantType, CovenantStatus, UpdateCovenantDTO } from '@/lib/api/covenants'
```
Replace with:
```tsx
import type { Covenant, CovenantStatus, UpdateCovenantDTO } from '@/lib/api/covenants'
```

- [ ] **Step 10.2: Find any reference to `covenant.type` in the DetailSheet and replace with `covenant.covenantType?.name`**

In the sheet body, find (searching for where the type is displayed — typically in a details section):
```tsx
{TYPE_LABELS[covenant.type] ?? covenant.type}
```
Replace with:
```tsx
{covenant.covenantType?.name ?? '—'}
```

Also find any reference to `covenant.proponent` displayed as a string and replace with:
```tsx
{covenant.proponent?.name ?? '—'}
```

Find `covenant.validityDate` and replace with `covenant.validityEndDate`.

Also update the inline edit Zod schema inside the sheet if it references the old fields. Find any `validityDate` and replace with `validityEndDate`. Find any `type: z.nativeEnum(CovenantType)` and replace with `typeId: z.string().optional()`.

- [ ] **Step 10.3: Read the full DetailSheet file and verify all `covenant.type`, `covenant.proponent`, `covenant.validityDate` references are updated**

Run a search to confirm:
```bash
grep -n "covenant\.type\b\|covenant\.proponent[^I]\|validityDate\|CovenantType" D:/PROJECTS/SIMP-FRONTEND/src/pages/convenios/CovenantDetailSheet.tsx
```

Fix any remaining hits before continuing.

---

## Task 11: Frontend — Feature Flags + RBAC

**Files:**
- Modify: `D:/PROJECTS/SIMP-FRONTEND/src/pages/admin/AdminOrganizationDetailPage.tsx`
- Modify: `D:/PROJECTS/SIMP-FRONTEND/src/pages/Roles.tsx`

- [ ] **Step 11.1: Add covenants to MODULE_LABELS**

In `AdminOrganizationDetailPage.tsx`, find:
```tsx
const MODULE_LABELS: Record<string, string> = {
  tasks:             "Tarefas",
  finance:           "Financeiro",
  communication:     "Comunicação",
  virtual_processes: "Processos Virtuais",
  calendar:          "Calendário",
  notes:             "Notas",
  departments:       "Departamentos",
};
```
Replace with:
```tsx
const MODULE_LABELS: Record<string, string> = {
  tasks:             "Tarefas",
  finance:           "Financeiro",
  communication:     "Comunicação",
  virtual_processes: "Processos Virtuais",
  calendar:          "Calendário",
  notes:             "Notas",
  departments:       "Departamentos",
  covenants:         "Convênios",
};
```

- [ ] **Step 11.2: Add covenants to FALLBACK_CATALOG in Roles.tsx**

Find:
```tsx
    { name: "processes",     displayName: "Processos Virtuais",         permissions: ["processes:read", "processes:write", "processes:download", "processes:manage"] },
  ],
```
Replace with:
```tsx
    { name: "processes",     displayName: "Processos Virtuais",         permissions: ["processes:read", "processes:write", "processes:download", "processes:manage"] },
    { name: "covenants",     displayName: "Convênios, Emendas e Transferências", permissions: ["covenants:read", "covenants:write", "covenants:delete"] },
  ],
```

Then find the permissions list after the categories, at the end (after processes block):
```tsx
    { key: "processes:manage",    description: "Gerenciar todos os processos",            category: "processes" },
  ],
```
Replace with:
```tsx
    { key: "processes:manage",    description: "Gerenciar todos os processos",            category: "processes" },
    // Covenants
    { key: "covenants:read",   description: "Visualizar convênios e transferências", category: "covenants" },
    { key: "covenants:write",  description: "Criar e editar convênios",             category: "covenants" },
    { key: "covenants:delete", description: "Excluir convênios",                    category: "covenants" },
  ],
```

- [ ] **Step 11.3: Add covenants to CATEGORY_MODULE_MAP in Roles.tsx**

Find:
```tsx
const CATEGORY_MODULE_MAP: Record<string, string> = {
  finance:       "finance",
  communication: "communication",
  processes:     "virtual_processes",
};
```
Replace with:
```tsx
const CATEGORY_MODULE_MAP: Record<string, string> = {
  finance:       "finance",
  communication: "communication",
  processes:     "virtual_processes",
  covenants:     "covenants",
};
```

---

## Task 12: Frontend TypeScript Check + Build + Commit

- [ ] **Step 12.1: Run type check**

```bash
cd D:/PROJECTS/SIMP-FRONTEND
nvm use 22
npx tsc -b
```

Expected: zero errors. Fix any that appear before continuing.

- [ ] **Step 12.2: Run ESLint**

```bash
npx eslint src/pages/convenios/ src/hooks/useCovenants.ts src/lib/api/covenants.ts src/pages/admin/AdminOrganizationDetailPage.tsx src/pages/Roles.tsx
```

Expected: zero errors (warnings are ok).

- [ ] **Step 12.3: Run build**

```bash
npm run build
```

Expected: build completes without errors.

- [ ] **Step 12.4: Commit frontend changes**

```bash
cd D:/PROJECTS/SIMP-FRONTEND
git add src/lib/api/covenants.ts src/hooks/useCovenants.ts src/pages/convenios/ src/pages/admin/AdminOrganizationDetailPage.tsx src/pages/Roles.tsx
git commit -m "$(cat <<'EOF'
feat(covenants): dynamic types, entity selects, auto term-days, currency masks, RBAC

- covenants.ts: new CovenantType/Convenente/Concedente types + service endpoints
- useCovenants: new hooks for types, convenentes, concedentes
- CovenantFormDialog: EntitySelectField with inline create dialogs, validityStart+End
  with auto termDays calculation, R$ currency mask on value fields
- CovenantsPage: dynamic type filter from API, updated proponent/type column rendering
- CovenantDetailSheet: updated field references to new schema
- AdminOrganizationDetailPage: add covenants to MODULE_LABELS
- Roles: add covenants to FALLBACK_CATALOG + CATEGORY_MODULE_MAP

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```
