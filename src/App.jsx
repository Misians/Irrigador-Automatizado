/* eslint-disable no-undef */
import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken } from 'firebase/auth';

// IMPORTAÇÕES CRÍTICAS: Usando Realtime Database (RTDB)
import { 
  getDatabase, 
  ref, 
  query as dbQuery, 
  orderByChild, 
  limitToLast, 
  onValue,
} from 'firebase/database';

// Importando o Recharts
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Componente de Estilos (CSS embutido)
const AppStyles = () => (
  <style>{`
    /* Reset básico e estilos do Body */
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    /* Animação de pulso para o loading */
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    /* Container principal da aplicação */
    .app-container {
      min-height: 100vh;
      background-color: #f1f5f9; /* bg-slate-100 */
      padding: 1.5rem; /* p-6 */
      font-family: sans-serif;
      color: #0f172a; /* text-slate-900 */
    }

    /* Conteúdo centralizado */
    .main-content {
      max-width: 80rem; /* max-w-7xl */
      margin-left: auto;
      margin-right: auto;
    }

    /* Cabeçalho */
    .header {
      margin-bottom: 2.5rem; /* mb-10 */
    }

    .header-title-container {
      display: flex;
      align-items: center;
      margin-bottom: 0.5rem; /* mb-2 */
    }

    .header-title {
      font-size: 1.875rem; /* text-3xl */
      font-weight: 700; /* font-bold */
      color: #1e293b; /* text-slate-800 */
    }

    .header-subtitle {
      font-size: 1.125rem; /* text-lg */
      color: #64748b; /* text-slate-500 */
    }

    .header-info {
      margin-top: 1rem; /* mt-4 */
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem 1.5rem; /* gap-y-2 gap-x-6 */
      font-size: 0.875rem; /* text-sm */
      color: #475569; /* text-slate-600 */
      border-top: 1px solid #e2e8f0; /* border-t border-slate-200 */
      padding-top: 1rem; /* pt-4 */
    }

    .info-label {
      font-weight: 600; /* font-semibold */
      color: #334155; /* text-slate-700 */
    }

    .user-id-info {
      font-size: 0.75rem; /* text-xs */
      color: #94a3b8; /* text-slate-400 */
      align-self: center; /* self-center */
      margin-left: auto; /* Empurra para a direita */
    }

    /* Seções */
    .current-data-section {
      margin-bottom: 2.5rem; /* mb-10 */
    }

    .section-header {
      display: flex;
      align-items: center;
      margin-bottom: 1.25rem; /* mb-5 */
    }

    .section-title {
      font-size: 1.5rem; /* text-2xl */
      font-weight: 600; /* font-semibold */
      color: #334155; /* text-slate-700 */
    }

    /* Grid de Cards */
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(1, minmax(0, 1fr)); /* grid-cols-1 */
      gap: 1.25rem; /* gap-5 */
    }

    .loading-message {
      grid-column: 1 / -1; /* col-span-full */
      text-align: center; /* text-center */
      font-size: 1.125rem; /* text-lg */
      color: #94a3b8; /* text-slate-400 */
      animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; /* animate-pulse */
      padding-top: 2.5rem; /* py-10 */
      padding-bottom: 2.5rem; /* py-10 */
    }

    .error-message {
      grid-column: 1 / -1;
      text-align: center;
      font-size: 1.125rem;
      color: #94a3b8;
      padding-top: 2.5rem;
      padding-bottom: 2.5rem;
    }

    /* Cards individuais */
    .card {
      background-color: #ffffff; /* bg-white */
      border-radius: 0.75rem; /* rounded-xl */
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1); /* shadow-lg */
      padding: 1.25rem; /* p-5 */
      border: 1px solid #e2e8f0; /* border border-slate-200 */
      transition: box-shadow 0.3s ease; /* transition-shadow duration-300 */
    }

    .card:hover {
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1); /* hover:shadow-md */
    }

    .card-title {
      font-size: 0.75rem; /* text-sm */
      font-weight: 500; /* font-medium */
      color: #64748b; /* text-slate-500 */
      text-transform: uppercase; /* uppercase */
      letter-spacing: 0.05em; /* tracking-wide */
      margin-bottom: 0.5rem; /* mb-2 */
    }

    .card-value {
      font-size: 1.875rem; /* text-3xl */
      font-weight: 700; /* font-bold */
    }

    .card-value.green { color: #059669; } /* text-green-700 */
    .card-value.red { color: #b91c1c; } /* text-red-700 */
    .card-value.sky { color: #0369a1; } /* text-sky-700 */
    .card-value.indigo { color: #4338ca; } /* text-indigo-700 */
    .card-value.blue { color: #2563eb; } /* text-blue-600 */
    .card-value.slate { color: #334155; } /* text-slate-700 */

    .card-subtitle {
      font-size: 0.75rem; /* text-xs */
      color: #94a3b8; /* text-slate-400 */
      margin-top: 0.5rem; /* mt-2 */
    }

    /* Layout principal (Gráficos e Histórico) */
    .main-layout {
      display: grid;
      grid-template-columns: repeat(1, minmax(0, 1fr)); /* grid-cols-1 */
      gap: 2rem; /* gap-8 */
    }

    .charts-column {
      /* Ocupa 2 colunas em telas grandes */
    }

    .chart-container {
      background-color: #ffffff; /* bg-white */
      border-radius: 0.75rem; /* rounded-xl */
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1); /* shadow-lg */
      padding: 1.5rem; /* p-6 */
      border: 1px solid #e2e8f0; /* border border-slate-200 */
    }

    .chart-title {
      font-size: 1.5rem; /* text-2xl */
      font-weight: 600; /* font-semibold */
      color: #334155; /* text-slate-700 */
      margin-bottom: 1.5rem; /* mb-6 */
    }

    .chart-subtitle {
      font-size: 1.125rem; /* text-lg */
      font-weight: 600; /* font-semibold */
      color: #475569; /* text-slate-600 */
      margin-bottom: 0.75rem; /* mb-3 */
    }

    .chart-subtitle.second {
      margin-top: 2rem; /* mt-8 */
    }

    .history-column {
      /* Ocupa 1 coluna em telas grandes */
    }

    .history-container {
      background-color: #ffffff; /* bg-white */
      border-radius: 0.75rem; /* rounded-xl */
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1); /* shadow-lg */
      border: 1px solid #e2e8f0; /* border border-slate-200 */
      height: 100%; /* h-full */
      display: flex; /* flex */
      flex-direction: column; /* flex-col */
    }

    .history-header {
      display: flex;
      align-items: center;
      padding: 1.5rem; /* p-6 */
      border-bottom: 1px solid #e2e8f0; /* border-b border-slate-200 */
    }

    .history-table-container {
      overflow-y: auto; /* overflow-y-auto */
      flex: 1 1 0%; /* flex-1 */
      max-height: 720px;
    }

    .history-table {
      min-width: 100%; /* min-w-full */
      border-collapse: collapse; /* divide-y divide-slate-200 (simulado com bordas) */
    }

    .history-table thead {
      background-color: #f8fafc; /* bg-slate-50 */
      position: sticky; /* sticky */
      top: 0; /* top-0 */
      z-index: 10; /* z-10 */
    }

    .history-table th {
      padding: 0.75rem 1rem; /* px-4 py-3 */
      text-align: left; /* text-left */
      font-size: 0.75rem; /* text-xs */
      font-weight: 500; /* font-medium */
      color: #64748b; /* text-slate-500 */
      text-transform: uppercase; /* uppercase */
      letter-spacing: 0.05em; /* tracking-wider */
      border-bottom: 1px solid #e2e8f0;
    }

    .history-table tbody {
      background-color: #ffffff; /* bg-white */
    }

    .history-table tr {
      border-bottom: 1px solid #e2e8f0; /* divide-y divide-slate-200 */
      transition: background-color 0.2s; /* transition-colors */
    }

    .history-table tr:hover {
      background-color: #f8fafc; /* hover:bg-slate-50 */
    }

    .history-table td {
      padding: 1rem 1rem; /* px-4 py-4 */
      white-space: nowrap; /* whitespace-nowrap */
      font-size: 0.875rem; /* text-sm */
      color: #334155; /* text-slate-700 */
    }

    .history-table td.font-medium {
      font-weight: 500; /* font-medium */
    }

    .status-open {
      font-weight: 500;
      color: #2563eb; /* text-blue-600 */
    }

    .status-closed {
      color: #475569; /* text-slate-600 */
    }

    .table-message {
      text-align: center;
      color: #94a3b8;
      padding: 2.5rem;
    }


    /* Rodapé */
    .footer {
      text-align: center; /* text-center */
      margin-top: 2.5rem; /* mt-10 */
      color: #94a3b8; /* text-slate-400 */
      font-size: 0.875rem; /* text-sm */
    }

    /* --- Media Queries (Responsividade) --- */

    /* Telas pequenas (sm) */
    @media (min-width: 640px) {
      .app-container {
        padding: 2.5rem; /* sm:p-10 */
      }
      
      .header-title {
        font-size: 2.25rem; /* sm:text-4xl */
      }
      
      .cards-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr)); /* sm:grid-cols-2 */
      }
    }

    /* Telas médias (lg) */
    @media (min-width: 1024px) {
      .cards-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr)); /* lg:grid-cols-3 */
      }
      
      .main-layout {
        grid-template-columns: repeat(3, minmax(0, 1fr)); /* lg:grid-cols-3 */
      }
      
      .charts-column {
        grid-column: span 2 / span 2; /* lg:col-span-2 */
      }
      
      .history-column {
        grid-column: span 1 / span 1; /* lg:col-span-1 */
      }
    }

    /* Telas extra-grandes (xl) */
    @media (min-width: 1280px) {
      .cards-grid {
        grid-template-columns: repeat(5, minmax(0, 1fr)); /* xl:grid-cols-5 */
      }
    }
  `}</style>
);


