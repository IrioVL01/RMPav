import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Info, FileText, RotateCcw, ChevronDown } from 'lucide-react';

const OPCOES_VEICULOS = ["2C", "2CB", "3C", "3T6", "4CD", "2S1", "2S2", "2S3", "3S2", "3S3"]

const formatScientific = (value) => {
  if (value === 0) return "0";
  return value.toExponential(2); // Notação científica (Ex: 1.50e+5)
}

function App() {
  const API_URL = import.meta.env.VITE_API_URL;

  // --- ESTADOS GLOBAIS ---
  const [etapa, setEtapa] = useState(1)

  // --- TRÁFEGO ---
  const [anos, setAnos] = useState(10)
  const [taxa, setTaxa] = useState(5)
  const [fatorFaixa, setFatorFaixa] = useState(1.0)
  const [listaVeiculos, setListaVeiculos] = useState([]) 
  const [classeAtual, setClasseAtual] = useState("4CD")
  const [vdmAtual, setVdmAtual] = useState("")
  const [resultadoTrafego, setResultadoTrafego] = useState(null)

  // --- DIMENSIONAMENTO (NOVA ESTRUTURA) ---
  const [mesesSecos, setMesesSecos] = useState(6)
  
  // Perda de Serventia (PS)
  const [pt, setPt] = useState(2.5) // Terminal
  const [p0, setP0] = useState(4.2) // Inicial
  
  // CASE
  const [casePol, setCasePol] = useState(1) // 1 ou 2 polegadas

  // MR (Módulo de Resiliência)
  const [cbrSubleito, setCbrSubleito] = useState(10)
  const [cbrBase, setCbrBase] = useState(60)
  const [metodoMrBase, setMetodoMrBase] = useState("brown") // 'brown', 'preussler', 'manual'
  const [mrBaseManual, setMrBaseManual] = useState(0)
  const [mrSubleitoManual, setMrSubleitoManual] = useState(0)
  const [usaMrManual, setUsaMrManual] = useState(false)

  // Coeficientes
  const [zr, setZr] = useState(-1.282) 
  const [so, setSo] = useState(0.45)
  const [a2, setA2] = useState(0.14) // Coef. Estrutural Base
  const [m2, setM2] = useState(1.0)  // Coef. Drenagem

  const [resultadoDim, setResultadoDim] = useState(null)

  // --- FUNÇÕES ---
  const handleLimparTudo = () => {
    if (window.confirm("Reiniciar projeto?")) {
      setEtapa(1); setListaVeiculos([]); setResultadoTrafego(null); setResultadoDim(null);
    }
  }

  const adicionarVeiculo = () => {
    if (!vdmAtual || vdmAtual <= 0) return alert("VDM inválido");
    setListaVeiculos([...listaVeiculos, { classe: classeAtual, vdm: parseFloat(vdmAtual) }]);
    setVdmAtual("");
  }

  const calcularTrafego = async () => {
    if (listaVeiculos.length === 0) return alert("Adicione veículos");
    const dados = { anos: parseInt(anos), taxa_crescimento: parseFloat(taxa), fator_faixa: parseFloat(fatorFaixa), veiculos: listaVeiculos };
    try {
      const res = await fetch(`${API_URL}/api/calcular-trafego/`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(dados) });
      const json = await res.json();
      setResultadoTrafego(json);
    } catch (e) { alert("Erro servidor"); }
  }

  const calcularDimensionamento = async () => {
    if (!resultadoTrafego) return alert("Calcule o tráfego primeiro");
    
    // Calcula Delta PSI no frontend ou backend? Vamos mandar tudo.
    const vdmTotal = listaVeiculos.reduce((acc, i) => acc + i.vdm, 0)
    
    const dados = {
        n_projeto: resultadoTrafego.n_final_projeto,
        meses_seco: parseInt(mesesSecos),
        meses_umido: 12 - parseInt(mesesSecos),
        
        // Novos Inputs
        p0: parseFloat(p0),
        pt: parseFloat(pt),
        case_pol: parseFloat(casePol),
        
        cbr_subleito: parseFloat(cbrSubleito),
        cbr_base: parseFloat(cbrBase),
        
        usa_mr_manual: usaMrManual,
        metodo_mr_base: metodoMrBase,
        mr_subleito_manual: parseFloat(mrSubleitoManual),
        mr_base_manual: parseFloat(mrBaseManual),
        
        zr: parseFloat(zr),
        so: parseFloat(so),
        a2: parseFloat(a2),
        m2: parseFloat(m2),
        
        vdm_medio: vdmTotal,
        // Clima (Seco/Umido) agora é implícito nos meses, mas mantemos pro Gravel Loss
        clima: mesesSecos >= 6 ? 'seco' : 'umido' 
    };

    try {
        const res = await fetch(`${API_URL}/api/calcular-13-passos/`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(dados) });
        const json = await res.json();
        setResultadoDim(json);
    } catch (e) { alert("Erro cálculo"); }
  }

  const baixarPDF = async (tipo) => {
    const endpoint = tipo === 'trafego' ? 'api/gerar-pdf-trafego/' : 'api/gerar-pdf/';
    const vdmTotal = listaVeiculos.reduce((acc, i) => acc + i.vdm, 0)
    const dados = { 
        anos, taxa, fator_faixa: fatorFaixa, resultado_trafego: resultadoTrafego,
        cbr: cbrSubleito, vdm_medio: vdmTotal,
        delta_psi: (p0 - pt).toFixed(1), case_value: casePol,
        mr_seco: resultadoDim?.passo_5_mrs.seco,
        mr_umido: resultadoDim?.passo_5_mrs.umido,
        resultado_dim: resultadoDim
    };
    try {
        const res = await fetch(`${API_URL}/${endpoint}`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(dados) });
        if(!res.ok) throw new Error("Erro PDF");
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `Relatorio_${tipo}.pdf`; document.body.appendChild(a); a.click(); a.remove();
    } catch (e) { alert("Erro PDF"); }
  }

  // --- RENDERIZADORES ---
  const renderTelaTrafego = () => (
    <div className="animate-fade-in space-y-6">
        {/* ... (TELA DE TRÁFEGO MANTIDA IGUAL, SÓ CORTANDO PRA CABER AQUI) ... */}
        {/* (Use o código da versão anterior para a Tela 1, não mudou nada nela) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="font-bold text-lg mb-4 text-blue-800">1. Parâmetros de Tráfego</h3>
            <div className="grid grid-cols-3 gap-4 mb-4">
                <div><label className="text-xs font-bold">Anos</label><input type="number" className="w-full p-2 border rounded" value={anos} onChange={e=>setAnos(e.target.value)}/></div>
                <div><label className="text-xs font-bold">Taxa (%)</label><input type="number" className="w-full p-2 border rounded" value={taxa} onChange={e=>setTaxa(e.target.value)}/></div>
                <div><label className="text-xs font-bold">Fator</label><input type="number" className="w-full p-2 border rounded" value={fatorFaixa} onChange={e=>setFatorFaixa(e.target.value)}/></div>
            </div>
            <div className="flex gap-2 items-end mb-2">
                <select className="w-full p-2 border rounded" value={classeAtual} onChange={e=>setClasseAtual(e.target.value)}>{OPCOES_VEICULOS.map(c=><option key={c}>{c}</option>)}</select>
                <input type="number" className="w-full p-2 border rounded" value={vdmAtual} onChange={e=>setVdmAtual(e.target.value)}/>
                <button onClick={adicionarVeiculo} className="bg-green-600 text-white px-4 py-2 rounded">+</button>
            </div>
            {listaVeiculos.map((v,i)=>(<div key={i} className="flex justify-between text-sm border-b p-1"><span>{v.classe}</span><span>{v.vdm}</span><button onClick={()=>setListaVeiculos(listaVeiculos.filter((_,idx)=>idx!==i))} className="text-red-500">X</button></div>))}
            <button onClick={calcularTrafego} className="w-full mt-4 bg-blue-700 text-white font-bold py-3 rounded-lg">CALCULAR N</button>
        </div>
        {resultadoTrafego && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="text-center mb-4"><div className="text-3xl font-extrabold text-green-700">{formatScientific(resultadoTrafego.n_final_projeto)}</div></div>
                <div className="h-64 mb-6"><ResponsiveContainer><LineChart data={resultadoTrafego.progressao}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="ano"/><YAxis tickFormatter={formatScientific} width={50}/><Tooltip formatter={(v)=>formatScientific(v)}/><Legend/><Line type="monotone" dataKey="n_aashto_acumulado" stroke="#2563eb"/><Line type="monotone" dataKey="n_usace_acumulado" stroke="#9333ea"/></LineChart></ResponsiveContainer></div>
                <div className="flex gap-4">
                    <button onClick={()=>baixarPDF('trafego')} className="flex-1 border p-3 rounded">PDF Tráfego</button>
                    <button onClick={()=>setEtapa(2)} className="flex-1 bg-orange-500 text-white font-bold p-3 rounded">Avançar ➔</button>
                </div>
            </div>
        )}
    </div>
  )

  const renderTelaDimensionamento = () => (
    <div className="animate-fade-in max-w-3xl mx-auto">
        <button onClick={() => setEtapa(1)} className="mb-4 text-blue-600 font-bold hover:underline">⬅ Voltar</button>
        
        {/* PARTE DE CIMA: INPUTS (VERTICAL) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-6">
            <h2 className="text-xl font-bold text-gray-800 border-b pb-2">Entrada de Dados</h2>

            {/* 1. Clima */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                <h3 className="font-bold text-sm text-blue-800 mb-2">1. Clima (Sazonalidade)</h3>
                <div className="flex gap-4 items-center">
                    <div className="flex-1"><label className="text-xs block">Meses Secos</label><input type="number" className="w-full p-2 border rounded" value={mesesSecos} onChange={e=>setMesesSecos(e.target.value)}/></div>
                    <div className="flex-1"><label className="text-xs block">Meses Úmidos</label><div className="p-2 bg-white border rounded text-center">{12-mesesSecos}</div></div>
                </div>
            </div>

            {/* 2. PS e CASE */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                <h3 className="font-bold text-sm text-blue-800 mb-2">2. Critérios de Serviço</h3>
                <div className="grid grid-cols-3 gap-4 mb-2">
                    <div><label className="text-xs block">P0 (Inicial)</label><input type="number" className="w-full p-2 border rounded" value={p0} onChange={e=>setP0(e.target.value)}/></div>
                    <div><label className="text-xs block">Pt (Terminal)</label><input type="number" className="w-full p-2 border rounded" value={pt} onChange={e=>setPt(e.target.value)}/></div>
                    <div className="flex items-center pt-4 font-bold text-orange-600">ΔPS: {(p0-pt).toFixed(1)}</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs block">CASE (pol)</label>
                        <select className="w-full p-2 border rounded" value={casePol} onChange={e=>setCasePol(e.target.value)}><option value="1">1"</option><option value="2">2"</option></select>
                    </div>
                    <div className="flex items-center pt-4 text-sm text-gray-500">= {(casePol * 0.0254).toFixed(4)} m</div>
                </div>
            </div>

            {/* 3. MR (CBR) */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                <h3 className="font-bold text-sm text-blue-800 mb-2">3. Propriedades Materiais (MR)</h3>
                <div className="flex gap-4 mb-4 text-xs">
                    <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={!usaMrManual} onChange={()=>setUsaMrManual(false)}/> Calcular via CBR</label>
                    <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={usaMrManual} onChange={()=>setUsaMrManual(true)}/> Inserir Manual</label>
                </div>

                {!usaMrManual ? (
                    <>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div><label className="text-xs block">CBR Subleito (%)</label><input type="number" className="w-full p-2 border rounded" value={cbrSubleito} onChange={e=>setCbrSubleito(e.target.value)}/></div>
                            <div><label className="text-xs block">CBR Base (%)</label><input type="number" className="w-full p-2 border rounded" value={cbrBase} onChange={e=>setCbrBase(e.target.value)}/></div>
                        </div>
                        {/* Seleção da Fórmula da Base */}
                        <div className="bg-blue-100 p-3 rounded text-xs">
                            <p className="font-bold mb-1">Método MR da Base:</p>
                            <select className="w-full p-1 border rounded" value={metodoMrBase} onChange={e=>setMetodoMrBase(e.target.value)}>
                                <option value="brown">Brown et al. (1990) - MR = ...</option>
                                <option value="preussler">Preussler (1983) - MR = ...</option>
                            </select>
                        </div>
                    </>
                ) : (
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-xs block">MR Subleito (MPa)</label><input type="number" className="w-full p-2 border rounded" value={mrSubleitoManual} onChange={e=>setMrSubleitoManual(e.target.value)}/></div>
                        <div><label className="text-xs block">MR Base (MPa)</label><input type="number" className="w-full p-2 border rounded" value={mrBaseManual} onChange={e=>setMrBaseManual(e.target.value)}/></div>
                    </div>
                )}
            </div>

            {/* 4. Coeficientes */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                <h3 className="font-bold text-sm text-blue-800 mb-2">4. Coeficientes</h3>
                <div className="grid grid-cols-4 gap-2">
                    <div><label className="text-xs block">Zr</label><input type="number" className="w-full p-2 border rounded" value={zr} onChange={e=>setZr(e.target.value)}/></div>
                    <div><label className="text-xs block">S0</label><input type="number" className="w-full p-2 border rounded" value={so} onChange={e=>setSo(e.target.value)}/></div>
                    <div><label className="text-xs block">CE (a2)</label><input type="number" className="w-full p-2 border rounded" value={a2} onChange={e=>setA2(e.target.value)}/></div>
                    <div><label className="text-xs block">CD (m2)</label><input type="number" className="w-full p-2 border rounded" value={m2} onChange={e=>setM2(e.target.value)}/></div>
                </div>
            </div>

            <button onClick={calcularDimensionamento} className="w-full bg-orange-600 text-white font-bold py-3 rounded-lg hover:bg-orange-700 shadow-lg">CALCULAR AGORA</button>
        </div>

        {/* PARTE DE BAIXO: RESULTADOS */}
        {resultadoDim && (
            <div className="mt-8 bg-white p-6 rounded-xl shadow-lg border-2 border-orange-100 animate-fade-in-up">
                <h2 className="text-xl font-bold text-gray-800 border-b pb-4 mb-4 text-center">Resultados do Dimensionamento</h2>
                
                {/* Tabela de Danos */}
                <div className="overflow-x-auto mb-6">
                    <table className="w-full text-xs text-center border">
                        <thead className="bg-gray-100 font-bold">
                            <tr><th className="p-2">Esp (pol)</th><th className="p-2 text-blue-600">Dano PSI</th><th className="p-2 text-purple-600">Dano CASE</th></tr>
                        </thead>
                        <tbody>
                            {resultadoDim.passo_3_tabela.map((lin, k) => (
                                <tr key={k} className={lin.dano_ps <= 1 && lin.dano_case <= 1 ? "bg-green-100 font-bold border-l-4 border-green-500" : ""}>
                                    <td className="p-2">{lin.espessura_pol}"</td>
                                    <td className="p-2">{lin.dano_ps.toFixed(2)}</td>
                                    <td className="p-2">{lin.dano_case.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center mb-6">
                    <div className="p-2 bg-gray-50 rounded border"><div className="text-[10px] font-bold text-gray-500">Esp. Média</div><div className="text-lg font-bold">{resultadoDim.passo_12_media_cm} cm</div></div>
                    <div className="p-2 bg-gray-50 rounded border"><div className="text-[10px] font-bold text-gray-500">Gravel Loss</div><div className="text-lg font-bold">{resultadoDim.passo_13_gl_cm} cm</div></div>
                    <div className="p-2 bg-green-100 rounded border border-green-300"><div className="text-[10px] font-bold text-green-700">FINAL</div><div className="text-2xl font-extrabold text-green-800">{resultadoDim.passo_13_final_cm} cm</div></div>
                </div>

                <button onClick={()=>baixarPDF('final')} className="w-full border-2 border-gray-800 text-gray-800 font-bold py-3 rounded-lg hover:bg-gray-800 hover:text-white transition flex justify-center items-center gap-2">
                    <FileText/> BAIXAR RELATÓRIO COMPLETO
                </button>
            </div>
        )}
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 p-4 font-sans text-gray-800">
        <div className="max-w-6xl mx-auto">
            <header className="flex justify-between items-center mb-6 pb-4 border-b">
                <h1 className="text-2xl font-bold text-blue-900">RMPav Web</h1>
                <button onClick={handleLimparTudo} className="p-2 hover:bg-gray-200 rounded-full"><RotateCcw size={20}/></button>
            </header>
            {etapa === 1 ? renderTelaTrafego() : renderTelaDimensionamento()}
        </div>
    </div>
  )
}

export default App




