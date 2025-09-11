/* eslint-disable no-undef */
import { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Componente principal da página do Dashboard
export default function App() {
  const [loading, setLoading] = useState(true);
  const [ultimaLeitura, setUltimaLeitura] = useState(null);
  const [leituras, setLeituras] = useState([]);

  // Variáveis de estado do Firebase
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const isAuthReady = useRef(false);

  // Inicializa o Firebase e a autenticação
  useEffect(() => {
    try {
      const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
      const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

      const app = initializeApp(firebaseConfig);
      const firestoreDb = getFirestore(app);
      const firebaseAuth = getAuth(app);

      setDb(firestoreDb);
      setAuth(firebaseAuth);

      const signIn = async () => {
        try {
          if (initialAuthToken) {
            await signInWithCustomToken(firebaseAuth, initialAuthToken);
          } else {
            await signInAnonymously(firebaseAuth);
          }
          const currentUserId = firebaseAuth.currentUser?.uid || crypto.randomUUID();
          setUserId(currentUserId);
          isAuthReady.current = true;
        } catch (error) {
          console.error("Erro de autenticação Firebase:", error);
        }
      };
      signIn();
    } catch (error) {
      console.error("Erro de inicialização Firebase:", error);
    }
  }, []);

  // Escuta por atualizações em tempo real do Firestore
  useEffect(() => {
    if (!db || !auth || !isAuthReady.current || !userId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const appId = (typeof __app_id !== 'undefined' ? __app_id.split('/')[0] : 'default-app-id');
    const leiturasCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/leiturasSolo`);

    // Use o limite de 30 para os gráficos
    const q = query(leiturasCollectionRef, orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        setUltimaLeitura(null);
        setLeituras([]);
      } else {
        const leiturasArray = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          leiturasArray.push({ id: doc.id, ...data });
        });

        const latestData = leiturasArray[0];

        setUltimaLeitura({
          ...latestData,
          timestamp: latestData.timestamp instanceof Timestamp ? new Date(latestData.timestamp.toDate()).toLocaleString() : 'N/A',
          umidadeSolo: latestData.umidadedosolo,
          temperaturaAmbiente: latestData.temperatura,
          umidadeAr: latestData.umidadeDoAr,
          estaChovendo: latestData.estaChovendo,
          valvula: latestData.statusValvula === 'aberta',
          fluxoAgua: latestData.fluxoAgua,
          localizacao: latestData.localizacao?.nomeLocal || 'N/A'
        });

        const histórico = leiturasArray.map(leitura => ({
          ...leitura,
          timestamp: leitura.timestamp instanceof Timestamp ? new Date(leitura.timestamp.toDate()).toLocaleString() : 'N/A',
          umidadeSolo: leitura.umidadedosolo,
          temperaturaAmbiente: leitura.temperatura,
          umidadeAr: leitura.umidadeDoAr,
          estaChovendo: leitura.estaChovendo,
          valvula: leitura.statusValvula === 'aberta'
        }));
        setLeituras(histórico);
      }
      setLoading(false);
    }, (error) => {
      console.error("Erro ao ouvir leituras:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [db, auth, userId]);

  // -----------------------------------------------------------------------------------
  // Renderização da Interface do Usuário (UI)
  // -----------------------------------------------------------------------------------
  return (
    // Container principal da página, com estilos Tailwind CSS para fundo, padding e fonte
    <div className="min-h-screen bg-gray-50 p-8 font-sans text-gray-800">
      {/* Cabeçalho da página */}
      <header className="text-center mb-12">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-teal-700 mb-2">
          Dashboard de Irrigação Automatizada
        </h1>
        <p className="text-md sm:text-lg text-gray-500">
          Monitoramento em tempo real do seu sistema de irrigação.
        </p>
      </header>

      {/* Seção de Dados Atuais (Cards) */}
      <section className="mb-12">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-700 mb-6 text-center">
          Dados Atuais
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {loading && (
            <p className="col-span-full text-center text-gray-400 animate-pulse">
              Carregando dados...
            </p>
          )}

          {!loading && !ultimaLeitura && (
            <p className="col-span-full text-center text-gray-400">
              Nenhum dado encontrado.
            </p>
          )}

          {ultimaLeitura && (
            <>
              {/* Card de Umidade do Solo */}
              <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center justify-center transition-transform transform hover:scale-105 border border-gray-200">
                <h3 className="text-md sm:text-lg font-semibold text-gray-600 mb-2">
                  Umidade do Solo
                </h3>
                <p className="text-3xl sm:text-4xl font-bold text-green-600">
                  {ultimaLeitura.umidadeSolo?.toFixed(1) || 'N/A'}%
                </p>
              </div>

              {/* Card de Temperatura Ambiente */}
              <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center justify-center transition-transform transform hover:scale-105 border border-gray-200">
                <h3 className="text-md sm:text-lg font-semibold text-gray-600 mb-2">
                  Temperatura Ambiente
                </h3>
                <p className="text-3xl sm:text-4xl font-bold text-red-500">
                  {ultimaLeitura.temperaturaAmbiente?.toFixed(1) || 'N/A'}°C
                </p>
              </div>

              {/* Card de Umidade do Ar */}
              <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center justify-center transition-transform transform hover:scale-105 border border-gray-200">
                <h3 className="text-md sm:text-lg font-semibold text-gray-600 mb-2">
                  Umidade do Ar
                </h3>
                <p className="text-3xl sm:text-4xl font-bold text-blue-500">
                  {ultimaLeitura.umidadeAr?.toFixed(1) || 'N/A'}%
                </p>
              </div>

              {/* Card de Status da Chuva */}
              <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center justify-center transition-transform transform hover:scale-105 border border-gray-200">
                <h3 className="text-md sm:text-lg font-semibold text-gray-600 mb-2">
                  Status da Chuva
                </h3>
                <p className="text-3xl sm:text-4xl font-bold text-purple-600">
                  {ultimaLeitura.estaChovendo ? 'Chovendo' : 'Sem chuva'}
                </p>
              </div>

              {/* Card de Status da Válvula */}
              <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center justify-center transition-transform transform hover:scale-105 border border-gray-200">
                <h3 className="text-md sm:text-lg font-semibold text-gray-600 mb-2">
                  Status da Válvula
                </h3>
                <p className="text-3xl sm:text-4xl font-bold">
                  {ultimaLeitura.valvula ? (
                    <span className="text-green-500">aberta </span>
                  ) : (
                    <span className="text-gray-500">fechada </span>
                  )}
                </p>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Seção de Gráficos */}
      <section className="mb-12 max-w-6xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-700 mb-6 text-center">
          Gráficos das Leituras
        </h2>
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          {leituras.length > 0 ? (
            <>
              {/* Gráfico de Umidade do Solo e Umidade do Ar */}
              <h4 className="text-md sm:text-lg font-semibold text-gray-600 mb-4 text-center">
                Umidade do Solo vs Umidade do Ar (%)
              </h4>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={leituras.reverse()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="umidadeSolo" stroke="#10B981" name="Umidade do Solo" />
                  <Line type="monotone" dataKey="umidadeAr" stroke="#3B82F6" name="Umidade do Ar" />
                </LineChart>
              </ResponsiveContainer>

              {/* Gráfico de Temperatura */}
              <h4 className="text-md sm:text-lg font-semibold text-gray-600 mb-4 mt-8 text-center">
                Temperatura Ambiente (°C)
              </h4>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={leituras}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="temperaturaAmbiente" stroke="#EF4444" name="Temperatura" />
                </LineChart>
              </ResponsiveContainer>
            </>
          ) : (
            !loading && <p className="text-center text-gray-400">
              Nenhum dado disponível para gerar gráficos.
            </p>
          )}
        </div>
      </section>

      {/* Seção de Histórico (Tabela simples para as últimas leituras) */}
      <section className="mb-12 max-w-6xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-700 mb-6 text-center">
          Histórico das Últimas Leituras
        </h2>
        <div className="bg-white rounded-xl shadow-lg p-6 overflow-x-auto border border-gray-200">
          {leituras.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Umidade Solo (%)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Temp. Ar (°C)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Umidade Ar (%)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Chuva
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Válvula
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leituras.map((leitura, index) => (
                  <tr key={leitura.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {leitura.timestamp}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {leitura.umidadeSolo?.toFixed(1) || 'N/A'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {leitura.temperaturaAmbiente?.toFixed(1) || 'N/A'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {leitura.umidadeAr?.toFixed(1) || 'N/A'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {leitura.estaChovendo}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {leitura.valvula ? 'aberta' : 'fechada'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            !loading && <p className="text-center text-gray-400">
              Nenhum histórico de leituras disponível.
            </p>
          )}
        </div>
      </section>

      {/* Rodapé da página */}
      <footer className="text-center mt-12 text-gray-400 text-sm">
        Desenvolvido com React e Firebase.
      </footer>
    </div>
  );
}
