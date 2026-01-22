/* eslint-disable no-undef */
import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { 
  getDatabase, 
  ref, 
  query as dbQuery, 
  orderByChild, 
  limitToLast, 
  onValue,
} from 'firebase/database';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// --- FUNÇÃO AUXILIAR PARA CORRIGIR A DATA ---
// Transforma "21/01/2026 19:02:48" em objeto Date válido do JS
const parseDataBrasileira = (dataStr) => {
  if (!dataStr) return new Date();
  
  // Se já vier no formato ISO ou algo que o JS entenda, tenta converter direto
  if (dataStr.includes('T') || (dataStr.includes('-') && !dataStr.includes('/'))) {
     const tentativa = new Date(dataStr);
     if (!isNaN(tentativa)) return tentativa;
  }

  try {
    // Formato esperado: "DD/MM/YYYY HH:mm:ss"
    const [dataPart, horaPart] = dataStr.split(' ');
    const [dia, mes, ano] = dataPart.split('/');
    
    // Formato ISO aceito pelo construtor Date: "YYYY-MM-DDTHH:mm:ss"
    // Nota: Se horaPart for undefined, assume 00:00:00
    const timeISO = horaPart ? horaPart : '00:00:00';
    const isoString = `${ano}-${mes}-${dia}T${timeISO}`;
    return new Date(isoString);
  } catch (e) {
    console.error("Erro ao converter data:", dataStr);
    return new Date(); // Retorna agora como fallback
  }
};

const AppStyles = () => (
  <style>{`
    /* Reset básico e estilos do Body */
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; -webkit-font-smoothing: antialiased; }
    
    .app-container { min-height: 100vh; background-color: #f1f5f9; padding: 1.5rem; color: #0f172a; }
    .main-content { max-width: 80rem; margin: 0 auto; }
    
    /* Header */
    .header { margin-bottom: 2.5rem; }
    .header-title { font-size: 1.875rem; font-weight: 700; color: #1e293b; }
    .header-subtitle { font-size: 1.125rem; color: #64748b; }
    .header-info { margin-top: 1rem; display: flex; flex-wrap: wrap; gap: 0.5rem 1.5rem; font-size: 0.875rem; color: #475569; border-top: 1px solid #e2e8f0; padding-top: 1rem; }
    .info-label { font-weight: 600; color: #334155; }
    
    /* Sections & Cards */
    .section-title { font-size: 1.5rem; font-weight: 600; color: #334155; margin-bottom: 1.25rem; }
    .cards-grid { display: grid; grid-template-columns: 1fr; gap: 1.25rem; margin-bottom: 2.5rem; }
    
    .card { background: white; border-radius: 0.75rem; padding: 1.25rem; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
    .card-title { font-size: 0.75rem; font-weight: 500; color: #64748b; text-transform: uppercase; margin-bottom: 0.5rem; }
    .card-value { font-size: 1.875rem; font-weight: 700; }
    
    /* Cores dos Valores */
    .card-value.green { color: #059669; }
    .card-value.red { color: #b91c1c; }
    .card-value.sky { color: #0369a1; }
    .card-value.indigo { color: #4338ca; }
    .card-value.blue { color: #2563eb; }
    .card-value.slate { color: #334155; }
    
    /* Layout */
    .main-layout { display: grid; grid-template-columns: 1fr; gap: 2rem; }
    .chart-container, .history-container { background: white; border-radius: 0.75rem; padding: 1.5rem; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
    .chart-title { font-size: 1.5rem; font-weight: 600; color: #334155; margin-bottom: 1.5rem; }
    
    /* Tabela */
    .history-table-container { overflow-x: auto; }
    .history-table { width: 100%; border-collapse: collapse; }
    .history-table th { padding: 0.75rem 1rem; text-align: left; font-size: 0.75rem; font-weight: 500; color: #64748b; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; background: #f8fafc; }
    .history-table td { padding: 1rem; border-bottom: 1px solid #e2e8f0; color: #334155; font-size: 0.875rem; }
    .status-open { color: #2563eb; font-weight: 500; }
    .status-closed { color: #475569; }

    /* --- NOVOS ESTILOS PARA PAGINAÇÃO --- */
    .pagination-controls {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 1.5rem;
      margin-top: auto;
    }
    .pagination-btn {
      padding: 0.5rem 1rem;
      border: 1px solid #cbd5e1;
      background-color: white;
      color: #334155;
      border-radius: 0.375rem;
      cursor: pointer;
      font-size: 0.875rem;
      transition: all 0.2s;
    }
    .pagination-btn:hover:not(:disabled) {
      background-color: #f1f5f9;
      border-color: #94a3b8;
    }
    .pagination-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      background-color: #f8fafc;
    }
    .pagination-info {
      font-size: 0.875rem;
      color: #64748b;
    }
    
    .loading-message { text-align: center; color: #94a3b8; padding: 20px; }

    /* Media Queries */
    @media (min-width: 640px) { .app-container { padding: 2.5rem; } .cards-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (min-width: 1024px) { .cards-grid { grid-template-columns: repeat(3, 1fr); } .main-layout { grid-template-columns: 2fr 1fr; } }
    @media (min-width: 1280px) { .cards-grid { grid-template-columns: repeat(5, 1fr); } }
  `}</style>
);

