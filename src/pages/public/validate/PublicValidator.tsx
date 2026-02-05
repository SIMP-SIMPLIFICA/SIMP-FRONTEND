export default function PublicValidator() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Validador Público</h1>
        <p className="text-gray-600 mb-6">Consulte a autenticidade de documentos oficiais.</p>
        
        <input 
          type="text" 
          placeholder="Digite o código do protocolo" 
          className="w-full border rounded-md p-2 mb-4"
        />
        
        <button className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700">
          Validar
        </button>
      </div>
    </div>
  );
}