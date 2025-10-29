import React from 'react';

const AgendaCard = ({ horario, condicao, umidadeAtual }) => {
    const match = condicao.match(/< (\d+)/);
    const umidadeLimite = match ? parseFloat(match[1]) : 0;
    
    const isValidUmidade = umidadeAtual !== null && umidadeAtual > 0;
    
    const devePular = isValidUmidade && umidadeAtual > umidadeLimite;
    const cardClasses = "p-4 rounded-lg flex items-center justify-between transition-colors duration-500";
    const lightModeClass = devePular ? 'bg-gray-100' : 'bg-green-50';
    const darkModeClass = 'dark:bg-gray-800/50 ' + (devePular ? 'dark:bg-opacity-50' : 'dark:bg-green-500/10');
    const iconClasses = `fas fa-clock text-2xl mr-4 transition-colors duration-500 ${devePular ? 'text-gray-400' : 'text-green-600 dark:text-green-400'}`;

    return (
        <div className={`${cardClasses} ${lightModeClass} ${darkModeClass}`}>
            <div className="flex items-center">
                <i className={iconClasses}></i>
                <div>
                    <p className="font-bold text-lg" style={{color: 'var(--text-color-primary)'}}>{horario}</p>
                    <p className="text-sm" style={{color: 'var(--text-color-secondary)'}}>{condicao}</p>
                </div>
            </div>
            {!isValidUmidade ? (
                <div className="text-right">
                    <p className="font-bold text-gray-500">N/A</p>
                    <p className="text-xs" style={{color: 'var(--text-color-secondary)'}}>Aguardando leitura</p>
                </div>
            ) : devePular ? (
                <div className="text-right">
                    <p className="font-bold text-yellow-600 dark:text-yellow-400">PULADO</p>
                    <p className="text-xs" style={{color: 'var(--text-color-secondary)'}}>Solo já está úmido</p>
                </div>
            ) : (
                <div className="text-right">
                    <p className="font-bold text-green-700 dark:text-green-400">ATIVO</p>
                    <p className="text-xs" style={{color: 'var(--text-color-secondary)'}}>Irrigação programada</p>
                </div>
            )}
        </div>
    );
};

export default AgendaCard;