// Componente principal da página do Dashboard
export default function App() {
  // Configuração padrão de fallback 
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

  // Constantes para o caminho de busca fixo
  const FIXED_USER_ID = 'default-user-id';
  
  // Variáveis de estado
  const [loading, setLoading] = useState(true);
  const [ultimaLeitura, setUltimaLeitura] = useState(null);
  const [leituras, setLeituras] = useState([]); 

  // Variáveis de estado do Firebase
  const [db, setDb] = useState(null); 
  const [auth, setAuth] = useState(null);
  const [currentAppId, setCurrentAppId] = useState(null);
  const [currentAuthUserId, setCurrentAuthUserId] = useState(null); // Mantido apenas para fins de exibição

  // Efeito para inicializar o Firebase e autenticar o usuário
  useEffect(() => {
    
    try {
      // 1. Carrega a configuração do Firebase
      let firebaseConfig = {};
      
      if (typeof __firebase_config !== 'undefined' && __firebase_config) {
          try {
              if (typeof __firebase_config === 'string') {
                  firebaseConfig = JSON.parse(__firebase_config);
              } else if (typeof __firebase_config === 'object') {
                  firebaseConfig = __firebase_config;
              }
          } catch (e) {
              firebaseConfig = fallbackConfig;
          }
      } else {
          firebaseConfig = fallbackConfig;
      }

      if (!firebaseConfig.projectId) {
          firebaseConfig = { ...fallbackConfig, ...firebaseConfig };
      }
      
      // Define o App ID
      const initialAppId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
      setCurrentAppId(initialAppId);
      
      const initialAuthToken = typeof __initial_auth_token !== 'undefined' 
        ? __initial_auth_token 
        : null;

      // 2. Inicializa os serviços do Firebase
      const app = initializeApp(firebaseConfig);
      const database = getDatabase(app); 
      const firebaseAuth = getAuth(app);
      
      setDb(database);
      setAuth(firebaseAuth);

      // 3. Função para realizar o login
      const signIn = async () => {
        try {
          // A autenticação é sempre necessária para as regras de segurança do Canvas,
          // mas o ID real autenticado não será usado para buscar os dados.
          if (initialAuthToken) {
            await signInWithCustomToken(firebaseAuth, initialAuthToken);
          } else {
            await signInAnonymously(firebaseAuth);
          }
          
          const uid = firebaseAuth.currentUser?.uid || 'N/A';
          setCurrentAuthUserId(uid); // Apenas para exibição no rodapé/header
          console.log("Autenticação concluída. User ID (Autenticado):", uid);

        } catch (error) {
          console.error("Erro de autenticação Firebase:", error);
          setLoading(false);
        }
      };
      
      signIn();

    } catch (error) {
      console.error("Erro de inicialização Firebase:", error);
      setLoading(false);
    }
  }, []); 

  // Efeito para buscar e ouvir os dados do Realtime Database
  useEffect(() => {
    // Só executa se o Firebase (db, auth) e o appId estiverem prontos
    if (!db || !auth || !currentAppId) {
      return; 
    }

    setLoading(true);
    
    // CAMINHO FIXO: /artifacts/{currentAppId}/users/default-user-id/leiturasSolo
    const leiturasCollectionPath = `/artifacts/${currentAppId}/users/${FIXED_USER_ID}/leiturasSolo`;
    
    // 1. Cria a referência para o RTDB
    const leiturasRef = ref(db, leiturasCollectionPath);

    console.log(`[RTDB DIAGONÓSTICO] Tentando ler da coleção FIXA: /${leiturasCollectionPath}`);

    // 2. Cria a query para ordenar e limitar os dados
    const LIMITE_LEITURAS = 15;
    const q = dbQuery(
        leiturasRef,
        orderByChild('timestamp'), 
        limitToLast(LIMITE_LEITURAS) 
    );

    // 3. Ouve por mudanças em tempo real com 'onValue'
    const unsubscribe = onValue(q, (snapshot) => {
      
      let leiturasArray = [];

      if (snapshot.exists()) {
        const rawData = snapshot.val();
        
        for (const id in rawData) {
            leiturasArray.push({
                id, 
                ...rawData[id] 
            });
        }
        
        // Invertemos o array (que está ordenado do mais antigo para o mais novo pelo RTDB)
        // para que o mais novo fique no índice 0 (para o card da Última Leitura)
        leiturasArray.reverse();
        
        // 4. Processa a última leitura (para os cards)
        const latestData = leiturasArray[0];
        
        let dataLegivel = new Date(latestData.timestamp);
        
        const formattedTimestamp = dataLegivel
            ? dataLegivel.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' }) 
            : 'N/A';

        // 5. Atualiza o estado da 'Última Leitura' (para os cards)
        setUltimaLeitura({
          ...latestData,
          timestamp: formattedTimestamp,
          
          // CORREÇÃO: Mapeando para as chaves exatas do seu banco de dados
          umidadeSolo: latestData.umidadedosolo, 
          temperaturaAmbiente: latestData.temperatura,
          umidadeAr: latestData.umidadeDoAr,
          
          estaChovendo: latestData.estaChovendo, // A chave estava correta, apenas incluída para clareza
          valvula: latestData.statusValvula === 'aberta', 
          fluxoAgua: latestData.fluxoAgua, 
          localizacao: latestData.localizacao?.nomeLocal || 'Não Especificado'
        });
        
        // 6. Atualiza o estado do 'Histórico' (para a tabela e gráficos)
        setLeituras(leiturasArray.map(leitura => {
            
            let dataItem = new Date(leitura.timestamp);

            return {
                ...leitura,
                // CORREÇÃO: Mapeando para as chaves exatas do seu banco de dados
                umidadeSolo: leitura.umidadedosolo,
                umidadeAr: leitura.umidadeDoAr,
                
                temperaturaAmbiente: leitura.temperatura,
                valvula: leitura.statusValvula === 'aberta',
                timestampTabela: dataItem ? dataItem.toLocaleString('pt-BR') : 'N/A',
                timestamp: dataItem 
                    ? dataItem.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) 
                    : 'N/A',
            };
        }));
      } else {
        setUltimaLeitura(null);
        setLeituras([]);
      }
      setLoading(false); 
    }, (error) => {
      console.error("[RTDB DIAGONÓSTICO] Erro ao ouvir dados do Realtime Database:", error);
      setLoading(false);
    });

    return () => unsubscribe();
    
  }, [db, auth, currentAppId]); 


  // -----------------------------------------------------------------------------------
  // Renderização da Interface do Usuário (UI)
  // -----------------------------------------------------------------------------------
  return (
    <>
      <AppStyles />

      <div className="app-container">
        <div className="main-content">
          
          <header className="header">
            <div className="header-title-container">
                <h1 className="header-title">
                  Dashboard de Irrigação
                </h1>
            </div>
            <p className="header-subtitle">
              Monitoramento em tempo real do seu sistema.
            </p>
            
            <div className="header-info">
              {ultimaLeitura ? (
                <>
                  <p>
                    <span className="info-label">Localização:</span> {ultimaLeitura.localizacao}
                  </p>
                  <p>
                    <span className="info-label">Última Atualização:</span> {ultimaLeitura.timestamp}
                  </p>
                </>
              ) : (
                <p>
                  <span className="info-label">Status:</span> Aguardando dados no caminho fixo.
                </p>
              )}
              {currentAuthUserId && (
                    <p className="user-id-info" style={{marginLeft: 'auto'}}>
                      (Usuário Autenticado: {currentAuthUserId})
                    </p>
              )}
              <p className="user-id-info" style={{marginTop: '0.25rem', width: '100%', textAlign: 'right'}}>
                (Buscando no ID Fixo: {FIXED_USER_ID})
              </p>
            </div>
          </header>

          <section className="current-data-section">
            <div className="section-header">
              <h2 className="section-title">
                Dados Atuais
              </h2>
            </div>
            
            <div className="cards-grid">
              {loading && (
                <p className="loading-message">
                  Carregando dados...
                </p>
              )}

              {!loading && !ultimaLeitura && (
                <p className="error-message">
                  Nenhum dado encontrado no caminho fixo. Verifique se seu dispositivo está enviando dados para o ID **{FIXED_USER_ID}**.
                </p>
              )}

              {ultimaLeitura && (
                <>
                  {/* Card: Umidade do Solo */}
                  <div className="card">
                    <h3 className="card-title">
                      Umidade do Solo
                    </h3>
                    <p className="card-value green">
                      {ultimaLeitura.umidadeSolo?.toFixed(1) || 'N/A'}%
                    </p>
                  </div>

                  {/* Card: Temperatura Ambiente */}
                  <div className="card">
                    <h3 className="card-title">
                      Temperatura
                    </h3>
                    <p className="card-value red">
                      {ultimaLeitura.temperaturaAmbiente?.toFixed(1) || 'N/A'}°C
                    </p>
                  </div>

                  {/* Card: Umidade do Ar */}
                  <div className="card">
                    <h3 className="card-title">
                      Umidade do Ar
                    </h3>
                    <p className="card-value sky">
                      {ultimaLeitura.umidadeAr?.toFixed(1) || 'N/A'}%
                    </p>
                  </div>
                  
                  {/* Card: Status da Chuva */}
                  <div className="card">
                    <h3 className="card-title">
                      Chuva
                    </h3>
                    <p className="card-value indigo">
                      {ultimaLeitura.estaChovendo ? 'Chovendo' : 'Sem chuva'}
                    </p>
                  </div>

                  {/* Card: Status da Válvula */}
                  <div className="card">
                    <h3 className="card-title">
                      Válvula
                    </h3>
                    <p className={`card-value ${ultimaLeitura.valvula ? 'blue' : 'slate'}`}>
                      {ultimaLeitura.valvula ? 'Aberta' : 'Fechada'}
                    </p>
                    <p className="card-subtitle">
                      {ultimaLeitura.fluxoAgua ? `Fluxo: ${ultimaLeitura.fluxoAgua?.toFixed(2)} L/min` : 'Fluxo: N/A'}
                    </p>
                  </div>
                </>
              )}
            </div>
          </section>

          <section className="main-layout">
            
            <div className="charts-column">
              <div className="chart-container">
                <h2 className="chart-title">
                  Gráficos das Últimas 15 Leituras
                </h2>
                {leituras.length > 0 ? (
                  <>
                    {/* Gráfico 1: Umidades */}
                    <h4 className="chart-subtitle">
                      Umidade (%)
                    </h4>
                    <ResponsiveContainer width="100%" height={300}>
                      {/* Invertemos o array aqui para que o tempo vá da esquerda (mais antigo) para a direita (mais novo) */}
                      <LineChart data={[...leituras].reverse()} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis dataKey="timestamp" fontSize={12} />
                        <YAxis domain={[0, 100]} fontSize={12} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="umidadeSolo" stroke="#10B981" name="Umidade do Solo" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="umidadeAr" stroke="#3B82F6" name="Umidade do Ar" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>

                    {/* Gráfico 2: Temperatura */}
                    <h4 className="chart-subtitle second">
                      Temperatura (°C)
                    </h4>
                    <ResponsiveContainer width="100%" height={300}>
                      {/* Invertemos o array aqui para que o tempo vá da esquerda (mais antigo) para a direita (mais novo) */}
                      <LineChart data={[...leituras].reverse()} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis dataKey="timestamp" fontSize={12} />
                        <YAxis fontSize={12} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="temperaturaAmbiente" stroke="#EF4444" name="Temperatura" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </>
                ) : (
                  // Mensagem se não houver dados para os gráficos
                  !loading && <p className="table-message">
                    Nenhum dado disponível para gerar gráficos.
                  </p>
                )}
                {loading && <p className="loading-message" style={{padding: 0}}>Carregando gráficos...</p>}
              </div>
            </div>

            <div className="history-column">
              <div className="history-container">
                <div className="history-header">
                    <h2 className="section-title">
                      Histórico
                    </h2>
                </div>
                
                <div className="history-table-container">
                  {leituras.length > 0 ? (
                    <table className="history-table">
                      <thead>
                        <tr>
                          <th>
                            Timestamp
                          </th>
                          <th>
                            Solo (%)
                          </th>
                          <th>
                            Ar (%)
                          </th>
                          <th>
                            Válvula
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* A tabela mostra do mais novo para o mais antigo (do jeito que está no array 'leituras') */}
                        {leituras.map((leitura, index) => (
                          <tr key={leitura.id || index}>
                            <td>
                              {leitura.timestampTabela}
                            </td>
                            <td className="font-medium">
                              {leitura.umidadeSolo?.toFixed(1) || 'N/A'}
                            </td>
                            <td>
                              {leitura.umidadeAr?.toFixed(1) || 'N/A'}
                            </td>
                            <td>
                              {leitura.valvula ? (
                                <span className="status-open">Aberta</span>
                              ) : (
                                <span className="status-closed">Fechada</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    !loading && <p className="table-message">
                      Nenhum histórico de leituras disponível.
                    </p>
                  )}
                  {loading && <p className="loading-message" style={{padding: 0}}>Carregando histórico...</p>}
                </div>
              </div>
            </div>
          </section>

          <footer className="footer">
            Desenvolvido com React e Firebase.
          </footer>
        </div>
      </div>
    </>
  );
}