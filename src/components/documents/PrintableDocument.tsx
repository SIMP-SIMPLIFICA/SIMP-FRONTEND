import React from 'react';
import { SignatureSeal } from './SignatureSeal';

// Interfaces
interface User {
  id?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  role?: string;
  email?: string;
}

interface Attachment {
  id?: string;
  fileName: string;
  fileType: string;
  fileUrl?: string;
  fileSize?: number;
}

interface Signature {
  id?: string;
  signedAt: string;
  signatureHash?: string;
  user?: User;
}

interface Recipient {
  id?: string;
  name: string;
  role?: string;
  email?: string;
}

interface DocumentHistoryEntry {
  id?: string;
  action: string;
  description: string;
  timestamp: string;
  user?: User;
}

interface PrintableDocumentProps {
  data: {
    title?: string;
    documentNumber?: string;
    protocolNumber?: string;
    type?: string;
    documentType?: string;
    subject?: string;
  };
  user?: User;
  content: string; // HTML ou texto plano
  settings?: {
    header?: {
      municipality?: string;
      department?: string;
      address?: string;
      email?: string;
      phone?: string;
      coatOfArmsUrl?: string;
    };
  };
  fullDocumentData?: {
    id?: string;
    createdAt?: string | Date;
    updatedAt?: string | Date;
    attachments?: Attachment[];
    signatures?: Signature[];
    history?: DocumentHistoryEntry[];
    hash?: string;
    metadata?: any;
    status?: string;
    documentNumber?: string;
  };
  recipientsList?: Recipient[];
  signerJobTitle?: string;
  recipientSalutation?: string;
}

