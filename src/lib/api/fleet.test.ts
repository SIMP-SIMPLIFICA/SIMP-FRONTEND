import { beforeEach, describe, expect, test, vi } from 'vitest'

const requests: string[] = []
vi.mock('../api', () => ({
  api: {
    get: (path: string) => (requests.push(path), Promise.resolve({ data: {} })),
    post: (path: string) => (requests.push(path), Promise.resolve({ data: new Blob() })),
    patch: (path: string) => (requests.push(path), Promise.resolve({ data: {} })),
    delete: (path: string) => (requests.push(path), Promise.resolve({ data: undefined })),
  },
}))

const { fleetService } = await import('./fleet')

/** Id da URL da tela nunca pode sair do caminho /api/v1/fleet/... (path traversal no cliente). */
describe('fleetService — ids codificados no caminho', () => {
  beforeEach(() => {
    requests.length = 0
  })

  test('../ e ? no id não escapam do recurso', async () => {
    const evil = '../../admin/organizations?x=1'
    await fleetService.getVehicle(evil)
    await fleetService.getDriver(evil)
    await fleetService.exportVehicleSheet(evil)
    await fleetService.exportDriverSheet(evil)
    await fleetService.updateVehicle(evil, {})
    await fleetService.removeDriver(evil)

    for (const path of requests) {
      expect(path).toMatch(/^\/api\/v1\/fleet\/(vehicles|drivers)\/[^/?]+(\/export)?$/)
      expect(path).not.toContain('../')
    }
  })
})
