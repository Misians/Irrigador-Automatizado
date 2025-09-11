import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from './firebase/firebase.config';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import './App.css'; // Import the CSS file

function GraficosLeituraSolo() {
  const [leituras, setLeituras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Reference to the 'leiturasSolo' collection
    const q = collection(db, 'leiturasSolo');

    // Set up a real-time listener for the collection
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      let leiturasArray = [];
      querySnapshot.forEach((doc) => {
        leiturasArray.push({ id: doc.id, ...doc.data() });
      });

      // Sort data in memory by timestamp in descending order (most recent first)
      leiturasArray.sort((a, b) => b.timestamp.toDate() - a.timestamp.toDate());

      // Take the latest 30 readings for the charts
      const latest30Leituras = leiturasArray.slice(0, 30);

      // Format data for Recharts: convert timestamp to a readable string
      const formattedData = latest30Leituras.map(leitura => ({
        ...leitura,
        // Format date to a more compact string for the X-axis
        timestamp: leitura.timestamp?.toDate().toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        }),
      })).reverse(); // Reverse to show oldest on the left, newest on the right

      setLeituras(formattedData);
      setLoading(false);
    }, (err) => {
      // Handle errors during data fetching
      console.error("Erro ao puxar leituras para gráficos:", err);
      setError("❌ Erro ao carregar dados para gráficos: " + err.message);
      setLoading(false);
    });

    // Clean up the listener when the component unmounts
    return () => unsubscribe();
  }, []); // Empty dependency array means this effect runs once on mount

  // Render loading, error, or no data messages
  if (loading) return <p className="message message-loading">Carregando dados para gráficos...</p>;
  if (error) return <p className="message message-error">{error}</p>;
  if (leituras.length === 0) return <p className="message message-no-data">Nenhum dado de leitura disponível para gerar gráficos. Por favor, adicione algumas leituras!</p>;

  return (
    <div className="container graficos-container">
      <h3 className="heading">
         Gráficos de Leituras do Solo
      </h3>

      {/* Umidade Chart */}
      <div className="chart-container">
        <h4 className="chart-title">Umidade do Solo (%)</h4>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={leituras}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis dataKey="timestamp" angle={-45} textAnchor="end" height={80} interval="preserveStartEnd" />
            <YAxis label={{ value: 'Umidade (%)', angle: -90, position: 'insideLeft' }} />
            <Tooltip
              formatter={(value) => [`${value}%`, 'Umidade']}
              labelFormatter={(label) => `Data: ${label}`}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="umidade"
              stroke="#28a745" // Green color for humidity
              activeDot={{ r: 8 }}
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* pH Chart */}
      <div className="chart-container">
        <h4 className="chart-title">pH do Solo</h4>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={leituras}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis dataKey="timestamp" angle={-45} textAnchor="end" height={80} interval="preserveStartEnd" />
            <YAxis label={{ value: 'pH', angle: -90, position: 'insideLeft' }} />
            <Tooltip
              formatter={(value) => [value, 'pH']}
              labelFormatter={(label) => `Data: ${label}`}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="ph"
              stroke="#007bff" // Blue color for pH
              activeDot={{ r: 8 }}
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Temperatura Chart */}
      <div className="chart-container">
        <h4 className="chart-title">Temperatura do Solo (°C)</h4>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={leituras}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis dataKey="timestamp" angle={-45} textAnchor="end" height={80} interval="preserveStartEnd" />
            <YAxis label={{ value: 'Temperatura (°C)', angle: -90, position: 'insideLeft' }} />
            <Tooltip
              formatter={(value) => [`${value}°C`, 'Temperatura']}
              labelFormatter={(label) => `Data: ${label}`}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="temperatura"
              stroke="#dc3545" // Red color for temperature
              activeDot={{ r: 8 }}
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default GraficosLeituraSolo;