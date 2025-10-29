import React, { useEffect, useRef } from 'react';
import { Chart } from 'chart.js/auto'; // Importação moderna, auto-registra tudo

// Configuração do Chart.js (Plugin)
const hoverLinePlugin = {
    id: 'hoverLine',
    afterDraw: chart => {
        if (chart.tooltip?._active?.length) {
            const activePoint = chart.tooltip._active[0];
            const ctx = chart.ctx;
            const x = activePoint.element.x;
            const topY = chart.scales.y.top;
            const bottomY = chart.scales.y.bottom;
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(x, topY);
            ctx.lineTo(x, bottomY);
            ctx.lineWidth = 2;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.restore();
        }
    }
};
Chart.register(hoverLinePlugin); // Registra o plugin globalmente

const ChartComponent = ({ data, label, chartId, colors, isDarkMode }) => {
    const chartRef = useRef(null);
    
    useEffect(() => {
        if (chartRef.current) {
            chartRef.current.destroy();
            chartRef.current = null;
        }
        
        if (data.length === 0) return;

        const labels = data.map(item => new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        const values = data.map(item => item[label]);
        const ctx = document.getElementById(chartId)?.getContext('2d');
        
        if (!ctx) return; 

        const borderGradient = ctx.createLinearGradient(0, 0, 0, 320);
        borderGradient.addColorStop(0, colors[0]);
        borderGradient.addColorStop(1, colors[1]);
        const backgroundGradient = ctx.createLinearGradient(0, 0, 0, 320);
        backgroundGradient.addColorStop(0, `${colors[0]}4D`);
        backgroundGradient.addColorStop(1, `${colors[1]}00`);

        const chartConfig = {
            type: 'line', data: { labels, datasets: [{
                label: label.charAt(0).toUpperCase() + label.slice(1),
                data: values, borderColor: borderGradient, backgroundColor: backgroundGradient, fill: true, tension: 0.4, borderWidth: 3,
                pointRadius: 3, pointBackgroundColor: isDarkMode ? '#1f2937' : '#ffffff', pointBorderColor: colors[0], pointBorderWidth: 2, pointHoverRadius: 6, pointHoverBackgroundColor: colors[0], pointHoverBorderColor: '#ffffff',
            }],
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: false, title: { display: false }, grid: { color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' }, ticks: { color: isDarkMode ? '#9ca3af' : '#4b5563' } }
                    ,
                    x: { title: { display: false }, grid: { display: false }, ticks: { color: isDarkMode ? '#9ca3af' : '#4b5563' } }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: { mode: 'index', intersect: false, backgroundColor: 'rgba(0, 0, 0, 0.8)', titleFont: { size: 16, weight: 'bold' }, bodyFont: { size: 14 }, padding: 12, cornerRadius: 8 }
                }
            }
        };
        
        chartRef.current = new Chart(ctx, chartConfig);
    }, [data, label, chartId, colors, isDarkMode]);
    
    if (data.length === 0) {
        return <div className="h-80 flex items-center justify-center text-gray-500">Aguardando dados históricos do ESP32...</div>;
    }
    return <div className="relative w-full h-80"><canvas id={chartId}></canvas></div>;
};

export default ChartComponent;