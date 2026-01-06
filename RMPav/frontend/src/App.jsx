import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Info, FileText, RotateCcw } from 'lucide-react';

const OPCOES_VEICULOS = ["2C", "2CB", "3C", "3T6", "4CD", "2S1", "2S2", "2S3", "3S2", "3S3"]

const formatScientific = (value) => {
  if (value === 0) return "0";
  return value.toExponential(1);
}

function App() {
  const API_URL = import.meta.env.VITE_API_URL;

  // --- NAVEGAÇÃO ---
  const [etapa, setEtapa] = useState(1)

  // --- DADOS TRÁFEGO (Passo 1) ---
  const [anos, setAnos] = useState(10)
  const [taxa, setTaxa] = useState(5)
  const [fatorFaixa, setFatorFaixa] = useState(1.0)
  const [listaVeiculos, setListaVeiculos] = useState([]) 
  const [classeAtual, setClasseAtual] = useState("4CD")
  const [vdmAtual, setVdmAtual] = useState("")
  const [resultadoTrafego, setResultadoTrafego] = useState(null)

  // --- DADOS DIMENSIONAMENTO (Passos 2-13) ---
  const [clima, setClima] = useState("seco") // Passo 2
  const [mesesSecos, setMesesSecos] = useState(6)
  const [deltaPSI, setDeltaPSI] = useState(2.0) // Passo 4
  const [caseValue, setCaseValue] = useState("1")
  
  // Passo 5 (MR)
  const [cbrSubleito, setCbrSubleito] = useState(10)
  const [cbrBase, setCbrBase] = useState(80)
  const [metodoMR, setMetodoMR] = useState("calculado")
  const [mrSubleitoManual, setMrSubleitoManual] = useState(0)
  const [mrBaseManual, setMrBaseManual] = useState(0)

  // Passo 6 (Coeficientes)
  const [zr, setZr] = useState(-1.282) // 90%
  const [so, setSo] = useState(0.45)

  const [resultadoDim, setResultadoDim] = useState(null)

  // --- FUNÇÕES ---
  const handleLimparTudo = () => {
    if (window.confirm("Tem certeza que deseja apagar tudo e reiniciar o projeto?")) {
      setEtapa(1);
      setAnos(10); setTaxa(5); setFatorFaixa(1.0);
      setListaVeiculos([]); setClasseAtual("4CD"); setVdmAtual("");
      setResultadoTrafego(null);
      setClima("seco"); setMesesSecos(6); setDeltaPSI(2.0); setCaseValue("1");
      setCbrSubleito(10); setCbrBase(80); setMetodoMR("calculado");
      setResultadoDim(null);
    }
  }

  const adicionarVeiculo = () => {
    if (!vdmAtual || vdmAtual <= 0) return alert("VDM inválido");
    setListaVeiculos([...listaVeiculos, { classe: classeAtual, vdm: parseFloat(vdmAtual) }]);
    setVdmAtual("");
  }

  const removerVeiculo = (idx) => {
    setListaVeiculos(listaVeiculos.filter((_, i) => i !== idx))
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
    if (!resultadoTrafego) return alert("Calcule o tráfego primeiro (Passo 1)");
    
    const dados = {
        n_projeto: resultadoTrafego.n_final_projeto,
        meses_seco: parseInt(mesesSecos),
        meses_umido: 12 - parseInt(mesesSecos),
        delta_psi: parseFloat(deltaPSI),
        case_value: caseValue,
        cbr_subleito: parseFloat(cbrSubleito),
        cbr_base: parseFloat(cbrBase),
        metodo_mr: metodoMR,
        mr_subleito_manual: parseFloat(mrSubleitoManual),
        mr_base_manual: parseFloat(mrBaseManual),
        zr: parseFloat(zr),
        so: parseFloat(so),
        clima: clima
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
        // Dados dimensão
        cbr: cbrSubleito, clima, vdm_medio: vdmTotal,
        meses_seco: parseInt(mesesSecos), meses_umido: 12 - parseInt(mesesSecos),
        delta_psi: parseFloat(deltaPSI), case_value: caseValue,
        resultado_dim: resultadoDim
    };
    try {
        const res = await fetch(`${API_URL}/${endpoint}`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(dados) });
        if(!res.ok) throw new Error("Erro PDF");
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = "Relatorio_RMPav.pdf"; document.body.appendChild(a); a.click(); a.remove();
    } catch (e) { alert("Erro ao baixar PDF"); }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 font-sans text-gray-800">
        <div className="max-w-6xl mx-auto">
            
            {/* HEADER COM BOTÃO REINICIAR */}
            <header className="bg-white p-4 md:p-6 rounded-xl shadow-sm mb-6 flex flex-col md:flex-row justify-between items-center border border-gray-200 gap-4">
                <div className="flex items-center gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-extrabold text-blue-900">RMPav<span className="text-orange-500">Web</span></h1>
                        <p className="text-gray-500 text-xs md:text-sm">Engenharia Rodoviária Inteligente</p>
                    </div>
                </div>

                <div className="flex gap-2 items-center">
                    {/* Botões de Navegação */}
                    <div className="bg-gray-100 p-1 rounded-lg flex">
                        <button onClick={() => setEtapa(1)} className={`px-4 py-2 rounded-md text-sm font-bold transition ${etapa === 1 ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>1. Tráfego</button>
                        <button onClick={() => setEtapa(2)} className={`px-4 py-2 rounded-md text-sm font-bold transition ${etapa === 2 ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>2. Dimensionamento</button>
                    </div>

                    {/* Divisória Vertical */}
                    <div className="h-8 w-px bg-gray-300 mx-2 hidden md:block"></div>

                    {/* Botão Reiniciar */}
                    <button 
                        onClick={handleLimparTudo} 
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition"
                        title="Reiniciar Projeto"
                    >
                        <RotateCcw size={20} />
                    </button>
                </div>
            </header>

            {/* --- TELA 1: TRÁFEGO --- */}
            {etapa === 1 && (
                <div className="space-y-6 animate-fade-in">
                    {/* INPUTS TRÁFEGO */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="font-bold text-lg mb-4 text-blue-800 border-b pb-2">1. Parâmetros de Tráfego</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div><label className="block text-xs font-bold text-gray-500">Anos</label><input type="number" className="w-full p-2 border rounded" value={anos} onChange={e=>setAnos(e.target.value)}/></div>
                            <div><label className="block text-xs font-bold text-gray-500">Taxa (%)</label><input type="number" className="w-full p-2 border rounded" value={taxa} onChange={e=>setTaxa(e.target.value)}/></div>
                            <div><label className="block text-xs font-bold text-gray-500">Fator Faixa</label><input type="number" className="w-full p-2 border rounded" value={fatorFaixa} onChange={e=>setFatorFaixa(e.target.value)}/></div>
                        </div>
                        
                        {/* VEICULOS */}
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                            <div className="flex gap-2 items-end mb-2">
                                <div className="flex-1"><label className="text-xs font-bold">Classe</label><select className="w-full p-2 border rounded" value={classeAtual} onChange={e=>setClasseAtual(e.target.value)}>{OPCOES_VEICULOS.map(c=><option key={c}>{c}</option>)}</select></div>
                                <div className="flex-1"><label className="text-xs font-bold">VDM</label><input type="number" className="w-full p-2 border rounded" value={vdmAtual} onChange={e=>setVdmAtual(e.target.value)}/></div>
                                <button onClick={adicionarVeiculo} className="bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700">+</button>
                            </div>
                            {listaVeiculos.length > 0 ? (
                                listaVeiculos.map((v,i)=>(<div key={i} className="flex justify-between text-sm border-b border-blue-200 p-1 last:border-0"><span>{v.classe}</span><span>{v.vdm} vpd</span><button onClick={()=>setListaVeiculos(listaVeiculos.filter((_,idx)=>idx!==i))} className="text-red-500 font-bold hover:text-red-700">X</button></div>))
                            ) : (
                                <p className="text-xs text-center text-blue-400 mt-2">Nenhum veículo adicionado.</p>
                            )}
                        </div>

                        <button onClick={calcularTrafego} className="w-full mt-4 bg-blue-700 text-white font-bold py-3 rounded-lg hover:bg-blue-800 transition shadow-md">CALCULAR N</button>
                    </div>

                    {/* RESULTADOS TRÁFEGO */}
                    {resultadoTrafego && (
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <div className="grid grid-cols-2 gap-4 text-center mb-6">
                                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                    <div className="text-xs text-gray-500 font-bold uppercase">N AASHTO</div>
                                    <div className="text-xl font-bold text-blue-600">{resultadoTrafego.n_total_aashto.toLocaleString()}</div>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                    <div className="text-xs text-gray-500 font-bold uppercase">N USACE</div>
                                    <div className="text-xl font-bold text-purple-600">{resultadoTrafego.n_total_usace.toLocaleString()}</div>
                                </div>
                            </div>
                            <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg mb-6">
                                <div className="text-xs text-green-700 uppercase font-bold">N de Projeto (Maior)</div>
                                <div className="text-4xl font-extrabold text-green-700 tracking-tight">{resultadoTrafego.n_final_projeto.toExponential(2)}</div>
                            </div>
                            
                            {/* GRÁFICO */}
                            <div className="h-64 w-full mb-6">
                                <ResponsiveContainer><LineChart data={resultadoTrafego.progressao}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="ano"/><YAxis width={40} tickFormatter={formatScientific}/><Tooltip formatter={(v) => v.toExponential(2)}/><Legend/><Line type="monotone" dataKey="n_aashto_acumulado" name="AASHTO" stroke="#2563eb" strokeWidth={2}/><Line type="monotone" dataKey="n_usace_acumulado" name="USACE" stroke="#9333ea" strokeWidth={2}/></LineChart></ResponsiveContainer>
                            </div>

                            {/* BOTÕES PDF E AVANÇAR */}
                            <div className="flex flex-col md:flex-row gap-4">
                                <button onClick={() => baixarPDF('trafego')} className="flex-1 border-2 border-gray-200 text-gray-600 py-3 rounded-lg flex justify-center items-center gap-2 hover:bg-gray-50 hover:border-gray-300 font-bold transition"><FileText size={18}/> Relatório Tráfego</button>
                                <button onClick={() => setEtapa(2)} className="flex-1 bg-orange-500 text-white font-bold py-3 rounded-lg hover:bg-orange-600 shadow-md transition">Avançar para Dimensionamento ➔</button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* --- TELA 2: DIMENSIONAMENTO (13 PASSOS) --- */}
            {etapa === 2 && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
                    
                    {/* COLUNA ESQUERDA: INPUTS */}
                    <div className="lg:col-span-1 space-y-4">
                        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                            <h3 className="font-bold text-orange-700 mb-3 border-b pb-2">Entrada de Dados</h3>
                            
                            {/* 2. Clima */}
                            <div className="mb-3">
                                <label className="label-input">2. Clima</label>
                                <select className="input-field" value={clima} onChange={e=>setClima(e.target.value)}>
                                    <option value="seco">Seco</option><option value="umido">Úmido</option>
                                </select>
                                <div className="flex gap-2 mt-2">
                                    <div className="flex-1"><label className="text-[10px]">Meses Secos</label><input type="number" className="input-field" value={mesesSecos} onChange={e=>setMesesSecos(e.target.value)}/></div>
                                    <div className="flex-1"><label className="text-[10px]">Meses Úmidos</label><div className="p-2 bg-gray-100 rounded text-center text-sm font-bold border">{12-mesesSecos}</div></div>
                                </div>
                            </div>

                            {/* 4. PS e CASE */}
                            <div className="mb-3 flex gap-2">
                                <div className="flex-1"><label className="label-input flex items-center gap-1">4. ΔPSI <Info size={10}/></label><input type="number" className="input-field" value={deltaPSI} onChange={e=>setDeltaPSI(e.target.value)}/></div>
                                <div className="flex-1"><label className="label-input flex items-center gap-1">CASE <Info size={10}/></label><select className="input-field" value={caseValue} onChange={e=>setCaseValue(e.target.value)}><option value="1">1</option><option value="2">2</option></select></div>
                            </div>

                            {/* 5. MR */}
                            <div className="mb-3 bg-orange-50 p-2 rounded border border-orange-100">
                                <label className="label-input text-orange-800">5. MR Subleito/Base</label>
                                <div className="flex gap-2 mb-2 text-[10px]">
                                    <label className="cursor-pointer"><input type="radio" checked={metodoMR==='calculado'} onChange={()=>setMetodoMR('calculado')}/> Via CBR</label>
                                    <label className="cursor-pointer"><input type="radio" checked={metodoMR==='manual'} onChange={()=>setMetodoMR('manual')}/> Manual</label>
                                </div>
                                {metodoMR === 'calculado' ? (
                                    <div className="flex gap-2">
                                        <div><label className="text-[10px]">CBR Sub (%)</label><input type="number" className="input-field bg-white" value={cbrSubleito} onChange={e=>setCbrSubleito(e.target.value)}/></div>
                                        <div><label className="text-[10px]">CBR Base (%)</label><input type="number" className="input-field bg-white" value={cbrBase} onChange={e=>setCbrBase(e.target.value)}/></div>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <div><label className="text-[10px]">MR Sub (psi)</label><input type="number" className="input-field bg-white" value={mrSubleitoManual} onChange={e=>setMrSubleitoManual(e.target.value)}/></div>
                                        <div><label className="text-[10px]">MR Base (psi)</label><input type="number" className="input-field bg-white" value={mrBaseManual} onChange={e=>setMrBaseManual(e.target.value)}/></div>
                                    </div>
                                )}
                            </div>

                            {/* 6. Coeficientes */}
                            <div className="mb-3 flex gap-2">
                                <div className="flex-1"><label className="label-input">6. Zr</label><input type="number" className="input-field" value={zr} onChange={e=>setZr(e.target.value)}/></div>
                                <div className="flex-1"><label className="label-input">S0</label><input type="number" className="input-field" value={so} onChange={e=>setSo(e.target.value)}/></div>
                            </div>

                            <button onClick={calcularDimensionamento} className="w-full bg-orange-600 text-white font-bold py-3 rounded-lg hover:bg-orange-700 shadow-md transition">CALCULAR 13 PASSOS</button>
                        </div>
                    </div>

                    {/* COLUNA DIREITA: RESULTADOS */}
                    <div className="lg:col-span-2">
                        {resultadoDim ? (
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-full flex flex-col">
                                <h3 className="font-bold text-blue-900 mb-4 border-b pb-2 flex justify-between items-center">
                                    Memorial de Cálculo Detalhado
                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full uppercase">{resultadoDim.status}</span>
                                </h3>
                                
                                <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                                    <div className="p-3 bg-gray-50 rounded border border-gray-100">
                                        <div className="font-bold text-gray-500 text-xs uppercase mb-1">7. Tráfego Sazonal</div>
                                        <div className="flex justify-between"><span>Seco:</span> <strong>{resultadoDim.passo_7_trafego_sazonal.seco.toExponential(2)}</strong></div>
                                        <div className="flex justify-between"><span>Úmido:</span> <strong>{resultadoDim.passo_7_trafego_sazonal.umido.toExponential(2)}</strong></div>
                                    </div>
                                    <div className="p-3 bg-gray-50 rounded border border-gray-100">
                                        <div className="font-bold text-gray-500 text-xs uppercase mb-1">5. MRs Adotados</div>
                                        <div className="flex justify-between"><span>Seco:</span> <strong>{resultadoDim.passo_5_mrs.seco} psi</strong></div>
                                        <div className="flex justify-between"><span>Úmido:</span> <strong>{resultadoDim.passo_5_mrs.umido} psi</strong></div>
                                    </div>
                                </div>

                                <h4 className="font-bold text-xs text-gray-500 uppercase mb-2">Passos 8 a 11: Tabela de Tentativas</h4>
                                <div className="overflow-x-auto mb-6 border rounded-lg">
                                    <table className="w-full text-xs text-center">
                                        <thead className="bg-gray-100 text-gray-600 font-bold">
                                            <tr>
                                                <th className="p-2 border-r">Esp (pol)</th>
                                                <th className="p-2 border-r text-blue-700">Dano PSI (9)</th>
                                                <th className="p-2 text-purple-700">Dano CASE (11)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {resultadoDim.passo_3_tabela.map((lin, k) => (
                                                <tr key={k} className={lin.dano_ps <= 1 && lin.dano_case <= 1 ? "bg-green-50 font-bold border-l-4 border-green-500" : "hover:bg-gray-50"}>
                                                    <td className="p-2 border-r">{lin.espessura_pol}"</td>
                                                    <td className="p-2 border-r">{lin.dano_ps.toFixed(2)}</td>
                                                    <td className="p-2">{lin.dano_case.toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="mt-auto">
                                    <div className="grid grid-cols-3 gap-4 mb-6">
                                        <div className="text-center p-3 bg-orange-50 border border-orange-100 rounded-lg">
                                            <div className="text-[10px] uppercase font-bold text-orange-800">12. Esp. Média</div>
                                            <div className="text-xl font-bold">{resultadoDim.passo_12_media_cm} cm</div>
                                        </div>
                                        <div className="text-center p-3 bg-orange-50 border border-orange-100 rounded-lg">
                                            <div className="text-[10px] uppercase font-bold text-orange-800">GL (10 anos)</div>
                                            <div className="text-xl font-bold">{resultadoDim.passo_13_gl_cm} cm</div>
                                        </div>
                                        <div className="text-center p-3 bg-green-100 border border-green-200 rounded-lg shadow-sm">
                                            <div className="text-[10px] uppercase font-bold text-green-800">13. FINAL</div>
                                            <div className="text-3xl font-extrabold text-green-800">{resultadoDim.passo_13_final_cm} <span className="text-sm">cm</span></div>
                                        </div>
                                    </div>

                                    <button onClick={() => baixarPDF('final')} className="w-full bg-gray-800 text-white font-bold py-3 rounded-lg hover:bg-gray-900 transition flex justify-center items-center gap-2 shadow-lg">
                                        <FileText size={20}/> BAIXAR MEMORIAL COMPLETO
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 text-gray-400 p-10">
                                <Info size={40} className="mb-2 opacity-50"/>
                                <p>Preencha os dados à esquerda e clique em Calcular</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
        <style>{`.label-input { display: block; font-size: 10px; font-weight: bold; color: #4b5563; margin-bottom: 2px; } .input-field { width: 100%; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px; }`}</style>
    </div>
  )
}

export default App



