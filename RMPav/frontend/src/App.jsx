import { useState } from 'react'

const OPCOES_VEICULOS = [
  "2C", "2CB", "3C", "2S1", "4C", "4CD", "2S2", "2I2", "3S1", "2C2", "2S3", 
  "3S2", "2I3", "2J3", "3I2", "2C3", "3C2", "3S3", "3I3", "3J3", "3T4", 
  "3C3", "3D3", "3D4", "3Q4", "3T6", "3Q6", "3D6"
]

function App() {
  // Pega o endereço do arquivo .env
  const API_URL = import.meta.env.VITE_API_URL;

  // --- ESTADOS (VARIÁVEIS) ---
  const [anos, setAnos] = useState(10)
  const [taxa, setTaxa] = useState(5)
  const [fatorFaixa, setFatorFaixa] = useState(1.0)
  
  const [listaVeiculos, setListaVeiculos] = useState([]) 
  const [classeAtual, setClasseAtual] = useState("2C")
  const [vdmAtual, setVdmAtual] = useState("")
  
  const [cbr, setCbr] = useState(10)
  const [clima, setClima] = useState("seco")

  const [resultadoTrafego, setResultadoTrafego] = useState(null)
  const [resultadoDim, setResultadoDim] = useState(null)

  // --- FUNÇÕES DE LÓGICA ---

  const handleLimparTudo = () => {
    if (window.confirm("Tem certeza que deseja limpar tudo e iniciar um novo projeto?")) {
      setAnos(10); setTaxa(5); setFatorFaixa(1.0);
      setListaVeiculos([]); setClasseAtual("2C"); setVdmAtual("");
      setResultadoTrafego(null);
      setCbr(10); setClima("seco");
      setResultadoDim(null);
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
    } catch (e) { alert("Erro ao conectar no Django."); console.error(e) }
  }

  const handleCalcularDimensionamento = async () => {
    const vdmTotal = listaVeiculos.reduce((acc, item) => acc + item.vdm, 0)
    const dados = { cbr_subleito: parseFloat(cbr), vdm_medio: vdmTotal, anos_projeto: parseInt(anos), clima: clima }
    try {
        const res = await fetch(`${API_URL}/api/calcular-dimensionamento/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dados)
        })
        const json = await res.json()
        setResultadoDim(json)
      } catch (e) { alert("Erro ao conectar no Django."); console.error(e) }
  }

  // --- FUNÇÃO DO PDF (NOVA) ---
  const handleGerarPDF = async () => {
    const vdmTotal = listaVeiculos.reduce((acc, item) => acc + item.vdm, 0)
    
    // Prepara o pacote de dados completo
    const dadosCompletos = {
        anos, 
        taxa, 
        fator_faixa: fatorFaixa,
        resultado_trafego: resultadoTrafego,
        cbr, 
        clima,
        vdm_medio: vdmTotal,
        resultado_dim: resultadoDim
    }

    try {
        const res = await fetch(`${API_URL}/api/gerar-pdf/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dadosCompletos)
        })
        
        if (!res.ok) {
            alert("Erro no servidor ao gerar PDF. Verifique o terminal do Django.")
            return
        }

        // Baixa o arquivo
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `Memorial_RMPav_${new Date().toISOString().slice(0,10)}.pdf`
        document.body.appendChild(a)
        a.click()
        a.remove()
        
    } catch (e) { 
        alert("Erro ao conectar no Django."); 
        console.error(e) 
    }
  }

  // --- O VISUAL (HTML) ---
  return (
    <div className="min-h-screen p-8 font-sans text-gray-800 bg-gray-50">
      
      <div className="max-w-4xl mx-auto">
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-center mb-10 border-b border-gray-200 pb-6">
          <div className="text-center md:text-left">
            <h1 className="text-4xl font-extrabold text-blue-900 tracking-tight">RMPav<span className="text-blue-500">Web</span></h1>
            <p className="text-gray-500 mt-1 text-lg">Sistema de Engenharia Rodoviária</p>
          </div>
          
          <button 
            onClick={handleLimparTudo}
            className="mt-4 md:mt-0 flex items-center bg-white hover:bg-red-50 text-gray-600 hover:text-red-600 font-semibold py-2 px-6 rounded-lg transition border border-gray-200 hover:border-red-200 shadow-sm"
          >
            <span className="mr-2 text-xl">🔄</span> Novo Projeto
          </button>
        </header>

        {/* --- CARD 1: DADOS GERAIS --- */}
        <div className="bg-white shadow-lg rounded-2xl p-8 mb-8 border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
            <span className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm mr-3">1</span>
            Parâmetros de Projeto
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Anos de Projeto (T)</label>
                <input type="number" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition" value={anos} onChange={e => setAnos(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Taxa de Crescimento (%)</label>
                <input type="number" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition" value={taxa} onChange={e => setTaxa(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Fator de Faixa</label>
                <input type="number" step="0.1" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition" value={fatorFaixa} onChange={e => setFatorFaixa(e.target.value)} />
              </div>
          </div>
        </div>

        {/* --- CARD 2: TRÁFEGO --- */}
        <div className="bg-white shadow-lg rounded-2xl p-8 mb-8 border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
            <span className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm mr-3">2</span>
            Composição de Tráfego
          </h2>

          <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 mb-6">
              <div className="flex flex-col md:flex-row gap-4 items-end">
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Classe</label>
                    <select className="w-full p-3 bg-white border border-gray-300 rounded-lg" value={classeAtual} onChange={e => setClasseAtual(e.target.value)}>
                        {OPCOES_VEICULOS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">VDM (veíc/dia)</label>
                    <input type="number" className="w-full p-3 border border-gray-300 rounded-lg" placeholder="0" value={vdmAtual} onChange={e => setVdmAtual(e.target.value)} />
                  </div>
                  <button onClick={adicionarVeiculo} className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition shadow-md">
                    + Adicionar
                  </button>
              </div>
          </div>
          
          {listaVeiculos.length > 0 ? (
              <div className="overflow-hidden rounded-lg border border-gray-200 mb-6">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Classe</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">VDM</th>
                            <th className="px-6 py-3 text-right"></th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {listaVeiculos.map((v, i) => (
                            <tr key={i}>
                                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{v.classe}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-500">{v.vdm}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button onClick={() => removerVeiculo(i)} className="text-red-600 hover:text-red-900 font-bold">Remover</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
              </div>
          ) : (
             <p className="text-center text-gray-400 italic mb-6">Nenhum veículo adicionado.</p>
          )}

          <button onClick={handleCalcularTrafego} className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition transform hover:-translate-y-0.5">
              CALCULAR NÚMERO N
          </button>

          {resultadoTrafego && (
            <div className="mt-8 p-6 bg-blue-50 border border-blue-100 rounded-xl text-center">
                <p className="text-sm text-blue-600 font-bold uppercase tracking-wide">Tráfego Acumulado (N)</p>
                <div className="text-4xl font-extrabold text-blue-900 mt-2">
                    {resultadoTrafego.n_total.toLocaleString('pt-BR')}
                </div>
            </div>
          )}
        </div>

        {/* --- CARD 3: DIMENSIONAMENTO --- */}
        {resultadoTrafego && (
            <div className="bg-white shadow-lg rounded-2xl p-8 border border-gray-100">
                <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center">
                    <span className="bg-orange-100 text-orange-600 rounded-full w-8 h-8 flex items-center justify-center text-sm mr-3">3</span>
                    Dimensionamento (Revest. Primário)
                </h2>
                <p className="text-gray-500 mb-6 ml-11 text-sm">Método USACE simplificado.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">CBR Subleito (%)</label>
                        <input type="number" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none transition" value={cbr} onChange={e => setCbr(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Clima da Região</label>
                        <select className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none transition" value={clima} onChange={e => setClima(e.target.value)}>
                            <option value="seco">Seco (Precip. &lt; 1000mm)</option>
                            <option value="umido">Úmido (Precip. &gt; 1000mm)</option>
                        </select>
                    </div>
                </div>

                <button onClick={handleCalcularDimensionamento} className="w-full bg-orange-500 hover:bg-orange-600 text-white text-lg font-bold py-4 rounded-xl shadow-lg transition">
                    CALCULAR ESPESSURA FINAL
                </button>

                {/* RESULTADO FINAL + BOTÃO PDF */}
                {resultadoDim && (
                    <div className="mt-8 p-8 bg-orange-50 border border-orange-200 rounded-2xl animate-fade-in-up">
                        <h3 className="text-orange-800 font-bold text-lg mb-4 text-center uppercase tracking-widest">Resultado do Projeto</h3>
                        
                        <div className="grid grid-cols-2 gap-8 text-center mb-6">
                            <div>
                                <small className="block text-orange-600 font-bold mb-1">Espessura Estrutural</small>
                                <div className="text-2xl font-bold text-gray-800">{resultadoDim.espessura_calculada} cm</div>
                            </div>
                            <div>
                                <small className="block text-orange-600 font-bold mb-1">Perda de Material (GL)</small>
                                <div className="text-2xl font-bold text-gray-800">+ {resultadoDim.perda_material} cm</div>
                            </div>
                        </div>
                        
                        <div className="border-t-2 border-orange-200 pt-6 text-center mb-8">
                            <small className="block text-gray-500 uppercase font-bold tracking-wide mb-2">Espessura Final de Projeto</small>
                            <div className="text-6xl font-extrabold text-orange-600">
                                {resultadoDim.espessura_final} <span className="text-2xl">cm</span>
                            </div>
                            <p className="text-orange-800 mt-2 font-medium">Material granular (Cascalho)</p>
                        </div>

                        {/* BOTÃO DE PDF AQUI DENTRO, PROTEGIDO PELO IF */}
                        <div className="text-center">
                            <button 
                                onClick={handleGerarPDF} 
                                className="bg-gray-800 hover:bg-gray-900 text-white font-bold py-4 px-8 rounded-full shadow-2xl flex items-center justify-center mx-auto transition transform hover:scale-105"
                            >
                                <span className="mr-2 text-2xl">📄</span> BAIXAR MEMORIAL (PDF)
                            </button>
                        </div>

                    </div>
                )}
            </div>
        )}

      </div>
    </div>
  )
}

export default App


