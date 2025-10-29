/* eslint-disable no-undef */
import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
// Usando os imports corretos do Realtime Database (RTDB)
import { getDatabase, ref, query as rtdbQuery, orderByChild, onValue } from 'firebase/database';
// Importando o Recharts
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Componente principal da página do Dashboard
export default function App() {
  // Estado da aplicação
  const [loading, setLoading] = useState(true);
  const [ultimaLeitura, setUltimaLeitura] = useState(null);
  const [leituras, setLeituras] = useState([]);

  // Variáveis de estado do Firebase
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);

  // Efeito para inicializar o Firebase e autenticar o usuário
  useEffect(() => {
    
    // --- INÍCIO DA ADIÇÃO: Carrega o Tailwind CSS ---
    // Este script injeta o Tailwind CDN no <head> do documento
    const tailwindScript = document.createElement('script');
    tailwindScript.src = "https://cdn.tailwindcss.com";
    tailwindScript.async = true;
    document.head.appendChild(tailwindScript);
    // --- FIM DA ADIÇÃO ---

    try {
      // 1. Carrega a configuração do Firebase (fornecida pelo ambiente)
      let firebaseConfig = {};
      
      // Objeto de fallback com as credenciais que você forneceu anteriormente
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

      // Tenta usar a configuração global do Canvas primeiro
      if (typeof __firebase_config !== 'undefined' && __firebase_config) {
          try {
              // Tenta parsear se for uma string
              if (typeof __firebase_config === 'string') {
                  firebaseConfig = JSON.parse(__firebase_config);
              } else if (typeof __firebase_config === 'object') {
                  firebaseConfig = __firebase_config; // Já é um objeto
              }
          } catch (e) {
              console.warn("Falha ao parsear __firebase_config, usando fallback.", e);
              firebaseConfig = fallbackConfig; // Usa o fallback se o parse falhar
          }
      } else {
          console.warn("__firebase_config não definido, usando fallback.");
          firebaseConfig = fallbackConfig; // Usa o fallback se a global não existir
      }

      // Garantia final: Se a config (mesmo a global) não tiver os campos essenciais,
      // mescla com o fallback para garantir que 'databaseURL' e 'projectId' existam.
      if (!firebaseConfig.projectId || !firebaseConfig.databaseURL) {
          console.warn("Configuração do Firebase vinda do ambiente está incompleta, mesclando com fallback.");
          firebaseConfig = { ...fallbackConfig, ...firebaseConfig };
      }
      
      const initialAuthToken = typeof __initial_auth_token !== 'undefined' 
        ? __initial_auth_token 
        : null;

      // 2. Inicializa os serviços do Firebase
      const app = initializeApp(firebaseConfig);
      const database = getDatabase(app); // Usando Realtime Database
      const firebaseAuth = getAuth(app);
      
      // 3. Armazena as instâncias no estado do React
      setDb(database);
      setAuth(firebaseAuth);

      // 4. Função para realizar o login
      const signIn = async () => {
        try {
          if (initialAuthToken) {
            await signInWithCustomToken(firebaseAuth, initialAuthToken);
          } else {
            await signInAnonymously(firebaseAuth); // Fallback para dev local
          }
          
          const currentUserId = firebaseAuth.currentUser?.uid || crypto.randomUUID();
          setUserId(currentUserId); // Define o userId no estado

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

    // Função de limpeza para remover o script quando o componente desmontar
    return () => {
        const existingScript = document.querySelector('script[src="https://cdn.tailwindcss.com"]');
        if (existingScript && document.head.contains(existingScript)) {
            document.head.removeChild(existingScript);
        }
    };
  }, []); // Array vazio, roda apenas uma vez na montagem

  // Efeito para buscar e ouvir os dados do Realtime Database
  useEffect(() => {
    // Só executa se o Firebase (db, auth) e o usuário (userId) estiverem prontos
    if (!db || !auth || !userId) {
      return; // Ainda não está pronto
    }

    setLoading(true);

    // 1. Define a referência para o nó 'leiturasSolo' no RTDB
    const leiturasCollectionRef = ref(db, 'leiturasSolo');

    // 2. Cria a query para ordenar os dados por 'timestamp'
    const q = rtdbQuery(leiturasCollectionRef, orderByChild('timestamp'));

    // 3. Ouve por mudanças em tempo real com 'onValue'
    const unsubscribe = onValue(q, (snapshot) => {
      if (!snapshot.exists()) {
        // Caso não haja dados
        setUltimaLeitura(null);
        setLeituras([]);
        console.warn("Nenhum dado encontrado no caminho 'leiturasSolo'.");
      } else {
        // 4. Processa os dados
        const dataObj = snapshot.val();
        
        // Converte o objeto em um array
        const leiturasArray = Object.keys(dataObj).map(key => ({
          id: key, // Salva a chave única do RTDB
          ...dataObj[key]
        }));
        
        // Ordena o array pela 'timestamp' (mais novo primeiro)
        leiturasArray.sort((a, b) => b.timestamp - a.timestamp);

        // 5. Pega o dado mais recente
        const latestData = leiturasArray[0];

        // 6. Atualiza o estado da 'Última Leitura' (para os cards)
        setUltimaLeitura({
          ...latestData,
          timestamp: latestData.timestamp ? new Date(latestData.timestamp).toLocaleString('pt-BR') : 'N/A',
          umidadeSolo: latestData.umidadedosolo,
          temperaturaAmbiente: latestData.temperatura,
          umidadeAr: latestData.umidadeDoAr,
          estaChovendo: latestData.estaChovendo,
          valvula: latestData.statusValvula === 'aberta',
          fluxoAgua: latestData.fluxoAgua,
          localizacao: latestData.localizacao?.nomeLocal || 'N/A'
        });

        // 7. Atualiza o estado do 'Histórico' (para a tabela e gráficos)
        const histórico = leiturasArray.map(leitura => ({
          ...leitura,
          timestamp: leitura.timestamp ? new Date(leitura.timestamp).toLocaleString('pt-BR') : 'N/A',
          umidadeSolo: leitura.umidadedosolo,
          temperaturaAmbiente: leitura.temperatura,
          umidadeAr: leitura.umidadeDoAr,
          estaChovendo: leitura.estaChovendo,
          valvula: leitura.statusValvula === 'aberta'
        }));
        setLeituras(histórico);
      }
      setLoading(false); // Marca que o carregamento terminou
    }, (error) => {
      // Callback de erro do onValue
      console.error("Erro ao ouvir dados do RTDB:", error);
      setLoading(false);
    });

    // 8. Função de limpeza: para de ouvir quando o componente desmontar
    return () => unsubscribe();
    
  }, [db, auth, userId]); // Dependências: re-executa se db, auth ou userId mudarem

  // -----------------------------------------------------------------------------------
  // Renderização da Interface do Usuário (UI)
  // O JSX foi redesenhado para uma aparência mais moderna.
  // -----------------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-100 p-6 sm:p-10 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto">
        
        {/* Cabeçalho */}
        <header className="mb-10">
          <div className="flex items-center space-x-3 mb-2">
             <h1 className="text-3xl sm:text-4xl font-bold text-slate-800">
               Dashboard de Irrigação
             </h1>
          </div>
          <p className="text-lg text-slate-500">
            Monitoramento em tempo real do seu sistema.
          </p>
        </header>

        {/* Seção de Dados Atuais (Cards) */}
        <section className="mb-10">
          <div className="flex items-center space-x-2 mb-5">
            <h2 className="text-2xl font-semibold text-slate-700">
              Dados Atuais
            </h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
            {loading && (
              <p className="col-span-full text-center text-lg text-slate-400 animate-pulse">
                Carregando dados...
              </p>
            )}

            {!loading && !ultimaLeitura && (
              <p className="col-span-full text-center text-lg text-slate-400">
                Nenhum dado encontrado. Verifique o caminho no RTDB ('leiturasSolo').
              </p>
            )}

            {/* Renderiza os cards se a última leitura existir */}
            {ultimaLeitura && (
              <>
                {/* Card: Umidade do Solo */}
                <div className="bg-white rounded-xl shadow-lg p-5 border border-slate-200 hover:shadow-md transition-shadow duration-300">
                  <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-2">
                    Umidade do Solo
                  </h3>
                  <p className="text-3xl font-bold text-green-700">
                    {ultimaLeitura.umidadeSolo?.toFixed(1) || 'N/A'}%
                  </p>
                </div>

                {/* Card: Temperatura Ambiente */}
                <div className="bg-white rounded-xl shadow-lg p-5 border border-slate-200 hover:shadow-md transition-shadow duration-300">
                  <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-2">
                    Temperatura
                  </h3>
                  <p className="text-3xl font-bold text-red-700">
                    {ultimaLeitura.temperaturaAmbiente?.toFixed(1) || 'N/A'}°C
                  </p>
                </div>

                {/* Card: Umidade do Ar */}
                <div className="bg-white rounded-xl shadow-lg p-5 border border-slate-200 hover:shadow-md transition-shadow duration-300">
                  <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-2">
                    Umidade do Ar
                  </h3>
                  <p className="text-3xl font-bold text-sky-700">
                    {ultimaLeitura.umidadeAr?.toFixed(1) || 'N/A'}%
                  </p>
                </div>
                
                {/* Card: Status da Chuva */}
                <div className="bg-white rounded-xl shadow-lg p-5 border border-slate-200 hover:shadow-md transition-shadow duration-300">
                  <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-2">
                    Chuva
                  </h3>
                  <p className="text-3xl font-bold text-indigo-700">
                    {ultimaLeitura.estaChovendo ? 'Chovendo' : 'Sem chuva'}
                  </p>
                </div>

                {/* Card: Status da Válvula */}
                <div className="bg-white rounded-xl shadow-lg p-5 border border-slate-200 hover:shadow-md transition-shadow duration-300">
                  <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-2">
                    Válvula
                  </h3>
                  <p className={`text-3xl font-bold ${ultimaLeitura.valvula ? 'text-blue-600' : 'text-slate-700'}`}>
                    {ultimaLeitura.valvula ? 'Aberta' : 'Fechada'}
                  </p>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Layout Principal: Gráficos e Histórico Lado a Lado */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Coluna dos Gráficos */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
              <h2 className="text-2xl font-semibold text-slate-700 mb-6">
                Gráficos das Leituras
              </h2>
              {leituras.length > 0 ? (
                <>
                  {/* Gráfico 1: Umidades */}
                  <h4 className="text-lg font-semibold text-slate-600 mb-3">
                    Umidade (%)
                  </h4>
                  <ResponsiveContainer width="100%" height={300}>
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
                  <h4 className="text-lg font-semibold text-slate-600 mb-3 mt-8">
                    Temperatura (°C)
                  </h4>
                  <ResponsiveContainer width="100%" height={300}>
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
                !loading && <p className="text-center text-slate-400 py-10">
                  Nenhum dado disponível para gerar gráficos.
                </p>
              )}
              {loading && <p className="text-center text-slate-400 py-10 animate-pulse">Carregando gráficos...</p>}
            </div>
          </div>

          {/* Coluna do Histórico (Tabela) */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 h-full flex flex-col">
              <div className="flex items-center space-x-3 p-6 border-b border-slate-200">
                 <h2 className="text-2xl font-semibold text-slate-700">
                   Histórico
                 </h2>
              </div>
              
              {/* Container rolável para a tabela */}
              <div className="overflow-y-auto flex-1" style={{ maxHeight: '720px' }}>
                {leituras.length > 0 ? (
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Timestamp
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Solo (%)
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Ar (%)
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Válvula
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {leituras.map((leitura, index) => (
                        <tr key={leitura.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-700">
                            {leitura.timestamp}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-700 font-medium">
                            {leitura.umidadeSolo?.toFixed(1) || 'N/A'}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-700">
                            {leitura.umidadeAr?.toFixed(1) || 'N/A'}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm">
                            {leitura.valvula ? (
                              <span className="font-medium text-blue-600">Aberta</span>
                            ) : (
                              <span className="text-slate-600">Fechada</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  // Mensagem se não houver dados para a tabela
                  !loading && <p className="text-center text-slate-400 p-10">
                    Nenhum histórico de leituras disponível.
                  </p>
                )}
                {loading && <p className="text-center text-slate-400 p-10 animate-pulse">Carregando histórico...</p>}
              </div>
            </div>
          </div>
        </section>

        {/* Rodapé */}
        <footer className="text-center mt-10 text-slate-400 text-sm">
          Desenvolvido com React e Firebase.
        </footer>
      </div>
    </div>
  );
}