export default function App() {
  const fallbackConfig = {
      apiKey: "AIzaSyDX_HY7J29Ol1lodVhTz_TlUU0JxwO2IMc",
      authDomain: "irrigador-automatizado-web.firebaseapp.com",
      databaseURL: "https://irrigador-automatizado-web-default-rtdb.firebaseio.com", 
      projectId: "irrigador-automatizado-web",
      storageBucket: "irrigador-automatizado-web.firebasestorage.app",
      messagingSenderId: "598472307466",
      appId: "1:598472307466:web:a8bf0f831e6f9b0d37c0f3",
      measurementId: "G-MFVCJD84YK"
  };

  const FIXED_USER_ID = 'default-user-id';
  const [loading, setLoading] = useState(true);
  
  // Estado de Dados
  const [ultimaLeitura, setUltimaLeitura] = useState(null);
  const [leituras, setLeituras] = useState([]); 

  // Estado de Paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina] = useState(10); // Quantidade de linhas por página na tabela

  // Firebase
  const [db, setDb] = useState(null); 
  const [auth, setAuth] = useState(null);
  const [currentAppId, setCurrentAppId] = useState(null);
  const [currentAuthUserId, setCurrentAuthUserId] = useState(null);

  // Inicialização do Firebase
  useEffect(() => {
    try {
      let firebaseConfig = {};
      if (typeof __firebase_config !== 'undefined' && __firebase_config) {
          try {
              firebaseConfig = typeof __firebase_config === 'string' ? JSON.parse(__firebase_config) : __firebase_config;
          } catch (e) { firebaseConfig = fallbackConfig; }
      } else { firebaseConfig = fallbackConfig; }

      if (!firebaseConfig.projectId) firebaseConfig = { ...fallbackConfig, ...firebaseConfig };
      
      const initialAppId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
      setCurrentAppId(initialAppId);
      
      const app = initializeApp(firebaseConfig);
      const database = getDatabase(app); 
      const firebaseAuth = getAuth(app);
      
      setDb(database);
      setAuth(firebaseAuth);

      const signIn = async () => {
        try {
          await signInAnonymously(firebaseAuth);
          setCurrentAuthUserId(firebaseAuth.currentUser?.uid || 'N/A');
        } catch (error) { console.error("Erro Auth:", error); setLoading(false); }
      };
      signIn();
    } catch (error) { console.error("Erro Init:", error); setLoading(false); }
  }, []); 

  // Busca e Monitoramento de Dados
  useEffect(() => {
    if (!db || !auth || !currentAppId) return; 

    setLoading(true);
    const leiturasRef = ref(db, `leiturasolo`);
    
    // AUMENTAMOS O LIMITE PARA 100 PARA PERMITIR PAGINAÇÃO CLIENT-SIDE
    const q = dbQuery(
        leiturasRef,
        orderByChild('timestamp'), 
        limitToLast(100) 
    );

    const unsubscribe = onValue(q, (snapshot) => {
      let leiturasArray = [];
      if (snapshot.exists()) {
        const rawData = snapshot.val();
        for (const id in rawData) {
            leiturasArray.push({ id, ...rawData[id] });
        }
        
        // 1. O Firebase retorna do mais antigo para o mais novo.
        // Invertemos para que o índice 0 seja o "AGORA".
        leiturasArray.reverse();
        
        // 2. Processa Última Leitura (índice 0)
        const latestData = leiturasArray[0];
        // Usa a função auxiliar para converter a data string em Objeto Date apenas para exibir formatado se precisar
        let dataObjLatest = parseDataBrasileira(latestData.timestamp);
        
        setUltimaLeitura({
          ...latestData,
          timestampExibicao: latestData.timestamp, // Usa a string original mesmo
          localizacao: latestData.localizacao?.nomeLocal || 'Não Especificado',
          umidadeSolo: latestData.umidadedosolo, 
          temperaturaAmbiente: latestData.temperatura,
          umidadeAr: latestData.umidadeDoAr,
          estaChovendo: latestData.estaChovendo,
          valvula: latestData.statusValvula === 'aberta', 
          fluxoAgua: latestData.fluxoAgua, 
        });
        
        // 3. Processa Lista Completa
        const listaProcessada = leiturasArray.map(leitura => {
            const dataObj = parseDataBrasileira(leitura.timestamp);
            return {
                ...leitura,
                dataObjeto: dataObj, // Guardamos o objeto Date para o Gráfico (Eixo X)
                timestampTabela: leitura.timestamp, // String original BR para a tabela
                timestampGrafico: dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                umidadeSolo: leitura.umidadedosolo,
                umidadeAr: leitura.umidadeDoAr,
                temperaturaAmbiente: leitura.temperatura,
                valvula: leitura.statusValvula === 'aberta',
            };
        });

        setLeituras(listaProcessada);
      } else {
        setUltimaLeitura(null);
        setLeituras([]);
      }
      setLoading(false); 
    });

    return () => unsubscribe();
  }, [db, auth, currentAppId]); 

  // --- LÓGICA DE PAGINAÇÃO ---
  const indexUltimoItem = paginaAtual * itensPorPagina;
  const indexPrimeiroItem = indexUltimoItem - itensPorPagina;
  // Fatiamos o array 'leituras' (que já está ordenado Recente -> Antigo)
  const leiturasAtuais = leituras.slice(indexPrimeiroItem, indexUltimoItem);
  const totalPaginas = Math.ceil(leituras.length / itensPorPagina);

  const irParaAnterior = () => setPaginaAtual(prev => Math.max(prev - 1, 1));
  const irParaProximo = () => setPaginaAtual(prev => Math.min(prev + 1, totalPaginas));


  return (
    <>
      <AppStyles />
      <div className="app-container">
        <div className="main-content">
          
          <header className="header">
            <h1 className="header-title">Dashboard de Irrigação</h1>
            <p className="header-subtitle">Monitoramento em tempo real</p>
            <div className="header-info">
              {ultimaLeitura ? (
                <>
                  <p><span className="info-label">Status:</span> Online</p>
                  <p><span className="info-label">Última:</span> {ultimaLeitura.timestampExibicao}</p>
                </>
              ) : (<p>Aguardando dados...</p>)}
              <p className="user-id-info" style={{marginLeft: 'auto'}}>UserID: {currentAuthUserId}</p>
            </div>
          </header>

          {/* CARDS */}
          <section className="cards-grid">
             {loading && <p className="loading-message">Carregando...</p>}
             {ultimaLeitura && (
                <>
                  <div className="card">
                    <h3 className="card-title">Umidade Solo</h3>
                    <p className="card-value green">{ultimaLeitura.umidadeSolo?.toFixed(1)}%</p>
                  </div>
                  <div className="card">
                    <h3 className="card-title">Temperatura</h3>
                    <p className="card-value red">{ultimaLeitura.temperaturaAmbiente?.toFixed(1)}°C</p>
                  </div>
                  <div className="card">
                    <h3 className="card-title">Umidade Ar</h3>
                    <p className="card-value sky">{ultimaLeitura.umidadeAr?.toFixed(1)}%</p>
                  </div>
                  <div className="card">
                    <h3 className="card-title">Chuva</h3>
                    <p className="card-value indigo">{ultimaLeitura.estaChovendo ? 'Sim' : 'Não'}</p>
                  </div>
                  <div className="card">
                    <h3 className="card-title">Válvula</h3>
                    <p className={`card-value ${ultimaLeitura.valvula ? 'blue' : 'slate'}`}>
                        {ultimaLeitura.valvula ? 'Aberta' : 'Fechada'}
                    </p>
                    <p className="card-subtitle">Fluxo: {ultimaLeitura.fluxoAgua || 0} L</p>
                  </div>
                </>
             )}
          </section>

          <section className="main-layout">
            
            {/* GRÁFICOS */}
            <div className="charts-column">
              <div className="chart-container">
                <h2 className="chart-title">Gráfico (Últimos 20 registros)</h2>
                {leituras.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    {/* Para o gráfico, queremos do Antigo (Esq) -> Novo (Dir).
                       O array 'leituras' está Novo -> Antigo.
                       Então fazemos slice dos primeiros 20 (mais novos) e damos reverse() neles.
                    */}
                    <LineChart data={[...leituras].slice(0, 20).reverse()} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="timestampGrafico" fontSize={12} />
                      <YAxis domain={[0, 100]} fontSize={12} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="umidadeSolo" stroke="#10B981" name="Solo (%)" dot={false} strokeWidth={2}/>
                      <Line type="monotone" dataKey="umidadeAr" stroke="#3B82F6" name="Ar (%)" dot={false} strokeWidth={2}/>
                      <Line type="monotone" dataKey="temperaturaAmbiente" stroke="#EF4444" name="Temp (°C)" dot={false} strokeWidth={2}/>
                    </LineChart>
                  </ResponsiveContainer>
                ) : <p className="loading-message">Sem dados para gráfico.</p>}
              </div>
            </div>

            {/* TABELA COM PAGINAÇÃO */}
            <div className="history-column">
              <div className="history-container">
                <h2 className="section-title">Histórico Recente</h2>
                
                <div className="history-table-container">
                  <table className="history-table">
                    <thead>
                      <tr>
                        <th>Data/Hora</th>
                        <th>Solo</th>
                        <th>Válvula</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Usando 'leiturasAtuais' que já está fatiado pela paginação e ordenado por data descendente */}
                      {leiturasAtuais.map((leitura, index) => (
                        <tr key={leitura.id || index}>
                          <td>{leitura.timestampTabela}</td>
                          <td className="font-medium">{leitura.umidadeSolo?.toFixed(1)}%</td>
                          <td>
                            {leitura.valvula ? 
                                <span className="status-open">Aberta</span> : 
                                <span className="status-closed">Fechada</span>
                            }
                          </td>
                        </tr>
                      ))}
                      {leiturasAtuais.length === 0 && !loading && (
                          <tr><td colSpan="3" style={{textAlign:'center', padding: '20px'}}>Nenhum dado.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* CONTROLES DE PAGINAÇÃO */}
                {leituras.length > 0 && (
                    <div className="pagination-controls">
                        <button 
                            className="pagination-btn" 
                            onClick={irParaAnterior} 
                            disabled={paginaAtual === 1}
                        >
                            &larr; Anterior
                        </button>
                        
                        <span className="pagination-info">
                            Pág {paginaAtual} de {totalPaginas}
                        </span>
                        
                        <button 
                            className="pagination-btn" 
                            onClick={irParaProximo} 
                            disabled={paginaAtual === totalPaginas || totalPaginas === 0}
                        >
                            Próximo &rarr;
                        </button>
                    </div>
                )}

              </div>
            </div>

          </section>
        </div>
      </div>
    </>
  );
}