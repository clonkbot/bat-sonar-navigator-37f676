import { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';

interface DetectedObject {
  id: number;
  angle: number;
  distance: number;
  size: number;
  timestamp: number;
}

interface SonarPulse {
  id: number;
  timestamp: number;
}

function App() {
  const [isActive, setIsActive] = useState(false);
  const [pulses, setPulses] = useState<SonarPulse[]>([]);
  const [detectedObjects, setDetectedObjects] = useState<DetectedObject[]>([]);
  const [sweepAngle, setSweepAngle] = useState(0);
  const [echoIntensity, setEchoIntensity] = useState(0);
  const [scanCount, setScanCount] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const pulseIdRef = useRef(0);
  const objectIdRef = useRef(0);

  const createSonarSound = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    const ctx = audioContextRef.current;

    // Create ping sound
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.setValueAtTime(1200, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.15);

    // Create echo sound after delay
    setTimeout(() => {
      if (!audioContextRef.current) return;
      const echoOsc = ctx.createOscillator();
      const echoGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      echoOsc.connect(filter);
      filter.connect(echoGain);
      echoGain.connect(ctx.destination);

      filter.type = 'lowpass';
      filter.frequency.value = 600;

      echoOsc.frequency.setValueAtTime(600, ctx.currentTime);
      echoOsc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.2);

      echoGain.gain.setValueAtTime(0.15, ctx.currentTime);
      echoGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

      echoOsc.start(ctx.currentTime);
      echoOsc.stop(ctx.currentTime + 0.3);

      setEchoIntensity(1);
      setTimeout(() => setEchoIntensity(0), 300);
    }, 100 + Math.random() * 200);
  }, []);

  const emitPulse = useCallback(() => {
    const newPulse: SonarPulse = {
      id: pulseIdRef.current++,
      timestamp: Date.now()
    };
    setPulses(prev => [...prev, newPulse]);
    createSonarSound();
    setScanCount(prev => prev + 1);

    // Simulate detecting random objects
    if (Math.random() > 0.4) {
      const newObject: DetectedObject = {
        id: objectIdRef.current++,
        angle: Math.random() * 360,
        distance: 20 + Math.random() * 35,
        size: 3 + Math.random() * 8,
        timestamp: Date.now()
      };
      setTimeout(() => {
        setDetectedObjects(prev => [...prev.slice(-15), newObject]);
      }, 500 + Math.random() * 1000);
    }

    // Clean up old pulses
    setTimeout(() => {
      setPulses(prev => prev.filter(p => p.id !== newPulse.id));
    }, 2500);
  }, [createSonarSound]);

  useEffect(() => {
    if (!isActive) return;

    const pulseInterval = setInterval(emitPulse, 2000);
    emitPulse(); // Initial pulse

    return () => clearInterval(pulseInterval);
  }, [isActive, emitPulse]);

  useEffect(() => {
    if (!isActive) return;

    const sweepInterval = setInterval(() => {
      setSweepAngle(prev => (prev + 2) % 360);
    }, 30);

    return () => clearInterval(sweepInterval);
  }, [isActive]);

  // Clean old detected objects
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      setDetectedObjects(prev => prev.filter(obj => now - obj.timestamp < 8000));
    }, 1000);
    return () => clearInterval(cleanup);
  }, []);

  const getObjectOpacity = (timestamp: number) => {
    const age = Date.now() - timestamp;
    return Math.max(0, 1 - age / 8000);
  };

  return (
    <div className="app">
      <div className="scan-lines" />
      <div className="vignette" />

      <header className="header">
        <div className="status-indicator">
          <span className={`status-dot ${isActive ? 'active' : ''}`} />
          <span className="status-text">{isActive ? 'SCANNING' : 'STANDBY'}</span>
        </div>
        <div className="header-center">
          <h1 className="title">ECHOLOCATION SONAR</h1>
          <p className="subtitle">BAT NAVIGATION SYSTEM</p>
        </div>
        <div className="scan-counter">
          <span className="counter-label">PULSES</span>
          <span className="counter-value">{String(scanCount).padStart(4, '0')}</span>
        </div>
      </header>

      <main className="main">
        <div className="sonar-container">
          {/* Grid lines */}
          <div className="grid-overlay" />

          {/* Distance rings */}
          <div className="distance-ring ring-1">
            <span className="ring-label">10m</span>
          </div>
          <div className="distance-ring ring-2">
            <span className="ring-label">25m</span>
          </div>
          <div className="distance-ring ring-3">
            <span className="ring-label">40m</span>
          </div>
          <div className="distance-ring ring-4">
            <span className="ring-label">55m</span>
          </div>

          {/* Sweep line */}
          {isActive && (
            <div
              className="sweep-line"
              style={{ transform: `rotate(${sweepAngle}deg)` }}
            >
              <div className="sweep-glow" />
            </div>
          )}

          {/* Sonar pulses */}
          {pulses.map(pulse => (
            <div key={pulse.id} className="pulse-wave" />
          ))}

          {/* Center emitter (bat icon area) */}
          <div className={`center-emitter ${isActive ? 'active' : ''} ${echoIntensity > 0 ? 'echo' : ''}`}>
            <div className="emitter-core" />
            <div className="emitter-ring" />
            <div className="emitter-ring ring-2" />
            <div className="bat-icon">
              <svg viewBox="0 0 64 64" fill="currentColor">
                <path d="M32 20c-2 0-4 1-5 3l-12-8c-4-2-8-1-10 2 2 4 6 6 10 6l-8 8c-4 4-4 10 0 14 4-2 8-6 10-10l6 10c1 2 3 3 5 3h8c2 0 4-1 5-3l6-10c2 4 6 8 10 10 4-4 4-10 0-14l-8-8c4 0 8-2 10-6-2-3-6-4-10-2l-12 8c-1-2-3-3-5-3z"/>
                <circle cx="28" cy="26" r="2"/>
                <circle cx="36" cy="26" r="2"/>
              </svg>
            </div>
          </div>

          {/* Detected objects */}
          {detectedObjects.map(obj => (
            <div
              key={obj.id}
              className="detected-object"
              style={{
                '--angle': `${obj.angle}deg`,
                '--distance': `${obj.distance}%`,
                '--size': `${obj.size}px`,
                opacity: getObjectOpacity(obj.timestamp)
              } as React.CSSProperties}
            >
              <div className="object-ping" />
            </div>
          ))}

          {/* Direction markers */}
          <div className="direction-marker north">N</div>
          <div className="direction-marker east">E</div>
          <div className="direction-marker south">S</div>
          <div className="direction-marker west">W</div>
        </div>

        <div className="info-panel">
          <div className="panel-section">
            <h3>DETECTED OBJECTS</h3>
            <div className="object-count">{detectedObjects.length}</div>
          </div>
          <div className="panel-section">
            <h3>ECHO STRENGTH</h3>
            <div className="echo-bars">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className={`echo-bar ${detectedObjects.length > i * 2 ? 'active' : ''}`}
                  style={{ animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
          </div>
          <div className="panel-section frequency">
            <h3>FREQUENCY</h3>
            <div className="freq-display">
              <span className="freq-value">42</span>
              <span className="freq-unit">kHz</span>
            </div>
          </div>
        </div>
      </main>

      <div className="controls">
        <button
          className={`scan-button ${isActive ? 'active' : ''}`}
          onClick={() => setIsActive(!isActive)}
        >
          <span className="button-icon">{isActive ? '◼' : '▶'}</span>
          <span className="button-text">{isActive ? 'CEASE SCAN' : 'INITIATE SONAR'}</span>
        </button>
        <p className="instruction">
          {isActive
            ? 'Sonar pulses emitting... detecting obstacles'
            : 'Activate echolocation for spatial awareness'}
        </p>
      </div>

      <footer className="footer">
        <span>Requested by @aiob_me · Built by @clonkbot</span>
      </footer>
    </div>
  );
}

export default App;
