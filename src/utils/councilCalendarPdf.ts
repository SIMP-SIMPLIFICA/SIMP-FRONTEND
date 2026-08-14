import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { COUNCIL_ROLE_LABELS, MESA_DIRETORA_ROLES } from '@/lib/councilRoles'
import type { CouncilMeeting, CouncilMembership, MeetingStatus } from '@/lib/api/councils'

/**
 * Calendário Anual Oficial de um conselho, em PDF.
 *
 * Gerado no cliente com jsPDF + autoTable (já usados em utils/export.ts).
 * Escolhido em vez de window.print(): o diálogo de impressão do navegador não
 * garante o layout, e este é um documento oficial com linhas de assinatura.
 */

interface ExportParams {
  organizationName: string
  councilName: string
  year: number
  meetings: CouncilMeeting[]
  memberships: CouncilMembership[]
  statusLabels: Record<MeetingStatus, string>
}

export function exportCouncilCalendarPdf({
  organizationName,
  councilName,
  year,
  meetings,
  memberships,
  statusLabels,
}: ExportParams): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const centerX = pageWidth / 2

  // ── Cabeçalho oficial ──────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(organizationName.toUpperCase(), centerX, 20, { align: 'center' })

  doc.setFontSize(12)
  doc.text(councilName.toUpperCase(), centerX, 27, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text(`Calendário Anual de Reuniões — ${year}`, centerX, 35, { align: 'center' })

  doc.setDrawColor(180)
  doc.line(15, 39, pageWidth - 15, 39)

  // ── Tabela de reuniões ─────────────────────────────────────────────────────
  const rows = meetings
    .slice()
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    .map(m => [
      format(new Date(m.scheduledAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }),
      m.title,
      statusLabels[m.status] ?? m.status,
    ])

  if (rows.length === 0) {
    // Ano sem reuniões ainda gera documento — some útil para publicação/arquivo.
    doc.setFontSize(10)
    doc.setTextColor(110)
    doc.text('Nenhuma reunião registrada para este exercício.', centerX, 52, { align: 'center' })
    doc.setTextColor(0)
  } else {
    autoTable(doc, {
      startY: 45,
      head: [['Data', 'Pauta / Tema', 'Situação']],
      body: rows,
      styles: { fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: [30, 58, 95], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: {
        0: { cellWidth: 38 },
        2: { cellWidth: 30 },
      },
      margin: { left: 15, right: 15 },
    })
  }

  // ── Rodapé: assinaturas da Mesa Diretora ───────────────────────────────────
  // Apenas membros ATIVOS com cargo de Mesa. Cargo ausente → linha omitida:
  // um "Presidente: ____" sem presidente cadastrado induziria a erro.
  const mesa = memberships.filter(
    m => m.isActive && MESA_DIRETORA_ROLES.includes(m.role)
  )

  // @ts-expect-error — lastAutoTable é injetado pelo plugin autoTable no runtime
  const tableEndY: number = doc.lastAutoTable?.finalY ?? 55
  let y = Math.max(tableEndY + 25, 90)

  if (mesa.length > 0) {
    const pageHeight = doc.internal.pageSize.getHeight()

    for (const member of mesa) {
      // Quebra de página se não couber a linha de assinatura inteira.
      if (y + 20 > pageHeight - 15) {
        doc.addPage()
        y = 30
      }

      const fullName = [member.user?.firstName, member.user?.lastName]
        .filter(Boolean)
        .join(' ')
        .trim() || '—'

      doc.setDrawColor(60)
      doc.setLineDashPattern([1, 1], 0)
      doc.line(centerX - 45, y, centerX + 45, y)
      doc.setLineDashPattern([], 0)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text(fullName, centerX, y + 5, { align: 'center' })

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(90)
      doc.text(COUNCIL_ROLE_LABELS[member.role] ?? member.role, centerX, y + 10, { align: 'center' })
      doc.setTextColor(0)

      y += 28
    }
  }

  // Data de emissão
  doc.setFontSize(8)
  doc.setTextColor(130)
  doc.text(
    `Documento gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
    centerX,
    doc.internal.pageSize.getHeight() - 10,
    { align: 'center' },
  )

  const safeName = councilName.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').toLowerCase()
  doc.save(`calendario-${safeName}-${year}.pdf`)
}
