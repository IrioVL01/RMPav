import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Info, FileText, RotateCcw, Table as TableIcon, X } from 'lucide-react';

const OPCOES_VEICULOS = ["2C", "2CB", "3C", "3T6", "4CD", "2S1", "2S2", "2S3", "3S2", "3S3"]

// Formatador A x 10^n para o Gráfico
const formatScientificGraph = (value) => {
  if (value === 0) return "0";
  const exponent = Math.floor(Math.log10(value));
  const mantissa = (value / Math.pow(10, exponent)).toFixed(1);
  return `${mantissa}×10^${exponent}`;
}

const formatTooltipScientific = (value) => value.toExponential(2);

function App() {
  const API_URL = import.meta.env.VITE_API_URL;

  // ESTADOS GLOBAIS
  const [etapa, setEtapa] = useState(1)
  const [activeModal, setActiveModal] = useState(null)

  // TRÁFEGO
  const [anos, setAnos] = useState(10)
  const [taxa, setTaxa] = useState(5)
  const [fatorFaixa, setFatorFaixa] = useState(1.0)
  const [listaVeiculos, setListaVeiculos] = useState([]) 
  const [classeAtual, setClasseAtual] = useState("4CD")
  const [vdmAtual, setVdmAtual] = useState("")
  const [resultadoTrafego, setResultadoTrafego] = useState(null)

  // DIMENSIONAMENTO
  const [mesesSecos, setMesesSecos] = useState(6)
  const [p0, setP0] = useState(4.2)
  const [pt, setPt] = useState(2.5)
  const [casePol, setCasePol] = useState(1)

  const [cbrSubleito, setCbrSubleito] = useState(10)
  const [cbrBase, setCbrBase] = useState(60)
  const [mrBaseChoice, setMrBaseChoice] = useState('brown')
  const [mrBaseManual, setMrBaseManual] = useState(0)
  const [mrSubleitoManual, setMrSubleitoManual] = useState(0)
  const [mrSubChoice, setMrSubChoice] = useState('auto')

  const [R_conf, setR_conf] = useState(85)
  const [so, setSo] = useState(0.45)
  
  const [metodoCE, setMetodoCE] = useState('calculado')
  const [ceBase, setCeBase] = useState(0.14)
  const [cdBase, setCdBase] = useState(1.0)

  const [resultadoDim, setResultadoDim] = useState(null)

  // --- LÓGICA MATEMÁTICA FRONTEND ---
  const getZrTable = (r) => {
      const map = {50:0, 60:-0.253, 70:-0.524, 75:-0.674, 80:-0.841, 85:-1.036, 90:-1.282, 95:-1.645, 99:-2.326, 99.9:-3.090};
      const keys = Object.keys(map).map(Number).sort((a,b)=>a-b);
      if (r <= keys[0]) return map[keys[0]];
      if (r >= keys[keys.length-1]) return map[keys[keys.length-1]];
      for (let i=0; i < keys.length-1; i++) {
          if (r >= keys[i] && r <= keys[i+1]) {
              const x0 = keys[i], x1 = keys[i+1];
              const y0 = map[x0], y1 = map[x1];
              return y0 + (r - x0) * (y1 - y0) / (x1 - x0);
          }
      }
      return -1.036;
  }
  const zrCalculado = getZrTable(parseFloat(R_conf) || 85);

  const calcMrBaseBrown = (cbr) => (2555 * Math.pow(cbr, 0.64));
  const calcMrBasePreussler = (cbr) => (2200 * Math.pow(cbr, 0.55));
  
  const getSoloInfo = (cbr) => {
      if (cbr <= 2) return { classe: "Muito Ruim", mr_umido: 17.24 };
      if (cbr <= 4) return { classe: "Ruim", mr_umido: 22.75 };
      if (cbr <= 8) return { classe: "Fraco", mr_umido: 31.03 };
      if (cbr <= 20) return { classe: "Razoável", mr_umido: 41.37 };
      return { classe: "Bom", mr_umido: 55.16 };
  }
  
  const soloInfo = getSoloInfo(cbrSubleito);
  const valBrownPsi = calcMrBaseBrown(cbrBase);
  const valPreusslerPsi = calcMrBasePreussler(cbrBase);
  const valSubleitoPsi = 1500 * cbrSubleito; 

  const toMpa = (psi) => (psi / 145.038).toFixed(2);
  const mpaToPsi = (mpa) => mpa * 145.038;

  const getFinalMrBase = () => {
      if (mrBaseChoice === 'manual') return parseFloat(mrBaseManual);
      if (mrBaseChoice === 'preussler') return valPreusslerPsi;
      return valBrownPsi;
  }
  const getFinalMrSubleito = () => {
      if (mrSubChoice === 'manual') return parseFloat(mrSubleitoManual);
      return mpaToPsi(soloInfo.mr_umido);
  }

  // --- API ---
  const handleLimparTudo = () => { if (window.confirm("Reiniciar projeto?")) { setEtapa(1); setListaVeiculos([]); setResultadoTrafego(null); setResultadoDim(null); } }
  const adicionarVeiculo = () => { if (!vdmAtual || vdmAtual <= 0) return alert("VDM inválido"); setListaVeiculos([...listaVeiculos, { classe: classeAtual, vdm: parseFloat(vdmAtual) }]); setVdmAtual(""); }
  const removerVeiculo = (idx) => { setListaVeiculos(listaVeiculos.filter((_, i) => i !== idx)) }

  const calcularTrafego = async () => {
    if (listaVeiculos.length === 0) return alert("Adicione veículos");
    const dados = { anos: parseInt(anos), taxa_crescimento: parseFloat(taxa), fator_faixa: parseFloat(fatorFaixa), veiculos: listaVeiculos };
    try { const res = await fetch(`${API_URL}/api/calcular-trafego/`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(dados) }); const json = await res.json(); setResultadoTrafego(json); } catch (e) { alert("Erro servidor. Verifique se o backend está rodando."); }
  }

  const calcularDimensionamento = async () => {
    if (!resultadoTrafego) return alert("Calcule o tráfego primeiro");
    const vdmTotal = listaVeiculos.reduce((acc, i) => acc + i.vdm, 0)
    const dados = {
        n_projeto: resultadoTrafego.n_final_projeto,
        meses_seco: parseInt(mesesSecos), meses_umido: 12 - parseInt(mesesSecos),
        p0: parseFloat(p0), pt: parseFloat(pt), case_pol: parseFloat(casePol),
        mr_base_adotado_psi: getFinalMrBase(), mr_subleito_adotado_psi: getFinalMrSubleito(),
        usa_mr_manual: (mrBaseChoice === 'manual' || mrSubChoice === 'manual'),
        mr_base_manual: parseFloat(mrBaseManual), mr_subleito_manual: parseFloat(mrSubleitoManual),
        cbr_subleito: parseFloat(cbrSubleito), cbr_base: parseFloat(cbrBase),
        zr: zrCalculado, so: parseFloat(so), ce_base_adotado: parseFloat(ceBase), cd_base_adotado: parseFloat(cdBase),
        vdm_medio: vdmTotal, clima: mesesSecos >= 6 ? 'seco' : 'umido' 
    };
    try { const res = await fetch(`${API_URL}/api/calcular-13-passos/`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(dados) }); const json = await res.json(); setResultadoDim(json); } catch (e) { alert("Erro cálculo"); }
  }

  const baixarPDF = async (tipo) => {
    const endpoint = tipo === 'trafego' ? 'api/gerar-pdf-trafego/' : 'api/gerar-pdf/';
    const vdmTotal = listaVeiculos.reduce((acc, i) => acc + i.vdm, 0)
    const dados = { 
        anos, taxa, fator_faixa: fatorFaixa, resultado_trafego: resultadoTrafego,
        cbr: cbrSubleito, vdm_medio: vdmTotal, delta_psi: (p0 - pt).toFixed(1), case_value: casePol,
        mr_seco: getFinalMrBase(), mr_umido: getFinalMrSubleito(), resultado_dim: resultadoDim
    };
    try { const res = await fetch(`${API_URL}/${endpoint}`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(dados) }); if(!res.ok) throw new Error("Erro PDF"); const blob = await res.blob(); const url = window.URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `Relatorio_${tipo}.pdf`; document.body.appendChild(a); a.click(); a.remove(); } catch (e) { alert("Erro PDF"); }
  }

  // --- RENDERIZADORES DE TELA (Estavam faltando ou incompletos) ---
  
  const renderTelaTrafego = () => (
    <div className="animate-fade-in space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="font-bold text-lg mb-4 text-blue-800">1. Parâmetros de Tráfego</h3>
            <div className="grid grid-cols-3 gap-4 mb-4">
                <div><label className="text-xs font-bold text-gray-500">Anos</label><input type="number" className="w-full p-2 border rounded" value={anos} onChange={e=>setAnos(e.target.value)}/></div>
                <div><label className="text-xs font-bold text-gray-500">Taxa (%)</label><input type="number" className="w-full p-2 border rounded" value={taxa} onChange={e=>setTaxa(e.target.value)}/></div>
                <div><label className="text-xs font-bold text-gray-500">Fator</label><input type="number" className="w-full p-2 border rounded" value={fatorFaixa} onChange={e=>setFatorFaixa(e.target.value)}/></div>
            </div>
            <div className="flex gap-2 items-end mb-2">
                <select className="w-full p-2 border rounded" value={classeAtual} onChange={e=>setClasseAtual(e.target.value)}>{OPCOES_VEICULOS.map(c=><option key={c}>{c}</option>)}</select>
                <input type="number" className="w-full p-2 border rounded" value={vdmAtual} onChange={e=>setVdmAtual(e.target.value)}/>
                <button onClick={adicionarVeiculo} className="bg-green-600 text-white px-4 py-2 rounded font-bold">+</button>
            </div>
            {listaVeiculos.map((v,i)=>(<div key={i} className="flex justify-between text-sm border-b p-1"><span>{v.classe}</span><span>{v.vdm}</span><button onClick={()=>setListaVeiculos(listaVeiculos.filter((_,idx)=>idx!==i))} className="text-red-500">X</button></div>))}
            <button onClick={calcularTrafego} className="w-full mt-4 bg-blue-700 text-white font-bold py-3 rounded-lg">CALCULAR N</button>
        </div>
        {resultadoTrafego && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="text-center mb-4"><div className="text-sm font-bold text-green-700 uppercase">N de Projeto (Maior)</div><div className="text-3xl font-extrabold text-green-700">{resultadoTrafego.n_final_projeto.toExponential(2)}</div></div>
                <div className="h-64 mb-6"><ResponsiveContainer><LineChart data={resultadoTrafego.progressao}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="ano"/><YAxis tickFormatter={formatScientificGraph} width={65} style={{fontSize:'10px' }}/><Tooltip formatter={formatTooltipScientific}/><Legend/><Line type="monotone" dataKey="n_aashto_acumulado" name="AASHTO" stroke="#2563eb"/><Line type="monotone" dataKey="n_usace_acumulado" name="USACE" stroke="#9333ea"/></LineChart></ResponsiveContainer></div>
                <div className="flex gap-4">
                    <button onClick={()=>baixarPDF('trafego')} className="flex-1 border p-3 rounded flex items-center justify-center gap-2"><FileText size={16}/> PDF Tráfego</button>
                    <button onClick={()=>setEtapa(2)} className="flex-1 bg-orange-500 text-white font-bold p-3 rounded">Avançar ➔</button>
                </div>
            </div>
        )}
    </div>
  )

  const renderTelaDimensionamento = () => (
    <div className="animate-fade-in max-w-4xl mx-auto">
        <button onClick={() => setEtapa(1)} className="mb-4 text-blue-600 font-bold hover:underline">⬅ Voltar</button>
        
        {/* PARTE DE CIMA: INPUTS */}
        <div className="bg-white p-8 rounded-xl shadow-md border border-gray-200 space-y-8">
            <h2 className="text-2xl font-bold text-gray-800 border-b pb-4">Entrada de Dados - Dimensionamento</h2>

            {/* 1. Clima */}
            <div className="p-5 bg-gray-50 rounded-xl border border-gray-100">
                <h3 className="font-bold text-base text-blue-800 mb-2">1. Clima e Sazonalidade</h3>
                <div className="flex gap-6 items-center">
                    <div className="flex-1"><label className="text-xs font-bold block mb-1">Meses Secos</label><input type="number" className="w-full p-2 border rounded" value={mesesSecos} onChange={e=>setMesesSecos(e.target.value)}/></div>
                    <div className="flex-1"><label className="text-xs font-bold block mb-1">Meses Úmidos</label><div className="p-2 bg-white border rounded text-center font-bold text-gray-600">{12-mesesSecos}</div></div>
                </div>
            </div>

            {/* 2. Critérios de Serviço */}
            <div className="p-5 bg-gray-50 rounded-xl border border-gray-100">
                <h3 className="font-bold text-base text-blue-800 mb-2">2. Critérios de Serviço</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-3 rounded border">
                        <label className="text-xs font-bold text-gray-700 block mb-2 border-b pb-1">ΔPS (Perda de Serventia)</label>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                            <div><span className="block text-gray-400">P0 (St. Inicial)</span><input type="number" className="w-full p-1 border rounded" value={p0} onChange={e=>setP0(e.target.value)}/></div>
                            <div><span className="block text-gray-400">Pt (St. Terminal)</span><input type="number" className="w-full p-1 border rounded" value={pt} onChange={e=>setPt(e.target.value)}/></div>
                            <div className="text-center"><span className="block text-orange-500 font-bold">ΔPS</span><div className="mt-1 font-bold text-lg">{(p0-pt).toFixed(1)}</div></div>
                        </div>
                    </div>
                    <div className="bg-white p-3 rounded border">
                        <label className="text-xs font-bold text-gray-700 block mb-2 border-b pb-1">CASE (Condições Admissíveis da Superfície de Estradas)</label>
                        <div className="flex gap-2 items-center">
                            <select className="flex-1 p-2 border rounded text-sm" value={casePol} onChange={e=>setCasePol(e.target.value)}><option value="1">1 Polegada</option><option value="2">2 Polegadas</option></select>
                             <div className="text-xs text-gray-600 bg-gray-100 p-2 rounded border border-gray-200 font-mono">
                                = {(casePol * 0.0254).toFixed(4)} m
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Propriedades Materiais (MR) */}
            <div className="p-5 bg-blue-50 rounded-xl border border-blue-100">
                <h3 className="font-bold text-base text-blue-800 mb-2">3. Propriedades dos Materiais (MR)</h3>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div><label className="text-xs font-bold block mb-1">CBR Subleito (%)</label><input type="number" className="w-full p-2 border rounded bg-white" value={cbrSubleito} onChange={e=>setCbrSubleito(e.target.value)}/></div>
                    <div><label className="text-xs font-bold block mb-1">CBR Base (%)</label><input type="number" className="w-full p-2 border rounded bg-white" value={cbrBase} onChange={e=>setCbrBase(e.target.value)}/></div>
                </div>

                <div className="overflow-hidden bg-white border rounded-lg shadow-sm">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-100 text-gray-600 font-bold text-xs uppercase">
                            <tr><th className="p-3">Método / Origem</th><th className="p-3">MR Base (Seco)</th><th className="p-3">MR Subleito (Úmido)</th></tr>
                        </thead>
                        <tbody className="divide-y">
                            <tr className={mrBaseChoice === 'brown' ? "bg-blue-50" : ""}>
                                <td className="p-3"><label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="mrBase" checked={mrBaseChoice === 'brown'} onChange={()=>setMrBaseChoice('brown')} /> Brown et al. (1990)</label></td>
                                <td className="p-3 font-mono text-xs"><div>{valBrownPsi.toFixed(0)} psi</div><div className="text-gray-400">{toMpa(valBrownPsi)} MPa</div></td>
                                <td className="p-3 text-center text-gray-300">-</td>
                            </tr>
                            <tr className={mrBaseChoice === 'preussler' ? "bg-blue-50" : ""}>
                                <td className="p-3"><label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="mrBase" checked={mrBaseChoice === 'preussler'} onChange={()=>setMrBaseChoice('preussler')} /> Preussler (1983)</label></td>
                                <td className="p-3 font-mono text-xs"><div>{valPreusslerPsi.toFixed(0)} psi</div><div className="text-gray-400">{toMpa(valPreusslerPsi)} MPa</div></td><td className="p-3 text-center text-gray-300">-</td>
                            </tr>
                            <tr>
                                <td className="p-3 font-bold text-gray-500">Classif. Subleito ({soloInfo.classe})</td>
                                <td className="p-3 text-center text-gray-300">-</td>
                                <td className="p-3 font-mono text-xs bg-green-50"><div>{mpaToPsi(soloInfo.mr_umido).toFixed(0)} psi</div><div className="text-gray-400">{soloInfo.mr_umido} MPa</div></td>
                            </tr>
                            <tr className={mrBaseChoice === 'manual' || mrSubChoice === 'manual' ? "bg-yellow-50" : ""}>
                                <td className="p-3"><label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="mrBase" checked={mrBaseChoice === 'manual'} onChange={()=>setMrBaseChoice('manual')} /> Manual (Ensaio)</label></td>
                                <td className="p-3"><input type="number" placeholder="psi" className="w-full p-1 border rounded text-xs" value={mrBaseManual} onChange={e=>setMrBaseManual(e.target.value)}/></td>
                                <td className="p-3"><div className="flex items-center gap-2"><input type="checkbox" checked={mrSubChoice === 'manual'} onChange={(e)=>setMrSubChoice(e.target.checked ? 'manual' : 'auto')} /><input type="number" placeholder="psi" className="w-full p-1 border rounded text-xs" disabled={mrSubChoice !== 'manual'} value={mrSubleitoManual} onChange={e=>setMrSubleitoManual(e.target.value)}/></div></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 4. Coeficientes */}
            <div className="p-5 bg-gray-50 rounded-xl border border-gray-100">
                <h3 className="font-bold text-base text-blue-800 mb-2">4. Coeficientes de Projeto</h3>
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2"><div className="flex justify-between items-center"><label className="text-xs font-bold">R (Confiabilidade - %)</label><button onClick={() => setActiveModal('zr')} className="text-[10px] text-blue-600 underline flex items-center gap-1"><TableIcon size={12}/> Ver Tabela</button></div><div className="flex gap-2"><input type="number" className="w-20 p-2 border rounded" value={R_conf} onChange={e=>setR_conf(e.target.value)}/><div className="flex-1 bg-gray-200 p-2 rounded text-center text-xs flex items-center justify-center gap-2"><span>Zr Automático:</span><span className="font-bold text-blue-900">{zrCalculado.toFixed(3)}</span></div></div><label className="text-xs font-bold block mt-2">S0 (Desvio Padrão)</label><input type="number" className="w-full p-2 border rounded" value={so} onChange={e=>setSo(e.target.value)}/></div>
                    <div className="space-y-2"><div className="flex justify-between items-center"><label className="text-xs font-bold">CE (Coef. Estrutural Base)</label><button onClick={() => setActiveModal('ce')} className="text-[10px] text-blue-600 underline flex items-center gap-1"><TableIcon size={12}/> Ver Tabela</button></div><div className="flex gap-2 mb-1 text-[10px]"><label className="cursor-pointer"><input type="radio" checked={metodoCE==='calculado'} onChange={()=>setMetodoCE('calculado')}/> Eq. AASHTO</label><label className="cursor-pointer"><input type="radio" checked={metodoCE==='tabela'} onChange={()=>setMetodoCE('tabela')}/> Manual</label></div>{metodoCE === 'calculado' ? (<div className="p-2 bg-gray-100 rounded text-center text-xs text-gray-500">Calculado via MR Base</div>) : (<input type="number" className="w-full p-2 border rounded" value={ceBase} onChange={e=>setCeBase(e.target.value)} placeholder="0.14"/>)}<div className="flex justify-between items-center mt-2"><label className="text-xs font-bold">CD (Coef. Drenagem Base)</label><button onClick={() => setActiveModal('cd')} className="text-[10px] text-blue-600 underline flex items-center gap-1"><TableIcon size={12}/> Ver Tabela</button></div><input type="number" className="w-full p-2 border rounded" value={cdBase} onChange={e=>setCdBase(e.target.value)} placeholder="1.0"/></div>
                </div>
            </div>

            <button onClick={calcularDimensionamento} className="w-full bg-orange-600 text-white font-bold py-4 rounded-xl hover:bg-orange-700 shadow-lg text-lg transition">CALCULAR AGORA</button>
        </div>

        {/* PARTE DE BAIXO: RESULTADOS */}
        {resultadoDim && (
            <div className="mt-8 bg-white p-6 rounded-xl shadow-lg border-2 border-orange-100 animate-fade-in-up">
                <h2 className="text-xl font-bold text-gray-800 border-b pb-4 mb-4 text-center">Resultados</h2>
                <div className="overflow-x-auto mb-6"><table className="w-full text-xs text-center border"><thead className="bg-gray-100 font-bold"><tr><th className="p-2 border-r">Esp (pol)</th><th className="p-2 border-r text-blue-600">Dano PSI</th><th className="p-2 text-purple-600">Dano CASE</th></tr></thead><tbody>{resultadoDim.passo_3_tabela.map((lin, k) => (<tr key={k} className={lin.dano_ps <= 1 && lin.dano_case <= 1 ? "bg-green-100 font-bold border-l-4 border-green-500" : ""}><td className="p-2 border-r">{lin.espessura_pol}"</td><td className="p-2 border-r">{lin.dano_ps.toFixed(2)}</td><td className="p-2">{lin.dano_case.toFixed(2)}</td></tr>))}</tbody></table></div>
                <div className="grid grid-cols-3 gap-4 text-center mb-6"><div className="p-2 bg-gray-50 rounded border"><div className="text-[10px] font-bold text-gray-500">Esp. Média</div><div className="text-lg font-bold">{resultadoDim.passo_12_media_cm} cm</div></div><div className="p-2 bg-gray-50 rounded border"><div className="text-[10px] font-bold text-gray-500">Gravel Loss</div><div className="text-lg font-bold">{resultadoDim.passo_13_gl_cm} cm</div></div><div className="p-2 bg-green-100 rounded border border-green-300"><div className="text-[10px] font-bold text-green-700">FINAL</div><div className="text-2xl font-extrabold text-green-800">{resultadoDim.passo_13_final_cm} cm</div></div></div>
                <button onClick={()=>baixarPDF('final')} className="w-full border-2 border-gray-800 text-gray-800 font-bold py-3 rounded-lg hover:bg-gray-800 hover:text-white transition flex justify-center items-center gap-2"><FileText/> BAIXAR RELATÓRIO COMPLETO</button>
            </div>
        )}
    </div>
  )

  // --- MODAL ---
  // --- MODAL DE TABELAS (REFORMULADO) ---
  const renderModal = () => {
    if (!activeModal) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={() => setActiveModal(null)}>
            <div className="bg-white rounded-lg shadow-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                
                {/* CABEÇALHO DO MODAL */}
                <div className="flex justify-between items-center mb-6 border-b pb-2">
                    <h3 className="text-xl font-bold text-gray-800">
                        {activeModal === 'zr' && "Tabela 4.1 - Desvio Padrão Normal (Zr)"}
                        {activeModal === 'ce' && "Tabela 10.4 - Coeficientes Estruturais (CE)"}
                        {activeModal === 'cd' && "Tabela 10.5 - Coeficientes de Drenagem (CD)"}
                    </h3>
                    <button onClick={() => setActiveModal(null)} className="text-gray-500 hover:text-red-500 transition"><X size={24}/></button>
                </div>

                {/* CONTEÚDO ZR */}
                {activeModal === 'zr' && (
                    <div className="space-y-4">
                        <table className="w-full text-sm text-center border-collapse border border-gray-400">
                            <thead className="bg-gray-200 text-gray-800">
                                <tr>
                                    <th className="border border-gray-400 p-2">Confiabilidade R (%)</th>
                                    <th className="border border-gray-400 p-2">Desvio Padrão Normal (Zr)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr><td className="border border-gray-400 p-2">50</td><td className="border border-gray-400 p-2">0.000</td></tr>
                                <tr><td className="border border-gray-400 p-2">60</td><td className="border border-gray-400 p-2">-0.253</td></tr>
                                <tr><td className="border border-gray-400 p-2">70</td><td className="border border-gray-400 p-2">-0.524</td></tr>
                                <tr><td className="border border-gray-400 p-2">75</td><td className="border border-gray-400 p-2">-0.674</td></tr>
                                <tr><td className="border border-gray-400 p-2">80</td><td className="border border-gray-400 p-2">-0.841</td></tr>
                                <tr><td className="border border-gray-400 p-2 font-bold bg-yellow-50">85</td><td className="border border-gray-400 p-2 font-bold bg-yellow-50">-1.037</td></tr>
                                <tr><td className="border border-gray-400 p-2 font-bold bg-yellow-50">90</td><td className="border border-gray-400 p-2 font-bold bg-yellow-50">-1.282</td></tr>
                                <tr><td className="border border-gray-400 p-2">91</td><td className="border border-gray-400 p-2">-1.340</td></tr>
                                <tr><td className="border border-gray-400 p-2">95</td><td className="border border-gray-400 p-2">-1.645</td></tr>
                                <tr><td className="border border-gray-400 p-2">99</td><td className="border border-gray-400 p-2">-2.327</td></tr>
                                <tr><td className="border border-gray-400 p-2">99.9</td><td className="border border-gray-400 p-2">-3.090</td></tr>
                            </tbody>
                        </table>
                        <p className="text-xs text-gray-500 italic mt-2">Fonte: AASHTO, 1993.</p>
                    </div>
                )}

                {/* CONTEÚDO CE (COEFICIENTE ESTRUTURAL) */}
                {activeModal === 'ce' && (
                    <div className="space-y-4">
                        <table className="w-full text-xs border-collapse border border-gray-400">
                            <thead className="bg-gray-300 text-gray-800">
                                <tr>
                                    <th className="border border-gray-400 p-2 text-left">MATERIAL</th>
                                    <th className="border border-gray-400 p-2 text-left">PARÂMETRO DE CONTROLE</th>
                                    <th className="border border-gray-400 p-2 text-center">CE</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* CBUQ */}
                                <tr className="bg-gray-100"><td className="border border-gray-400 p-2 font-bold" rowSpan="3">CBUQ, PMQ, a 20°C</td><td className="border border-gray-400 p-2">MR = 3.160 MPa</td><td className="border border-gray-400 p-2 text-center">0,44</td></tr>
                                <tr className="bg-gray-100"><td className="border border-gray-400 p-2">MR = 2.110 MPa</td><td className="border border-gray-400 p-2 text-center">0,37</td></tr>
                                <tr className="bg-gray-100"><td className="border border-gray-400 p-2">MR = 1.406 MPa</td><td className="border border-gray-400 p-2 text-center">0,30</td></tr>
                                
                                {/* BASES */}
                                <tr><td className="border border-gray-400 p-2 font-bold" rowSpan="2">Bases granulares</td><td className="border border-gray-400 p-2">CBR = 100%</td><td className="border border-gray-400 p-2 text-center font-bold bg-yellow-100">0,14</td></tr>
                                <tr><td className="border border-gray-400 p-2">CBR = 33%</td><td className="border border-gray-400 p-2 text-center">0,10</td></tr>
                                
                                {/* SUB-BASES */}
                                <tr className="bg-gray-100"><td className="border border-gray-400 p-2 font-bold" rowSpan="2">Sub-bases granulares</td><td className="border border-gray-400 p-2">CBR = 100%</td><td className="border border-gray-400 p-2 text-center">0,14</td></tr>
                                <tr className="bg-gray-100"><td className="border border-gray-400 p-2">CBR = 23%</td><td className="border border-gray-400 p-2 text-center">0,10</td></tr>
                                
                                {/* CIMENTADOS */}
                                <tr><td className="border border-gray-400 p-2 font-bold" rowSpan="3">Materiais cimentados<br/>(aos sete dias)</td><td className="border border-gray-400 p-2">Rc,7 = 5,6 MPa</td><td className="border border-gray-400 p-2 text-center">0,22</td></tr>
                                <tr><td className="border border-gray-400 p-2">Rc,7 = 3,1 MPa</td><td className="border border-gray-400 p-2 text-center">0,16</td></tr>
                                <tr><td className="border border-gray-400 p-2">Rc,7 = 1,4 MPa</td><td className="border border-gray-400 p-2 text-center">0,13</td></tr>
                            </tbody>
                        </table>
                        <p className="text-xs text-gray-500 italic mt-2">Fonte: AASHTO, 1993.</p>
                    </div>
                )}

                {/* CONTEÚDO CD (COEFICIENTE DE DRENAGEM) */}
                {activeModal === 'cd' && (
                    <div className="space-y-6">
                        
                        {/* TABELA DE DEFINIÇÃO (Qualidade) */}
                        <div>
                            <h4 className="font-bold text-sm mb-2 text-gray-700">Definição da Qualidade de Drenagem</h4>
                            <table className="w-full text-xs border-collapse border border-gray-400">
                                <thead className="bg-gray-200">
                                    <tr><th className="border border-gray-400 p-2 text-left">Quality of Drainage</th><th className="border border-gray-400 p-2 text-left">Water Removed Within</th></tr>
                                </thead>
                                <tbody>
                                    <tr><td className="border border-gray-400 p-2 font-bold">Excellent</td><td className="border border-gray-400 p-2">2 hours</td></tr>
                                    <tr><td className="border border-gray-400 p-2 font-bold">Good</td><td className="border border-gray-400 p-2">1 day</td></tr>
                                    <tr><td className="border border-gray-400 p-2 font-bold">Fair</td><td className="border border-gray-400 p-2">1 week</td></tr>
                                    <tr><td className="border border-gray-400 p-2 font-bold">Poor</td><td className="border border-gray-400 p-2">1 month</td></tr>
                                    <tr><td className="border border-gray-400 p-2 font-bold">Very poor</td><td className="border border-gray-400 p-2">(water will not drain)</td></tr>
                                </tbody>
                            </table>
                        </div>

                        {/* TABELA DE VALORES (MGLIT/AASHTO) */}
                        <div>
                            <h4 className="font-bold text-sm mb-2 text-gray-700">Valores de CD (m)</h4>
                            <table className="w-full text-xs border-collapse border border-gray-400 text-center">
                                <thead className="bg-gray-300">
                                    <tr>
                                        <th className="border border-gray-400 p-2 text-left" rowSpan="2">QUALIDADE DE DRENAGEM</th>
                                        <th className="border border-gray-400 p-2" colSpan="4">PORCENTAGEM DE TEMPO A QUE O PAVIMENTO ESTARÁ SUJEITO A CONDIÇÕES DE UMIDADE PRÓXIMAS DA SATURAÇÃO</th>
                                    </tr>
                                    <tr>
                                        <th className="border border-gray-400 p-2">&lt; 1%</th>
                                        <th className="border border-gray-400 p-2">1% A 5%</th>
                                        <th className="border border-gray-400 p-2">5% A 25%</th>
                                        <th className="border border-gray-400 p-2">&gt; 25%</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr><td className="border border-gray-400 p-2 text-left font-bold">Excelente</td><td className="border border-gray-400 p-2">1,40–1,35</td><td className="border border-gray-400 p-2">1,35–1,30</td><td className="border border-gray-400 p-2">1,30–1,20</td><td className="border border-gray-400 p-2">1,20</td></tr>
                                    <tr><td className="border border-gray-400 p-2 text-left font-bold">Boa</td><td className="border border-gray-400 p-2">1,35–1,25</td><td className="border border-gray-400 p-2">1,25–1,15</td><td className="border border-gray-400 p-2">1,15–1,00</td><td className="border border-gray-400 p-2">1,00</td></tr>
                                    <tr><td className="border border-gray-400 p-2 text-left font-bold">Regular</td><td className="border border-gray-400 p-2">1,25–1,15</td><td className="border border-gray-400 p-2">1,15–1,05</td><td className="border border-gray-400 p-2 font-bold bg-yellow-100">1,00–0,80</td><td className="border border-gray-400 p-2">0,80</td></tr>
                                    <tr><td className="border border-gray-400 p-2 text-left font-bold">Pobre</td><td className="border border-gray-400 p-2">1,15–1,05</td><td className="border border-gray-400 p-2">1,05–0,80</td><td className="border border-gray-400 p-2">0,80–0,60</td><td className="border border-gray-400 p-2">0,60</td></tr>
                                    <tr><td className="border border-gray-400 p-2 text-left font-bold">Muito pobre</td><td className="border border-gray-400 p-2">1,05–0,95</td><td className="border border-gray-400 p-2">0,95–0,75</td><td className="border border-gray-400 p-2">0,75–0,40</td><td className="border border-gray-400 p-2">0,40</td></tr>
                                </tbody>
                            </table>
                            <p className="text-xs text-gray-500 italic mt-2">Fonte: AASHTO, 1993.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
  }
  

  return (
    <div className="min-h-screen bg-gray-50 p-4 font-sans text-gray-800">
        <div className="max-w-6xl mx-auto">
            <header className="flex justify-between items-center mb-6 pb-4 border-b">
                <h1 className="text-2xl font-bold text-blue-900">RMPav Web</h1>
                <button onClick={handleLimparTudo} className="p-2 hover:bg-gray-200 rounded-full"><RotateCcw size={20}/></button>
            </header>
            
            {etapa === 1 ? renderTelaTrafego() : renderTelaDimensionamento()}
            {renderModal()}
        </div>
    </div>
  )
}

export default App





