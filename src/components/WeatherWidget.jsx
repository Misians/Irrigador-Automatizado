import React from 'react';

const WeatherWidget = ({ leitura }) => {
    const temp = leitura?.temperatura || 0;
    const umidadeDoAr = leitura?.umidadeDoAr || 0;
    
    const tempDisplay = (temp === 0) ? 'N/A' : `${parseFloat(temp).toFixed(1)}°C`;
    const umidadeArDisplay = (umidadeDoAr === 0) ? 'N/A' : `${umidadeDoAr.toFixed(1)}%`;

    let weatherText = "Aguardando Leitura";
    let weatherIcon = "fas fa-cloud";
    let weatherColor = "gray-400";
    
    if (temp !== 0) {
        weatherText = (temp > 27) ? "Quente e Seco" : "Agradável";
        weatherIcon = (temp > 27) ? "fas fa-sun sun-icon" : "fas fa-cloud-sun";
        weatherColor = (temp > 27) ? "yellow-400" : "gray-300";
    }

    return (
        <div className="p-6 rounded-2xl flex items-center justify-between mb-12 slide-in-up transition-all duration-500" style={{backgroundColor: 'var(--card-bg-color)', boxShadow: 'var(--card-shadow)', border: 'var(--card-border)', animationDelay: '100ms', backdropFilter: 'blur(10px)'}}>
            <div>
                <p className="text-lg" style={{color: 'var(--text-color-secondary)'}}>Clima Atual (Ambiente)</p>
                <p className="text-5xl font-bold" style={{color: 'var(--text-color-primary)'}}>{tempDisplay}</p>
                <p className={`font-semibold text-${weatherColor}`}>{weatherText} | Umidade Ar: {umidadeArDisplay}</p>
            </div>
            <i className={`${weatherIcon} text-8xl text-${weatherColor}`} style={{filter: 'drop-shadow(0 0 6px currentColor)'}}></i>
        </div>
    );
};

export default WeatherWidget;