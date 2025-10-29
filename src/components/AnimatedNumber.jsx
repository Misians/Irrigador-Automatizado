import React from 'react';
import useCountUp from '../hooks/useCountUp';

const AnimatedNumber = ({ value, unit, precision = 1 }) => {
    const count = useCountUp(value || 0);
    const displayValue = (value === null || value === 0) ? 'N/A' : count.toFixed(precision);
    const displayUnit = (value === null || value === 0) ? '' : unit;
    
    return <p className="text-5xl font-bold mt-2" style={{color: 'var(--text-color-primary)'}}>{displayValue}{displayUnit}</p>;
};

export default AnimatedNumber;