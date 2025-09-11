// src/components/ListarLeiturasSolo.js
import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from './firebase/firebase.config';
import './App.css'; // Import the CSS file

function ListarLeiturasSolo() {
  const [leituras, setLeituras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'leiturasSolo'), orderBy('timestamp', 'desc'), limit(10));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const leiturasArray = [];
      querySnapshot.forEach((doc) => {
        leiturasArray.push({ id: doc.id, ...doc.data() });
      });
      setLeituras(leiturasArray);
      setLoading(false);
    }, (err) => {
      console.error("Erro ao puxar leituras:", err);
      setError("❌ Erro ao carregar leituras: " + err.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) return <p className="message message-loading">Carregando leituras...</p>;
  if (error) return <p className="message message-error">{error}</p>;
  if (leituras.length === 0) return <p className="message message-no-data">Nenhuma leitura cadastrada ainda. Que tal adicionar uma?</p>;

  return (
    <div className="container listar-leituras-container">
      <h3 className="heading">
         Últimas Leituras do Solo
      </h3>
      <ul className="leituras-list">
        {leituras.map((leitura) => (
          <li
            key={leitura.id}
            className="leitura-item"
          >
            <p className="item-value">
              <span className="item-title">Data:</span> {leitura.timestamp?.toDate().toLocaleString()}
            </p>
            <p className="item-value">
              <span className="item-title">Umidade:</span> {leitura.umidade}%
            </p>
            <p className="item-value">
              <span className="item-title">pH:</span> {leitura.ph}
            </p>
            <p className="item-value">
              <span className="item-title">Temperatura:</span> {leitura.temperatura}°C
            </p>
            {leitura.localizacao?.nomeLocal && (
              <p className="item-value">
                <span className="item-title">Local:</span> {leitura.localizacao.nomeLocal}
              </p>
            )}
            <small className="item-id">ID: {leitura.id}</small>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ListarLeiturasSolo;