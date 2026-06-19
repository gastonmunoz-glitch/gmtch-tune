import { UserCheck, Tool, Activity } from 'lucide-react';

const AsignacionTurno = ({ ordenId }) => {
  
  const handleAsignacion = (especialidad) => {
    // Aquí es donde el sistema enviará la señal al backend
    console.log(`Asignando la Orden #${ordenId} al área de: ${especialidad}`);
    alert(`Orden ${ordenId} enviada a ${especialidad}`);
    
    // Aquí conectaremos luego con n8n para enviar el WhatsApp al mecánico
  };

  return (
    <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 mt-6 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-white font-bold flex items-center gap-2 text-lg">
          <UserCheck className="text-green-500" size={24} /> 
          Control de Flujo de Trabajo
        </h3>
        <span className="text-xs font-mono bg-slate-900 text-slate-400 px-3 py-1 rounded-full border border-slate-700">
          ID ORDEN: {ordenId}
        </span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Botón para Programador (Lectura/Diagnóstico) */}
        <button 
          onClick={() => handleAsignacion('PROGRAMACION')}
          className="group flex flex-col items-center p-6 bg-slate-900 rounded-xl border border-blue-500/20 hover:border-blue-500 hover:bg-blue-600/5 transition-all duration-300"
        >
          <div className="bg-blue-600/10 p-4 rounded-full mb-3 group-hover:scale-110 transition-transform">
            <Activity className="text-blue-500" size={32} />
          </div>
          <span className="font-bold text-white text-lg">Programación</span>
          <p className="text-xs text-slate-500 text-center mt-2">
            Scanner, Diagnóstico DTC <br /> y Lectura/Escritura ECU
          </p>
        </button>

        {/* Botón para Mecánico (Dureza/Vaciados) */}
        <button 
          onClick={() => handleAsignacion('MECANICA')}
          className="group flex flex-col items-center p-6 bg-slate-900 rounded-xl border border-orange-500/20 hover:border-orange-500 hover:bg-orange-600/5 transition-all duration-300"
        >
          <div className="bg-orange-600/10 p-4 rounded-full mb-3 group-hover:scale-110 transition-transform">
            <Tool className="text-orange-500" size={32} />
          </div>
          <span className="font-bold text-white text-lg">Mecánica</span>
          <p className="text-xs text-slate-500 text-center mt-2">
            Vaciado DPF, Extracción <br /> y Mecánica General
          </p>
        </button>
      </div>
    </div>
  );
};

export default AsignacionTurno;
