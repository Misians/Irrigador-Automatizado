import { useState, useEffect } from 'react';

// Hook para animação de contagem (CountUp)
const useCountUp = (end, duration = 1500) => {
    const [count, setCount] = useState(0);
    useEffect(() => {
        let frame = 0;
        const frameRate = 1000 / 60;
        const totalFrames = Math.round(duration / frameRate);
        const counter = setInterval(() => {
            frame++;
            const progress = frame / totalFrames;
            setCount(end * progress);
            if (frame === totalFrames) { clearInterval(counter); setCount(end); }
        }, frameRate);
        return () => clearInterval(counter);
    }, [end, duration]);
    return count;
};

export default useCountUp;