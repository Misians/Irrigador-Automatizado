// src/App.js
import React from 'react';
import './App.css';
import AdicionarLeituraSolo from './AdicionarLeituraSolo';
import ListarLeiturasSolo from './ListaLeiturasSolo';
import GraficosLeituraSolo from './GraficosLeiturta';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <div style={{ display: 'flex', flexDirection: 'row'}}>
          <AdicionarLeituraSolo />
          <hr />
          <ListarLeiturasSolo />
          <hr />
          <GraficosLeituraSolo />
        </div>
      </header>
    </div>
  );
}

export default App;