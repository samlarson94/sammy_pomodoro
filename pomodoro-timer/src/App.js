import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import SpaceBackground from './SpaceBackground';

function App() {
  // Timer states
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60); // seconds for default focus session
  const [sessionType, setSessionType] = useState('focus'); // "focus", "shortBreak", "longBreak"
  const [cycleCount, setCycleCount] = useState(0);
  
  // Custom timer mode states
  const [customMode, setCustomMode] = useState(false);
  const [customTime, setCustomTime] = useState({ hours: 0, minutes: 25 });
  
  const timerRef = useRef(null);
  const audioRef = useRef(new Audio('/sounds/ding.mp3'));
  const tickCountRef = useRef(0);
  const tickTimerRef = useRef(null);
  const audioContextRef = useRef(null);
  const oscillatorRef = useRef(null);
  const gainNodeRef = useRef(null);

  // Initialize audio context
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    gainNodeRef.current = audioContextRef.current.createGain();
    gainNodeRef.current.gain.value = 0.1; // Set volume to 10%
    gainNodeRef.current.connect(audioContextRef.current.destination);
  }, []);

  // Play tick sound
  const playTick = () => {
    if (audioContextRef.current) {
      oscillatorRef.current = audioContextRef.current.createOscillator();
      oscillatorRef.current.type = 'sine';
      oscillatorRef.current.frequency.setValueAtTime(800, audioContextRef.current.currentTime);
      oscillatorRef.current.connect(gainNodeRef.current);
      oscillatorRef.current.start();
      oscillatorRef.current.stop(audioContextRef.current.currentTime + 0.1); // Very short tick
    }
  };

  // Update document title with timer
  useEffect(() => {
    if (isRunning) {
      const minutes = Math.floor(timeLeft / 60);
      const seconds = timeLeft % 60;
      const sessionName = customMode ? 'Custom Timer' : 
                         sessionType === 'focus' ? 'Focus' :
                         sessionType === 'shortBreak' ? 'Short Break' : 'Long Break';
      document.title = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} - ${sessionName}`;
    } else {
      document.title = 'Pomodoro Timer';
    }
  }, [timeLeft, isRunning, sessionType, customMode]);

  // Timer effect – runs when isRunning changes
  useEffect(() => {
    if (isRunning) {
      // Play ticking sound for first 3 seconds
      if (tickCountRef.current < 3) {
        playTick();
        tickCountRef.current++;
        
        // Set up tick timer
        tickTimerRef.current = setInterval(() => {
          if (tickCountRef.current < 3) {
            playTick();
            tickCountRef.current++;
          } else {
            clearInterval(tickTimerRef.current);
          }
        }, 1000);
      }

      timerRef.current = setInterval(() => {
        setTimeLeft(prevTime => {
          if (prevTime <= 1) {
            clearInterval(timerRef.current);
            handleSessionEnd();
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    } else {
      // Clear all timers when timer stops
      clearInterval(timerRef.current);
      clearInterval(tickTimerRef.current);
      tickCountRef.current = 0;
    }
    return () => {
      clearInterval(timerRef.current);
      clearInterval(tickTimerRef.current);
    };
  }, [isRunning]);

  // Play sound effect
  const playSound = () => {
    audioRef.current.currentTime = 0;
    audioRef.current.play();
  };

  // Handle what happens when a session ends
  const handleSessionEnd = () => {
    playSound();
    if (!customMode) {
      // Default Pomodoro flow
      if (sessionType === 'focus') {
        // Check if current cycle (0-indexed) is below 3 (4th cycle at index 3)
        if (cycleCount < 3) {
          setSessionType('shortBreak');
          setTimeLeft(5 * 60);
          setCycleCount(cycleCount + 1);
        } else {
          // After completing four focus sessions, trigger a long break
          setSessionType('longBreak');
          setTimeLeft(20 * 60);
          setCycleCount(0);
        }
      } else {
        // When break is finished, go to a new focus session
        setSessionType('focus');
        setTimeLeft(25 * 60);
      }
    } else {
      // In custom mode, simply restart the timer with the custom time
      const totalCustomSeconds = customTime.hours * 3600 + customTime.minutes * 60;
      setTimeLeft(totalCustomSeconds);
    }
    setIsRunning(false);
  };

  // Start the timer
  const startTimer = () => {
    if (!isRunning) {
      setIsRunning(true);
      tickCountRef.current = 0; 
    }
  };

  // Stop the timer
  const stopTimer = () => {
    setIsRunning(false);
    clearInterval(timerRef.current);
    clearInterval(tickTimerRef.current);
    tickCountRef.current = 0;
  };

  // Restart the timer (resets the current session)
  const restartTimer = () => {
    stopTimer();
    if (!customMode) {
      if (sessionType === 'focus') {
        setTimeLeft(25 * 60);
      } else if (sessionType === 'shortBreak') {
        setTimeLeft(5 * 60);
      } else if (sessionType === 'longBreak') {
        setTimeLeft(20 * 60);
      }
    } else {
      const totalCustomSeconds = customTime.hours * 3600 + customTime.minutes * 60;
      setTimeLeft(totalCustomSeconds);
    }
  };

  // Utility function to format seconds into MM:SS
  const formatTime = (secs) => {
    const minutes = Math.floor(secs / 60);
    const seconds = secs % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Handle changes in custom time inputs
  const handleCustomTimeChange = (e) => {
    const { name, value } = e.target;
    let val = parseInt(value);
    if (name === "hours") {
      if (val > 10) val = 10; // maximum of 10 hours
      setCustomTime(prev => ({ ...prev, hours: val }));
    } else {
      if (val > 59) val = 59;
      setCustomTime(prev => ({ ...prev, minutes: val }));
    }
  };

  // Update the timer display when switching between modes
  useEffect(() => {
    if (customMode) {
      const totalCustomSeconds = customTime.hours * 3600 + customTime.minutes * 60;
      setTimeLeft(totalCustomSeconds);
    } else {
      // Reset to default pomodoro session when exiting custom mode
      setSessionType('focus');
      setTimeLeft(25 * 60);
      setCycleCount(0);
    }
  }, [customMode, customTime]);

  return (
    <>
      <SpaceBackground />
      <div className={`app-container ${!isRunning ? 'inactive' : ''} ${isRunning && sessionType === 'focus' ? 'work-mode' : ''} ${isRunning && (sessionType === 'shortBreak' || sessionType === 'longBreak') ? 'break-mode' : ''}`}>
        <h1>Pomodoro Timer</h1>
        
        <div className="mode-toggle">
          <button 
            className="mode-button"
            onClick={() => setCustomMode(!customMode)}
          >
            {customMode ? 'Preset' : 'Custom Timer'}
          </button>
        </div>

        {customMode ? (
          <>
            <div className="timer-display">
              <span>{formatTime(timeLeft)}</span>
            </div>
            
            <div className="custom-settings">
              <div className="input-group">
                <label>Hours:</label>
                <input 
                  type="number" 
                  name="hours" 
                  min="0" 
                  max="10"
                  value={customTime.hours} 
                  onChange={handleCustomTimeChange} 
                />
              </div>
              <div className="input-group">
                <label>Minutes:</label>
                <input 
                  type="number" 
                  name="minutes" 
                  min="0" 
                  max="59"
                  value={customTime.minutes} 
                  onChange={handleCustomTimeChange} 
                />
              </div>
            </div>
          </>
        ) : (
          <div className="timer-display">
            <span>{formatTime(timeLeft)}</span>
          </div>
        )}
        
        <div className="controls">
          <button onClick={startTimer}>Start</button>
          <button onClick={stopTimer}>Stop</button>
          <button onClick={restartTimer}>Restart</button>
        </div>

        {!customMode && (
          <div className="session-info">
            <p>
              Session: {sessionType === 'focus'
                ? "Focus Session"
                : sessionType === 'shortBreak'
                ? "Short Break"
                : "Long Break"}
            </p>
            <p>Cycle: {sessionType !== 'longBreak' ? cycleCount + 1 : "Completed"}</p>
          </div>
        )}

        <footer className="footer-text" style={{marginTop: '-.5rem'}}>
          {!isRunning ? (
             <div style={{display: 'flex', flexDirection: 'column'}}>
              <p>Time to Lock In</p>
              <p style={{marginTop: '-.5rem'}}>⚡</p>
           </div>
          ) : sessionType === 'focus' ? (
            <div style={{display: 'flex', flexDirection: 'column'}}>
              <p>Heads Down</p>
              <p style={{marginTop: '-.5rem'}}>🔨</p>
            </div>
          ) : (
            <div style={{display: 'flex', flexDirection: 'column'}}>
              <p>Chill Time</p>
              <p style={{marginTop: '-.5rem'}}>🌴</p>
            </div>
          )}
        </footer>
      </div>
    </>
  );
}

export default App;
