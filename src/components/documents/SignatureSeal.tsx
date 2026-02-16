import { ShieldCheck } from "lucide-react";

interface SignatureSealProps {
  signerName?: string | null;
  signerRole?: string | null;
  signedAt?: string | Date | null;
  type?: "CREATION" | "SIGNATURE" | "PROTOCOL";
  variant?: "default" | "blue" | "green";
}

export function SignatureSeal({
  signerName,
  signerRole,
  signedAt,
  type = "SIGNATURE",
  variant = "default"
}: SignatureSealProps) {
  const dateObj = signedAt ? new Date(signedAt) : new Date();

  // Configuração de cores (Modo Carimbo)
  const styles = {
    default: "border-gray-800 text-gray-900",
    blue: "border-blue-800 text-blue-900",
    green: "border-green-800 text-green-900",
  };

  const titles = {
    CREATION: "CRIADO NO SISTEMA",
    SIGNATURE: "ASSINADO ELETRONICAMENTE",
    PROTOCOL: "PROTOCOLADO",
  };

  /* 
     Design: Borda dupla sólida, Fundo transparente (simulando carimbo no papel),
     Fonte Serifada no título para autoridade, Sans-serif nos dados para legibilidade.
  */

  return (
    <div className={`
      inline-flex flex-col items-center justify-center 
      border-[3px] border-double ${styles[variant]} 
      p-2 min-w-[220px] max-w-[300px] select-none
      bg-white/50 backdrop-blur-[1px]
      transform rotate-[-1deg] hover:rotate-0 transition-transform duration-300
    `}>

      {/* Cabeçalho do Selo */}
      <div className="flex flex-col items-center border-b-2 border-dotted border-current w-full pb-1 mb-1">
        <ShieldCheck className="w-8 h-8 mb-1 opacity-80" strokeWidth={1.5} />
        <h3 className="font-serif font-bold text-xs tracking-widest uppercase text-center leading-tight">
          {titles[type]}
        </h3>
      </div>

      {/* Dados do Assinante */}
      <div className="text-center space-y-0.5 w-full">
        <p className="font-bold text-sm uppercase font-sans leading-tight">
          {signerName || "Usuário Verificado"}
        </p>

        {signerRole && (
          <p className="text-[10px] uppercase font-sans font-medium tracking-tight opacity-90">
            {signerRole}
          </p>
        )}

        <div className="pt-1 mt-1 border-t border-current w-3/4 mx-auto opacity-50"></div>

        <p className="text-[10px] font-mono font-bold pt-0.5">
          {dateObj.toLocaleDateString('pt-BR')} • {dateObj.toLocaleTimeString('pt-BR')}
        </p>
      </div>

      {/* Rodapé do Selo */}
      <div className="mt-2 text-[8px] uppercase tracking-tighter text-center opacity-75 font-serif italic">
        Autenticidade via SIMP
      </div>
    </div>
  );
}
