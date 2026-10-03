import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, test, vi } from 'vitest'
import MeetingDetailPage from './MeetingDetailPage'

/**
 * Tela de reunião depois da remoção da assinatura gov.br (decisão D9).
 *
 * A ata segue autenticada por PDF + SHA-256 + QR, como o resto do sistema: a
 * tela continua listando os documentos com o hash, sem botão "Assinar Gov.br"
 * e sem selo de assinatura — mesmo para um usuário cuja role ainda carrega a
 * permissão antiga `councils:sign` salva no banco.
 */

vi.mock('@/hooks/useMe', () => ({
  useMe: () => ({
    data: {
      user: {
        id: 'u-1',
        isSuperAdmin: false,
        roles: [{ role: { permissions: ['councils:read', 'councils:write', 'councils:sign'] } }],
      },
    },
  }),
}))

vi.mock('@/hooks/useCouncils', () => ({
  useCouncilMeeting: () => ({
    isLoading: false,
    isError: false,
    data: {
      id: 'm-1',
      organizationId: 'org-1',
      councilId: 'c-1',
      title: 'Reunião Ordinária de Setembro',
      description: null,
      location: 'Câmara Municipal',
      scheduledAt: '2026-09-10T14:00:00.000Z',
      endedAt: null,
      status: 'CONCLUIDA',
      quorum: null,
      createdById: 'u-1',
      createdAt: '2026-09-01T12:00:00.000Z',
      updatedAt: '2026-09-01T12:00:00.000Z',
      agendaItems: [],
      isFrozen: false,
    },
  }),
  useMeetingDocuments: () => ({
    isLoading: false,
    data: [
      {
        id: 'd-1',
        organizationId: 'org-1',
        meetingId: 'm-1',
        documentType: 'ATA',
        title: 'Ata da Reunião Ordinária',
        fileKey: 'organizations/org-1/councils/ata.pdf',
        fileName: 'ata.pdf',
        fileSize: 2048,
        mimeType: 'application/pdf',
        sha256Hash: 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
        uploadedById: 'u-1',
        createdAt: '2026-09-10T16:00:00.000Z',
        updatedAt: '2026-09-10T16:00:00.000Z',
        uploadedBy: { id: 'u-1', firstName: 'Maria', lastName: 'Souza' },
      },
    ],
  }),
  useDocumentDownload: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateMeetingStatus: () => ({ mutate: vi.fn(), isPending: false }),
}))

// Filhos com dados próprios ficam fora do escopo deste teste.
vi.mock('@/components/councils/AgendaItemsEditor', () => ({ AgendaItemsEditor: () => null }))
vi.mock('@/components/councils/MeetingAttendanceList', () => ({ MeetingAttendanceList: () => null }))
vi.mock('@/components/councils/UploadDocumentModal', () => ({ UploadDocumentModal: () => null }))

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/conselhos/c-1/reunioes/m-1']}>
      <Routes>
        <Route path="/conselhos/:id/reunioes/:meetingId" element={<MeetingDetailPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('MeetingDetailPage sem assinatura gov.br', () => {
  test('lista a ata com o hash SHA-256 e o botão de download', () => {
    renderPage()

    expect(screen.getByText('Ata da Reunião Ordinária')).toBeInTheDocument()
    expect(screen.getByText('abcdef01...')).toBeInTheDocument()
    expect(screen.getByTitle('Baixar documento')).toBeInTheDocument()
  })

  test('não mostra botão de assinar nem coluna/selo de assinatura, mesmo com "councils:sign" na role', () => {
    renderPage()

    expect(screen.queryByText(/Assinar Gov\.br/i)).not.toBeInTheDocument()
    expect(screen.queryByTitle(/Assinar via Gov\.br/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Assinatura' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('columnheader')).toHaveLength(6)
  })
})
