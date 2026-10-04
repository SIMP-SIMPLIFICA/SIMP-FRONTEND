import { Car } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useFleetVehicles } from '@/hooks/useFleet'
import { FUEL_TYPE_LABELS, VEHICLE_STATUS_LABELS } from '@/lib/api/fleet'
import { formatPlate } from '@/lib/fleet-validation'
import { TabShell } from './TabShell'

/** Veículos sob responsabilidade do setor (Simplifica Frotas). */
export function FleetVehiclesTab({ departmentId }: { departmentId: string }) {
  const { data, isLoading, isError } = useFleetVehicles({ departmentId, limit: 100 })

  return (
    <TabShell
      isLoading={isLoading}
      isError={isError}
      items={data?.data}
      errorMessage="Não foi possível carregar a frota deste setor."
      empty={{
        icon: Car,
        title: 'Nenhum veículo neste setor',
        description: 'Os veículos aparecem aqui quando o departamento é escolhido no cadastro do veículo (menu Frota).',
      }}
    >
      {vehicles => (
        <div className="border rounded-xl overflow-hidden bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-28">Placa</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead className="hidden sm:table-cell">Combustível</TableHead>
                <TableHead className="hidden md:table-cell text-right w-28">Hodômetro</TableHead>
                <TableHead className="w-32">Situação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicles.map(vehicle => (
                <TableRow key={vehicle.id}>
                  <TableCell className="font-mono text-sm text-slate-800">{formatPlate(vehicle.plate)}</TableCell>
                  <TableCell className="text-slate-700">{vehicle.makeModel ?? '—'}</TableCell>
                  <TableCell className="hidden sm:table-cell text-slate-600">{FUEL_TYPE_LABELS[vehicle.fuelType]}</TableCell>
                  <TableCell className="hidden md:table-cell text-right tabular-nums text-slate-600">
                    {vehicle.odometerKm.toLocaleString('pt-BR')} km
                  </TableCell>
                  <TableCell>
                    <Badge variant={vehicle.status === 'EM_USO' ? 'default' : 'secondary'}>
                      {VEHICLE_STATUS_LABELS[vehicle.status]}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </TabShell>
  )
}
