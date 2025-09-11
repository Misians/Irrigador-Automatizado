import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase/firebase.config'; // Ensure this path is correct
import './App.css'; // Import the CSS file

function AdicionarLeituraSolo() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [lastReading, setLastReading] = useState(null); // To display the last sent reading
  const intervalRef = useRef(null); // Ref to store the interval ID
  const locationIndexRef = useRef(0); // Ref to keep track of the current location index

  // Predefined locations
  const locations = ["Horta", "Quintal", "Pomar", "Campo", "Estufa"];

  // --- Helper function to generate random float ---
  const getRandomFloat = (min, max, decimals) => {
    const str = (Math.random() * (max - min) + min).toFixed(decimals);
    return parseFloat(str);
  };

  // --- Function to send data to Firestore ---
  const sendRandomReading = async () => {
    setLoading(true);
    setMessage('Enviando nova leitura...');

    // Get the current location and cycle to the next
    const currentLocal = locations[locationIndexRef.current];
    locationIndexRef.current = (locationIndexRef.current + 1) % locations.length;

    // Generate random values
    const umidade = getRandomFloat(30, 90, 1); // Umidade between 30% and 90%
    const ph = getRandomFloat(5.5, 8.0, 2);   // pH between 5.5 and 8.0
    const temperatura = getRandomFloat(15, 35, 1); // Temperatura between 15°C and 35°C

    try {
      const newDocRef = await addDoc(collection(db, 'leiturasSolo'), {
        timestamp: Timestamp.now(),
        umidade: umidade,
        ph: ph,
        temperatura: temperatura,
        localizacao: { nomeLocal: currentLocal },
      });
      setMessage("🎉 Leitura do solo enviada com sucesso!");
      setLastReading({
        id: newDocRef.id,
        timestamp: new Date().toLocaleString(),
        umidade,
        ph,
        temperatura,
        localizacao: { nomeLocal: currentLocal }
      });
    } catch (e) {
      console.error("Erro ao enviar leitura automática: ", e);
      setMessage("Ops! Erro ao enviar leitura automática: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // --- useEffect for setting up and cleaning up the interval ---
  useEffect(() => {
    // Start sending data immediately when component mounts
    sendRandomReading();

    // Set up the interval to send data every 10 seconds (10000 ms)
    intervalRef.current = setInterval(sendRandomReading, 10000); // Changed to 10 seconds for easier testing

    // Cleanup function: clear the interval when the component unmounts
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []); // Empty dependency array means this effect runs once on mount and cleans up on unmount

  return (
    <div className="container adicionar-leitura-container">
      <h3 className="heading">
         Simulador de Leitura do Solo
      </h3>
      <p className="adicionar-leitura-info">
        Enviando leituras automáticas para o Firebase a cada 10 segundos.
      </p>

      {loading && <p className="message message-loading">Processando...</p>}
      {message && <p className={`message ${message.includes("sucesso") ? 'message-success' : 'message-error'}`}>{message}</p>}

      {lastReading && (
        <div className="last-reading-container">
          <h4 className="last-reading-title">
            <span role="img" aria-label="latest reading">✨</span> Última Leitura Enviada:
          </h4>
          <p className="last-reading-item">
            <span className="last-reading-label">Data/Hora:</span> {lastReading.timestamp}
          </p>
          <p className="last-reading-item">
            <span className="last-reading-label">Local:</span> {lastReading.localizacao.nomeLocal}
          </p>
          <p className="last-reading-item">
            <span className="last-reading-label">Umidade:</span> {lastReading.umidade}%
          </p>
          <p className="last-reading-item">
            <span className="last-reading-label">pH:</span> {lastReading.ph}
          </p>
          <p className="last-reading-item">
            <span className="last-reading-label">Temperatura:</span> {lastReading.temperatura}°C
          </p>
          <small className="last-reading-id">ID do Documento: {lastReading.id}</small>
        </div>
      )}
    </div>
  );
}

export default AdicionarLeituraSolo;