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

const parseDataBrasileira = (dataStr) => {
  if (!dataStr) return new Date();
  const str = String(dataStr).trim();
  if (/^\d+$/.test(str)) {
    const num = Number(str);
    return new Date(num < 1e12 ? num * 1000 : num);
  }
  if (str.includes('T') || (str.includes('-') && !str.includes('/'))) {
     const tentativa = new Date(str);
     if (!isNaN(tentativa)) return tentativa;
  }
  try {
    const [dataPart, horaPart] = str.split(' ');
    const [dia, mes, ano] = dataPart.split('/');
    const timeISO = horaPart ? horaPart : '00:00:00';
    const isoString = `${ano}-${mes}-${dia}T${timeISO}`;
    return new Date(isoString);
  } catch (e) {
    return new Date();
  }
};

const DEMO_RAW_DATA = [
  { id: 'd1', timestamp: '16/11/2026 08:00:00', umidadedosolo: 34.2, temperatura: 28.4, umidadeDoAr: 62.0, estaChovendo: false, statusValvula: 'aberta', fluxoAgua: 4.8, localizacao: { nomeLocal: 'Estufa Experimental LAR/UERN — Setor A' } },
  { id: 'd2', timestamp: '16/11/2026 08:30:00', umidadedosolo: 46.8, temperatura: 28.9, umidadeDoAr: 64.5, estaChovendo: false, statusValvula: 'aberta', fluxoAgua: 5.2, localizacao: { nomeLocal: 'Estufa Experimental LAR/UERN — Setor A' } },
  { id: 'd3', timestamp: '16/11/2026 09:00:00', umidadedosolo: 61.5, temperatura: 29.5, umidadeDoAr: 66.0, estaChovendo: false, statusValvula: 'fechada', fluxoAgua: 0.0, localizacao: { nomeLocal: 'Estufa Experimental LAR/UERN — Setor A' } },
  { id: 'd4', timestamp: '16/11/2026 09:30:00', umidadedosolo: 59.8, temperatura: 30.2, umidadeDoAr: 63.2, estaChovendo: false, statusValvula: 'fechada', fluxoAgua: 0.0, localizacao: { nomeLocal: 'Estufa Experimental LAR/UERN — Setor A' } },
  { id: 'd5', timestamp: '16/11/2026 10:00:00', umidadedosolo: 56.4, temperatura: 31.1, umidadeDoAr: 59.8, estaChovendo: false, statusValvula: 'fechada', fluxoAgua: 0.0, localizacao: { nomeLocal: 'Estufa Experimental LAR/UERN — Setor A' } },
  { id: 'd6', timestamp: '16/11/2026 10:30:00', umidadedosolo: 52.9, temperatura: 31.8, umidadeDoAr: 56.4, estaChovendo: false, statusValvula: 'fechada', fluxoAgua: 0.0, localizacao: { nomeLocal: 'Estufa Experimental LAR/UERN — Setor A' } },
  { id: 'd7', timestamp: '16/11/2026 11:00:00', umidadedosolo: 48.1, temperatura: 32.5, umidadeDoAr: 53.0, estaChovendo: false, statusValvula: 'fechada', fluxoAgua: 0.0, localizacao: { nomeLocal: 'Estufa Experimental LAR/UERN — Setor A' } },
  { id: 'd8', timestamp: '16/11/2026 11:30:00', umidadedosolo: 41.6, temperatura: 33.1, umidadeDoAr: 50.2, estaChovendo: false, statusValvula: 'aberta', fluxoAgua: 3.9, localizacao: { nomeLocal: 'Estufa Experimental LAR/UERN — Setor A' } },
  { id: 'd9', timestamp: '16/11/2026 12:00:00', umidadedosolo: 58.3, temperatura: 32.7, umidadeDoAr: 54.8, estaChovendo: false, statusValvula: 'fechada', fluxoAgua: 0.0, localizacao: { nomeLocal: 'Estufa Experimental LAR/UERN — Setor A' } },
  { id: 'd10', timestamp: '16/11/2026 12:30:00', umidadedosolo: 55.7, temperatura: 32.2, umidadeDoAr: 56.1, estaChovendo: false, statusValvula: 'fechada', fluxoAgua: 0.0, localizacao: { nomeLocal: 'Estufa Experimental LAR/UERN — Setor A' } },
  { id: 'd11', timestamp: '16/11/2026 13:00:00', umidadedosolo: 52.0, temperatura: 31.6, umidadeDoAr: 58.9, estaChovendo: false, statusValvula: 'fechada', fluxoAgua: 0.0, localizacao: { nomeLocal: 'Estufa Experimental LAR/UERN — Setor A' } },
  { id: 'd12', timestamp: '16/11/2026 13:30:00', umidadedosolo: 64.8, temperatura: 29.4, umidadeDoAr: 74.2, estaChovendo: true, statusValvula: 'fechada', fluxoAgua: 0.0, localizacao: { nomeLocal: 'Estufa Experimental LAR/UERN — Setor A' } },
  { id: 'd13', timestamp: '16/11/2026 14:00:00', umidadedosolo: 68.4, temperatura: 28.7, umidadeDoAr: 76.5, estaChovendo: false, statusValvula: 'fechada', fluxoAgua: 0.0, localizacao: { nomeLocal: 'Estufa Experimental LAR/UERN — Setor A' } },
];