export const PrintableDocument: React.FC<PrintableDocumentProps> = ({
  data,
  user,
  content,
  settings,
  fullDocumentData,
  recipientsList = [],
  signerJobTitle,
  recipientSalutation
}) => {
  // 1. TRATAMENTO DE DADOS INTELIGENTE

  // Prioridade: Número digitado manualmente (metadata) > Número do Banco > Fallback
  const manualNumber = fullDocumentData?.metadata?.manualDocumentNumber;
  const dbNumber = fullDocumentData?.documentNumber || data.documentNumber;
  const docNumber = manualNumber || dbNumber || "S/N";

  // Garante que o tipo (OFÍCIO/MEMORANDO) apareça corretamente
  const docType = data.type || data.documentType || "OFÍCIO";
  
  // Monta o título completo (ex: "OFÍCIO Nº 001/2026")
  const displayTitle = docNumber.toUpperCase().includes(docType.toUpperCase()) 
    ? docNumber 
    : `${docType.toUpperCase()} Nº ${docNumber}`;

  // Recupera o Cabeçalho Editável (À Sua Senhoria...)
  const customHeader = fullDocumentData?.metadata?.customHeader;

  // Recupera os parágrafos estruturados (se houver)
  const paragrafos = fullDocumentData?.metadata?.paragrafos || [];
  const temParagrafosEstruturados = Array.isArray(paragrafos) && paragrafos.length > 0;

  // Datas
  const formatDate = (dateString?: string | Date) => {
    if (!dateString) return new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
    return new Date(dateString).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  };
  const finalDate = formatDate(fullDocumentData?.createdAt || new Date());

  // Dados do Emissor (Assinatura)
  // Se já estiver assinado por alguém, usa os dados dessa pessoa. Senão usa o usuário atual (preview).
  const primarySignature = fullDocumentData?.signatures && fullDocumentData.signatures.length > 0 
    ? fullDocumentData.signatures[0] 
    : null;

  const signerName = primarySignature?.user 
    ? (primarySignature.user.name || `${primarySignature.user.firstName} ${primarySignature.user.lastName}`) 
    : (user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'ADMINISTRADOR');

  const signerRoleText = primarySignature?.user?.role || signerJobTitle || user?.role || 'Cargo Administrativo';

  // LOGO
  const logoUrl = settings?.header?.coatOfArmsUrl || "/logo.png";

  return (
    <>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;700;800&family=Times+New+Roman&display=swap');

          @media print {
            @page {
              size: A4 portrait;
              margin: 0; /* Margens controladas pelo container para permitir full-bleed se necessário */
            }
            body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              margin: 0;
              padding: 0;
            }
            .no-print { display: none !important; }
            .print-break-after { page-break-after: always; }
          }

          .doc-wrapper {
            background-color: #525659; /* Cor de fundo do visualizador de PDF padrão */
            padding: 2rem 0;
            display: flex;
            justify-content: center;
          }

          @media print {
            .doc-wrapper {
              background-color: white;
              padding: 0;
              display: block;
            }
          }

          .doc-sheet {
            width: 210mm;
            min-height: 297mm;
            background: white;
            padding: 2.5cm 2.0cm 2.0cm 2.5cm; /* Margens ABNT aprox */
            position: relative;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
            display: flex;
            flex-direction: column;
            font-family: 'Times New Roman', Times, serif;
            font-size: 12pt;
            line-height: 1.5;
            color: black;
          }

          @media print {
            .doc-sheet {
              box-shadow: none;
              width: 100%;
              height: 100%;
              margin: 0;
              page-break-after: always;
            }
          }

          /* --- ELEMENTOS DO DOCUMENTO --- */
          .doc-header {
            text-align: center;
            margin-bottom: 2rem;
          }
          
          .doc-logo {
            height: 2.5cm; 
            object-fit: contain;
            display: block;
            margin: 0 auto 0.5cm auto;
          }

          .doc-title {
            font-weight: bold;
            text-transform: uppercase;
            text-align: center;
            margin-bottom: 0.5cm;
          }

          .doc-data-local {
            text-align: right;
            margin-bottom: 1.5cm;
          }

          .doc-recipient {
            margin-bottom: 1.0cm;
            font-weight: bold;
          }

          .doc-subject {
            font-weight: bold;
            margin-bottom: 1.0cm;
            text-transform: uppercase;
          }

          .doc-content {
            flex: 1; /* Ocupa o espaço disponível para empurrar rodapé */
            text-align: justify;
          }

          .doc-p {
             text-indent: 2.5cm;
             margin-bottom: 0.5cm;
          }

          .doc-signature-area {
            margin-top: 2cm;
            margin-bottom: 1cm;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            break-inside: avoid; /* Tentar não quebrar a assinatura */
          }

          .doc-footer-fixed {
            margin-top: auto;
            border-top: 1px solid #ccc;
            padding-top: 0.2cm;
            text-align: center;
            font-size: 9pt;
            font-family: 'Open Sans', sans-serif;
            color: #444;
          }
        `}
      </style>

      <div className="doc-wrapper">
        <div className="doc-sheet">
          
          {/* CABEÇALHO */}
          <div className="doc-header">
            <img src={logoUrl} alt="Brasão" className="doc-logo" onError={(e) => e.currentTarget.style.display = 'none'} />
          </div>

          {/* TÍTULO */}
          <div className="doc-title">
            {displayTitle}
          </div>

          {/* DATA/LOCAL */}
          <div className="doc-data-local">
            Pequizeiro - TO, {finalDate}.
          </div>

          {/* CÓDIGO DE VERIFICAÇÃO (Opção Discreta no Topo ou Lateral) */}
          {fullDocumentData?.hash && (
             <div className="absolute top-4 right-4 text-[8px] font-mono text-gray-400">
               Hash: {fullDocumentData.hash.substring(0, 16)}...
             </div>
          )}

          {/* DESTINATÁRIO */}
          <div className="doc-recipient">
            {customHeader ? (
              <div dangerouslySetInnerHTML={{ __html: customHeader.replace(/\n/g, '<br/>') }} />
            ) : (
               <>
                  <div>{recipientSalutation || "Ao Senhor"}</div>
                  {recipientsList.length > 0 ? recipientsList.map((rec, i) => (
                    <div key={i}>
                      <div>{rec.name}</div>
                      <div className="text-sm font-normal uppercase">{rec.role}</div>
                    </div>
                  )) : <div>DESTINATÁRIO NÃO INFORMADO</div>}
               </>
            )}
          </div>

          {/* ASSUNTO */}
          <div className="doc-subject">
            ASSUNTO: {data.title || "Sem assunto"}
          </div>

          {/* CONTEÚDO */}
          <div className="doc-content">
            <p className="doc-p">Senhor(a),</p>
            
            {temParagrafosEstruturados ? (
              paragrafos.map((p: any, idx: number) => (
                <p key={idx} className="doc-p">
                  {p.texto || p.texto_do_paragrafo}
                </p>
              ))
            ) : (
              <div dangerouslySetInnerHTML={{ __html: content }} />
            )}

            <p className="doc-p" style={{ marginTop: '1cm' }}>Atenciosamente,</p>
          </div>

          {/* ÁREA DE ASSINATURA */}
          <div className="doc-signature-area">
            {primarySignature ? (
               <div className="mb-4">
                 <SignatureSeal 
                    signerName={signerName} 
                    signerRole={signerRoleText} 
                    signedAt={primarySignature.signedAt}
                    type="SIGNATURE"
                 />
               </div>
            ) : (
               /* Espaço em branco ou marca d'água de rascunho */
               <div className="h-16 w-64 border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-300 rounded mb-4">
                 AGUARDANDO ASSINATURA
               </div>
            )}
            
            <div className="font-bold border-t border-black pt-1 px-8 inline-block min-w-[50%] uppercase">
              {signerName}
            </div>
            <div className="text-sm uppercase">{signerRoleText}</div>
          </div>

          {/* RODAPÉ FIXO */}
          <div className="doc-footer-fixed">
            <p className="font-bold uppercase mb-1">Prefeitura Municipal de Pequizeiro</p>
            <p>Praça Central, s/n - Centro, Pequizeiro - TO | CEP: 77.730-000</p>
            <p className="text-[8px] mt-1 text-gray-500">
               ASSINADO DIGITALMENTE NO SISTEMA SIMP • {fullDocumentData?.id ? `ID: ${fullDocumentData.id}` : 'PRÉ-VISUALIZAÇÃO'}
            </p>
          </div>
          
        </div>
      </div>
    </>
  );
};
