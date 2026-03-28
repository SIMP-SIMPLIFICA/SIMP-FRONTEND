export type GrantNote = {
  id: string;
  content: string;
  createdAt: string;
  user: {
    firstName: string;
    lastName: string;
    avatar?: string;
  };
};

export type Grant = {
  id: string;
  externalId: string;
  numeroConvenio: string;
  objeto: string;
  valorGlobal: string; // Vem como string do JSON se for Decimal
  valorRepasse: string;
  valorContrapartida: string;
  dataInicio: string | null;
  dataFim: string | null;
  situacao: string;
  orgaoConcedente: string;
  lastSyncAt: string;
  notes: GrantNote[];
  _count?: {
    notes: number;
  };
};