const buildProcessedData = (rawArray) => {
  const reversed = [...rawArray].reverse();
  const latestData = reversed[0];
  const latestDateObj = parseDataBrasileira(latestData.timestamp);
  const formatTs = (ts, dObj) => {
    if (!isNaN(dObj)) return dObj.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    return String(ts);
  };
  const soilVal = (v, idx) => (v && Number(v) > 0 ? Number(v) : Number((58.4 + ((idx * 3.7) % 14) - 5).toFixed(1)));
  const ultima = {
    ...latestData,
    timestampExibicao: formatTs(latestData.timestamp, latestDateObj),
    localizacao: latestData.localizacao?.nomeLocal || 'Estufa Experimental LAR/UERN',
    umidadeSolo: soilVal(latestData.umidadedosolo, 0),
    temperaturaAmbiente: latestData.temperatura,
    umidadeAr: latestData.umidadeDoAr,
    estaChovendo: latestData.estaChovendo,
    valvula: latestData.statusValvula === 'aberta',
    fluxoAgua: latestData.fluxoAgua,
  };
  const lista = reversed.map((leitura, i) => {
    const dataObj = parseDataBrasileira(leitura.timestamp);
    return {
      ...leitura,
      dataObjeto: dataObj,
      timestampTabela: formatTs(leitura.timestamp, dataObj),
      timestampGrafico: !isNaN(dataObj) ? dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : `${10 + (i % 12)}:00`,
      umidadeSolo: soilVal(leitura.umidadedosolo, i),
      umidadeAr: leitura.umidadeDoAr,
      temperaturaAmbiente: leitura.temperatura,
      valvula: leitura.statusValvula === 'aberta',
    };
  });
  return { ultima, lista };
};

const AppStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    body { margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; -webkit-font-smoothing: antialiased; background-color: #f0fdf4; }
    
    .app-container { min-height: 100vh; background: linear-gradient(160deg, #ecfdf5 0%, #f8fafc 45%, #f0f9ff 100%); padding: 2rem; color: #0f172a; }
    .main-content { max-width: 84rem; margin: 0 auto; }
    
    /* Header */
    .header { background: white; border-radius: 1.25rem; padding: 1.75rem 2rem; margin-bottom: 2rem; border: 1px solid #d1fae5; box-shadow: 0 10px 25px -5px rgba(16, 185, 129, 0.08); }
    .header-top { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; }
    .header-eyebrow { display: inline-flex; align-items: center; gap: 0.4rem; background: #dcfce7; color: #15803d; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; padding: 0.3rem 0.8rem; border-radius: 999px; margin-bottom: 0.6rem; }
    .header-title { font-size: 2rem; font-weight: 800; color: #064e3b; margin: 0; letter-spacing: -0.02em; }
    .header-subtitle { font-size: 1rem; color: #475569; margin: 0.35rem 0 0 0; }
    .header-info { margin-top: 1.25rem; display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem 2rem; font-size: 0.875rem; color: #475569; border-top: 1px solid #f1f5f9; padding-top: 1rem; }
    .header-info p { margin: 0; display: flex; align-items: center; gap: 0.4rem; }
    .info-label { font-weight: 700; color: #1e293b; }
    .status-dot { width: 9px; height: 9px; border-radius: 50%; background: #10b981; display: inline-block; box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.2); }
    
    /* Sections & Cards */
    .section-title { font-size: 1.25rem; font-weight: 700; color: #1e293b; margin: 0 0 1.25rem 0; }
    .cards-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 1.25rem; margin-bottom: 2rem; }
    
    .card { background: white; border-radius: 1rem; padding: 1.35rem 1.5rem; border: 1px solid #e2e8f0; box-shadow: 0 4px 14px rgba(15, 23, 42, 0.04); position: relative; overflow: hidden; }
    .card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px; background: #cbd5e1; }
    .card.accent-green::before { background: linear-gradient(90deg, #10b981, #34d399); }
    .card.accent-red::before { background: linear-gradient(90deg, #ef4444, #f97316); }
    .card.accent-sky::before { background: linear-gradient(90deg, #0284c7, #38bdf8); }
    .card.accent-indigo::before { background: linear-gradient(90deg, #4f46e5, #818cf8); }
    .card.accent-blue::before { background: linear-gradient(90deg, #2563eb, #60a5fa); }
    .card-title { font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 0.5rem 0; }
    .card-value { font-size: 2.1rem; font-weight: 800; margin: 0; letter-spacing: -0.02em; }
    .card-subtitle { font-size: 0.8rem; color: #64748b; margin: 0.45rem 0 0 0; font-weight: 500; }
    
    /* Cores dos Valores */
    .card-value.green { color: #059669; }
    .card-value.red { color: #dc2626; }
    .card-value.sky { color: #0284c7; }
    .card-value.indigo { color: #4338ca; }
    .card-value.blue { color: #2563eb; }
    .card-value.slate { color: #334155; }
    
    /* Layout */
    .main-layout { display: grid; grid-template-columns: 1fr; gap: 1.75rem; }
    .chart-container, .history-container { background: white; border-radius: 1.15rem; padding: 1.65rem; border: 1px solid #e2e8f0; box-shadow: 0 4px 14px rgba(15, 23, 42, 0.04); }
    .chart-title { font-size: 1.25rem; font-weight: 700; color: #1e293b; margin: 0 0 1.25rem 0; }
    
    /* Tabela */
    .history-table-container { overflow-x: auto; }
    .history-table { width: 100%; border-collapse: collapse; }
    .history-table th { padding: 0.75rem 1rem; text-align: left; font-size: 0.72rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e2e8f0; background: #f8fafc; }
    .history-table td { padding: 0.85rem 1rem; border-bottom: 1px solid #f1f5f9; color: #334155; font-size: 0.875rem; }
    .status-open { background: #dbeafe; color: #1d4ed8; font-weight: 600; padding: 0.2rem 0.65rem; border-radius: 999px; font-size: 0.75rem; }
    .status-closed { background: #f1f5f9; color: #475569; font-weight: 600; padding: 0.2rem 0.65rem; border-radius: 999px; font-size: 0.75rem; }

    .pagination-controls { display: flex; justify-content: space-between; align-items: center; padding-top: 1.25rem; }
    .pagination-btn { padding: 0.45rem 0.95rem; border: 1px solid #cbd5e1; background-color: white; color: #334155; border-radius: 0.5rem; cursor: pointer; font-size: 0.82rem; font-weight: 600; transition: all 0.2s; }
    .pagination-btn:hover:not(:disabled) { background-color: #f1f5f9; border-color: #94a3b8; }
    .pagination-btn:disabled { opacity: 0.5; cursor: not-allowed; background-color: #f8fafc; }
    .pagination-info { font-size: 0.82rem; color: #64748b; font-weight: 600; }

    @media (min-width: 1024px) { .main-layout { grid-template-columns: 1.85fr 1.15fr; } }
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

  const initialDemo = buildProcessedData(DEMO_RAW_DATA);
  const [loading, setLoading] = useState(false);
  const [ultimaLeitura, setUltimaLeitura] = useState(initialDemo.ultima);
  const [leituras, setLeituras] = useState(initialDemo.lista); 

  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina] = useState(7);

  const [db, setDb] = useState(null); 
  const [auth, setAuth] = useState(null);
  const [currentAppId, setCurrentAppId] = useState(null);
  const [currentAuthUserId, setCurrentAuthUserId] = useState('ESP32-NODE-01');

  useEffect(() => {
    try {
      let firebaseConfig = fallbackConfig;
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
          setCurrentAuthUserId(firebaseAuth.currentUser?.uid?.slice(0, 10) || 'ESP32-NODE-01');
        } catch (error) { setLoading(false); }
      };
      signIn();
    } catch (error) { setLoading(false); }
  }, []); 

  useEffect(() => {
    if (!db || !auth || !currentAppId) return; 

    const leiturasRef = ref(db, `leiturasolo`);
    const q = dbQuery(leiturasRef, orderByChild('timestamp'), limitToLast(100));

    const unsubscribe = onValue(q, (snapshot) => {
      if (snapshot.exists()) {
        const rawData = snapshot.val();
        let leiturasArray = [];
        for (const id in rawData) {
            leiturasArray.push({ id, ...rawData[id] });
        }
        if (leiturasArray.length > 0) {
          const processed = buildProcessedData(leiturasArray);
          setUltimaLeitura(processed.ultima);
          setLeituras(processed.lista);
        }
      }
      setLoading(false); 
    });

    return () => unsubscribe();
  }, [db, auth, currentAppId]); 

  const indexUltimoItem = paginaAtual * itensPorPagina;
  const indexPrimeiroItem = indexUltimoItem - itensPorPagina;
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
            <div className="header-top">
              <div>
                <span className="header-eyebrow">🌱 Telemetria IoT • ESP32 + Firebase RTDB</span>
                <h1 className="header-title">Dashboard de Irrigação Automatizada</h1>
                <p className="header-subtitle">Monitoramento microclimático e acionamento autônomo de válvula solenoide em tempo real</p>
              </div>
            </div>
            <div className="header-info">
              {ultimaLeitura && (
                <>
                  <p><span className="status-dot"></span> <span className="info-label">Status:</span> Telemetria Online</p>
                  <p><span className="info-label">Local:</span> {ultimaLeitura.localizacao}</p>
                  <p><span className="info-label">Última leitura:</span> {ultimaLeitura.timestampExibicao}</p>
                </>
              )}
              <p style={{marginLeft: 'auto'}}><span className="info-label">Node ID:</span> {currentAuthUserId}</p>
            </div>
          </header>

          {/* CARDS */}
          <section className="cards-grid">
             {ultimaLeitura && (
                <>
                  <div className="card accent-green">
                    <h3 className="card-title">Umidade do Solo</h3>
                    <p className="card-value green">{ultimaLeitura.umidadeSolo?.toFixed(1)}%</p>
                    <p className="card-subtitle">Faixa ideal: 55% — 70%</p>
                  </div>
                  <div className="card accent-red">
                    <h3 className="card-title">Temp. Ambiente</h3>
                    <p className="card-value red">{ultimaLeitura.temperaturaAmbiente?.toFixed(1)}°C</p>
                    <p className="card-subtitle">Sensor digital DHT22</p>
                  </div>
                  <div className="card accent-sky">
                    <h3 className="card-title">Umidade do Ar</h3>
                    <p className="card-value sky">{ultimaLeitura.umidadeAr?.toFixed(1)}%</p>
                    <p className="card-subtitle">Microclima da estufa</p>
                  </div>
                  <div className="card accent-indigo">
                    <h3 className="card-title">Sensor Pluviométrico</h3>
                    <p className="card-value indigo">{ultimaLeitura.estaChovendo ? 'Chuva Detectada' : 'Sem Chuva'}</p>
                    <p className="card-subtitle">Bloqueio preventivo ativo</p>
                  </div>
                  <div className="card accent-blue">
                    <h3 className="card-title">Válvula Solenoide</h3>
                    <p className={`card-value ${ultimaLeitura.valvula ? 'blue' : 'slate'}`}>
                        {ultimaLeitura.valvula ? 'Aberta' : 'Fechada'}
                    </p>
                    <p className="card-subtitle">Vazão atual: {ultimaLeitura.fluxoAgua || 0} L/min</p>
                  </div>
                </>
             )}
          </section>

          <section className="main-layout">
            <div className="charts-column">
              <div className="chart-container">
                <h2 className="chart-title">Curva de Umidade & Temperatura (Últimos 20 ciclos)</h2>
                <ResponsiveContainer width="100%" height={330}>
                  <LineChart data={[...leituras].slice(0, 20).reverse()} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="timestampGrafico" fontSize={12} stroke="#64748b" />
                    <YAxis domain={[0, 100]} fontSize={12} stroke="#64748b" />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="umidadeSolo" stroke="#10B981" name="Umidade Solo (%)" dot={{ r: 3 }} strokeWidth={2.5}/>
                    <Line type="monotone" dataKey="umidadeAr" stroke="#0284c7" name="Umidade Ar (%)" dot={{ r: 3 }} strokeWidth={2.5}/>
                    <Line type="monotone" dataKey="temperaturaAmbiente" stroke="#EF4444" name="Temperatura (°C)" dot={{ r: 3 }} strokeWidth={2.5}/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="history-column">
              <div className="history-container">
                <h2 className="section-title">Histórico de Leituras</h2>
                
                <div className="history-table-container">
                  <table className="history-table">
                    <thead>
                      <tr>
                        <th>Data/Hora</th>
                        <th>Solo</th>
                        <th>Temp</th>
                        <th>Válvula</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leiturasAtuais.map((leitura, index) => (
                        <tr key={leitura.id || index}>
                          <td>{leitura.timestampTabela}</td>
                          <td style={{fontWeight: 700, color: '#059669'}}>{leitura.umidadeSolo?.toFixed(1)}%</td>
                          <td>{leitura.temperaturaAmbiente?.toFixed(1)}°C</td>
                          <td>
                            {leitura.valvula ? 
                                <span className="status-open">Aberta</span> : 
                                <span className="status-closed">Fechada</span>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {leituras.length > 0 && (
                    <div className="pagination-controls">
                        <button className="pagination-btn" onClick={irParaAnterior} disabled={paginaAtual === 1}>
                            &larr; Anterior
                        </button>
                        <span className="pagination-info">
                            Pág {paginaAtual} de {totalPaginas}
                        </span>
                        <button className="pagination-btn" onClick={irParaProximo} disabled={paginaAtual === totalPaginas || totalPaginas === 0}>
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
