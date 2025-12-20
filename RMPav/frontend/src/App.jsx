import { useState } from 'react'

const OPCOES_VEICULOS = [
  "2C", "2CB", "3C", "3T6", "4CD", "2S1", "2S2", "2S3", "3S2", "3S3"
]

function App() {
  const API_URL = import.meta.env.VITE_API_URL;

  // --- NAVEGAÇÃO ENTRE TELAS ---
  const [etapa, setEtapa] = useState(1) // 1 = Tráfego, 2 = Dimensionamento

  // --- DADOS TRÁFEGO ---
  const [anos, setAnos] = useState(10)
  const [taxa, setTaxa] = useState(0) // Padrão da planilha é 0%
  const [fatorFaixa, setFatorFaixa] = useState(1.0)
  const [listaVeiculos, setListaVeiculos] = useState([]) 
  const [classeAtual, setClasseAtual] = useState("4CD")
  const [vdmAtual, setVdmAtual] = useState("")
  
  const [resultadoTrafego, setResultadoTrafego] = useState(null)

  // --- DADOS DIMENSIONAMENTO ---
  const [cbr, setCbr] = useState(10)
  const [clima, setClima] = useState("seco")
  const [resultadoDim, setResultadoDim] = useState(null)

  // --- FUNÇÕES ---

  const handleLimparTudo = () => {
    if (window.confirm("Reiniciar projeto?")) {
      setEtapa(1)
      setListaVeiculos([])
      setResultadoTrafego(null)
      setResultadoDim(null)
    }
  }

  const adicionarVeiculo = () => {
    if (!vdmAtual || vdmAtual <= 0) return alert("Digite um VDM válido.")
    setListaVeiculos([...listaVeiculos, { classe: classeAtual, vdm: parseFloat(vdmAtual) }])
    setVdmAtual("")
  }

  const removerVeiculo = (idx) => {
    setListaVeiculos(listaVeiculos.filter((_, i) => i !== idx))
  }

  const handleCalcularTrafego = async () => {
    if (listaVeiculos.length === 0) return alert("Adicione veículos.")
    const dados = { anos: parseInt(anos), taxa_crescimento: parseFloat(taxa), fator_faixa: parseFloat(fatorFaixa), veiculos: listaVeiculos }
    
    try {
      const res = await fetch(`${API_URL}/api/calcular-trafego/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados)
      })
      const json = await res.json()
      setResultadoTrafego(json)
    } catch (e) { alert("Erro ao conectar no servidor."); console.error(e) }
  }

  const irParaDimensionamento = () => {
    if (!resultadoTrafego) return alert("Calcule o tráfego primeiro!")
    setEtapa(2)
  }

  const handleCalcularDimensionamento = async () => {
    const vdmTotal = listaVeiculos.reduce((acc, item) => acc + item.vdm, 0)
    const dados = { 
        cbr_subleito: parseFloat(cbr), 
        vdm_medio: vdmTotal, 
        anos_projeto: parseInt(anos), 
        clima: clima 
    }
    
    try {
        const res = await fetch(`${API_URL}/api/calcular-dimensionamento/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dados)
        })
        const json = await res.json()
        setResultadoDim(json)
      } catch (e) { alert("Erro ao conectar no servidor."); console.error(e) }
  }

  // --- TELA 1: TRÁFEGO ---
  const renderTelaTrafego = () => (
    <div className="animate-fade-in">
        <div className="bg-white shadow-lg rounded-2xl p-8 mb-8 border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <span className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm mr-3">1</span>
                Dados de Entrada
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">Anos de Projeto</label>
                    <input type="number" className="w-full p-3 border rounded-lg" value={anos} onChange={e => setAnos(e.target.value)} />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">Taxa de Crescimento (%)</label>
                    <input type="number" className="w-full p-3 border rounded-lg" value={taxa} onChange={e => setTaxa(e.target.value)} />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">Fator de Faixa</label>
                    <input type="number" step="0.1" className="w-full p-3 border rounded-lg" value={fatorFaixa} onChange={e => setFatorFaixa(e.target.value)} />
                </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 mb-6">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                        <label className="block text-xs font-bold text-gray-500 uppercase">Classe</label>
                        <select className="w-full p-3 bg-white border rounded-lg" value={classeAtual} onChange={e => setClasseAtual(e.target.value)}>
                            {OPCOES_VEICULOS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div className="flex-1 w-full">
                        <label className="block text-xs font-bold text-gray-500 uppercase">VDM (veíc/dia)</label>
                        <input type="number" className="w-full p-3 border rounded-lg" placeholder="0" value={vdmAtual} onChange={e => setVdmAtual(e.target.value)} />
                    </div>
                    <button onClick={adicionarVeiculo} className="w-full md:w-auto bg-green-600 text-white font-bold py-3 px-6 rounded-lg">+ Add</button>
                </div>
                
                {listaVeiculos.length > 0 && (
                    <div className="mt-4">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="bg-gray-100 text-left">
                                    <th className="p-2">Classe</th>
                                    <th className="p-2">VDM</th>
                                    <th className="p-2"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {listaVeiculos.map((v, i) => (
                                    <tr key={i} className="border-b">
                                        <td className="p-2">{v.classe}</td>
                                        <td className="p-2">{v.vdm}</td>
                                        <td className="p-2 text-right"><button onClick={() => removerVeiculo(i)} className="text-red-500 font-bold">X</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <button onClick={handleCalcularTrafego} className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold py-4 rounded-xl shadow-lg transition">
                CALCULAR TRÁFEGO
            </button>
        </div>

        {/* RESULTADOS DA PLANILHA */}
        {resultadoTrafego && (
            <div className="bg-white shadow-xl rounded-2xl p-8 border border-blue-100 mb-8">
                <h3 className="text-xl font-bold text-blue-900 mb-4">📈 Resultados Comparativos (N)</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className={`p-6 rounded-xl border-2 text-center ${resultadoTrafego.metodo_escolhido === 'AASHTO' ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                        <div className="text-sm font-bold text-gray-500 uppercase">AASHTO</div>
                        <div className="text-3xl font-extrabold text-gray-800">{resultadoTrafego.n_total_aashto.toLocaleString('pt-BR')}</div>
                    </div>
                    <div className={`p-6 rounded-xl border-2 text-center ${resultadoTrafego.metodo_escolhido === 'USACE' ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                        <div className="text-sm font-bold text-gray-500 uppercase">USACE</div>
                        <div className="text-3xl font-extrabold text-gray-800">{resultadoTrafego.n_total_usace.toLocaleString('pt-BR')}</div>
                    </div>
                </div>

                <h4 className="font-bold text-gray-700 mb-2">Progressão Anual Acumulada</h4>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="min-w-full text-sm text-center">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="p-3">Ano</th>
                                <th className="p-3 text-blue-800">N AASHTO (Acum.)</th>
                                <th className="p-3 text-purple-800">N USACE (Acum.)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {resultadoTrafego.progressao.map((p) => (
                                <tr key={p.ano} className="hover:bg-gray-50">
                                    <td className="p-2 font-bold">{p.ano}</td>
                                    <td className="p-2">{p.n_aashto_acumulado.toLocaleString('pt-BR')}</td>
                                    <td className="p-2">{p.n_usace_acumulado.toLocaleString('pt-BR')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mt-8 text-right">
                    <p className="text-sm text-gray-500 mb-2">O sistema usará o maior N final ({resultadoTrafego.n_final_projeto.toLocaleString('pt-BR')}) para o projeto.</p>
                    <button onClick={irParaDimensionamento} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition transform hover:scale-105 flex items-center justify-center ml-auto">
                        Ir para Dimensionamento ➔
                    </button>
                </div>
            </div>
        )}
    </div>
  )

  // --- TELA 2: DIMENSIONAMENTO ---
  const renderTelaDimensionamento = () => (
    <div className="animate-fade-in">
        <button onClick={() => setEtapa(1)} className="mb-6 text-blue-600 font-bold hover:underline">⬅ Voltar para Tráfego</button>
        
        <div className="bg-white shadow-xl rounded-2xl p-8 border border-orange-100">
            <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center">
                <span className="bg-orange-100 text-orange-600 rounded-full w-8 h-8 flex items-center justify-center text-sm mr-3">2</span>
                Dimensionamento (Revest. Primário)
            </h2>
            <p className="text-gray-500 mb-6 ml-11 text-sm">Usando N de Projeto: <strong>{resultadoTrafego?.n_final_projeto.toLocaleString('pt-BR')}</strong></p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">CBR Subleito (%)</label>
                    <input type="number" className="w-full p-3 border border-gray-300 rounded-lg" value={cbr} onChange={e => setCbr(e.target.value)} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Clima da Região</label>
                    <select className="w-full p-3 border border-gray-300 rounded-lg" value={clima} onChange={e => setClima(e.target.value)}>
                        <option value="seco">Seco (Precip. &lt; 1000mm)</option>
                        <option value="umido">Úmido (Precip. &gt; 1000mm)</option>
                    </select>
                </div>
            </div>

            <button onClick={handleCalcularDimensionamento} className="w-full bg-orange-500 hover:bg-orange-600 text-white text-lg font-bold py-4 rounded-xl shadow-lg transition">
                CALCULAR ESPESSURA FINAL
            </button>

            {resultadoDim && (
                <div className="mt-8 p-8 bg-orange-50 border border-orange-200 rounded-2xl text-center">
                    <h3 className="text-orange-800 font-bold text-lg mb-4 uppercase tracking-widest">Resultado do Projeto</h3>
                    
                    <div className="grid grid-cols-2 gap-8 mb-6">
                        <div>
                            <small className="block text-orange-600 font-bold mb-1">Espessura Estrutural</small>
                            <div className="text-2xl font-bold text-gray-800">{resultadoDim.espessura_calculada} cm</div>
                        </div>
                        <div>
                            <small className="block text-orange-600 font-bold mb-1">Gravel Loss</small>
                            <div className="text-2xl font-bold text-gray-800">+ {resultadoDim.perda_material} cm</div>
                        </div>
                    </div>
                    
                    <div className="border-t-2 border-orange-200 pt-6">
                        <small className="block text-gray-500 uppercase font-bold tracking-wide mb-2">Espessura Final</small>
                        <div className="text-6xl font-extrabold text-orange-600">
                            {resultadoDim.espessura_final} <span className="text-2xl">cm</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    </div>
  )

  return (
    <div className="min-h-screen p-4 md:p-8 font-sans text-gray-800 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-10 pb-6 border-b border-gray-200">
          <div>
            <h1 className="text-4xl font-extrabold text-blue-900 tracking-tight">RMPav<span className="text-blue-500">Web</span></h1>
            <p className="text-gray-500 mt-1">Planilha MGLIT Integrada</p>
          </div>
          <button onClick={handleLimparTudo} className="bg-white hover:bg-red-50 text-gray-600 hover:text-red-600 font-semibold py-2 px-4 rounded-lg border border-gray-200 shadow-sm transition">
            🔄 Reiniciar
          </button>
        </header>

        {/* CONTROLE DE TELAS */}
        {etapa === 1 ? renderTelaTrafego() : renderTelaDimensionamento()}
      </div>
    </div>
  )
}

export default App


