import React, { useState, useEffect, useRef } from 'react';
import './index.css';

// 預設設定
const DEFAULT_SETTINGS = {
  work: 25,
  shortBreak: 5,
  longBreak: 15,
  rounds: 4
};

// 音效 (使用 Web Audio API)
const playSound = (frequency = 800, duration = 200) => {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.value = frequency;
  oscillator.type = 'sine';
  
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration / 1000);
};

function App() {
  const [mode, setMode] = useState('work'); // work, shortBreak, longBreak
  const [timeLeft, setTimeLeft] = useState(DEFAULT_SETTINGS.work * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [currentRound, setCurrentRound] = useState(1);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [stats, setStats] = useState({
    completedPomodoros: 0,
    totalWorkTime: 0,
    todayPomodoros: 0
  });
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [quote, setQuote] = useState('');
  
  const intervalRef = useRef(null);

  // 勵志語錄
  const quotes = [
    '專注當下，成就未來 💪',
    '每一個番茄鐘都是進步 🍅',
    '堅持就是勝利 ⭐',
    '休息是為了走更長遠的路 🌟',
    '時間管理就是人生管理 ⏰',
    '保持專注，遠離干擾 🎯',
    '小步快跑，持續前進 🚀',
    '今天的努力，明天的成就 🌈'
  ];

  // 載入數據
  useEffect(() => {
    const savedStats = localStorage.getItem('pomodoroStats');
    const savedTasks = localStorage.getItem('pomodoroTasks');
    if (savedStats) setStats(JSON.parse(savedStats));
    if (savedTasks) setTasks(JSON.parse(savedTasks));
    
    // 隨機顯示語錄
    setQuote(quotes[Math.floor(Math.random() * quotes.length)]);
  }, []);

  // 保存數據
  useEffect(() => {
    localStorage.setItem('pomodoroStats', JSON.stringify(stats));
  }, [stats]);

  useEffect(() => {
    localStorage.setItem('pomodoroTasks', JSON.stringify(tasks));
  }, [tasks]);

  // 計時器
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [isRunning, timeLeft]);

  // 更新頁面標題
  useEffect(() => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    document.title = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} - ${
      mode === 'work' ? '工作中' : '休息中'
    }`;
  }, [timeLeft, mode]);

  // 計時器完成
  const handleTimerComplete = () => {
    playSound(880, 300);
    setTimeout(() => playSound(1047, 300), 350);
    setTimeout(() => playSound(1319, 500), 700);

    if (mode === 'work') {
      setStats(prev => ({
        ...prev,
        completedPomodoros: prev.completedPomodoros + 1,
        todayPomodoros: prev.todayPomodoros + 1,
        totalWorkTime: prev.totalWorkTime + settings.work
      }));

      if (currentRound >= settings.rounds) {
        setMode('longBreak');
        setTimeLeft(settings.longBreak * 60);
        setCurrentRound(1);
      } else {
        setMode('shortBreak');
        setTimeLeft(settings.shortBreak * 60);
        setCurrentRound(prev => prev + 1);
      }
    } else {
      setMode('work');
      setTimeLeft(settings.work * 60);
    }

    setIsRunning(false);
    setQuote(quotes[Math.floor(Math.random() * quotes.length)]);

    // 桌面通知
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('番茄鐘', {
        body: mode === 'work' ? '工作時間結束，休息一下！' : '休息結束，開始工作！',
        icon: '🍅'
      });
    }
  };

  // 開始/暫停
  const toggleTimer = () => {
    if (!isRunning) {
      playSound(600, 100);
      // 請求通知權限
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
    setIsRunning(!isRunning);
  };

  // 重置
  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(settings[mode] * 60);
    playSound(400, 100);
  };

  // 切換模式
  const switchMode = (newMode) => {
    setMode(newMode);
    setIsRunning(false);
    setTimeLeft(settings[newMode] * 60);
    playSound(600, 100);
  };

  // 保存設定
  const saveSettings = (newSettings) => {
    setSettings(newSettings);
    setTimeLeft(newSettings[mode] * 60);
    setIsRunning(false);
    setShowSettings(false);
  };

  // 任務管理
  const addTask = () => {
    if (newTask.trim()) {
      setTasks([...tasks, { id: Date.now(), text: newTask, completed: false }]);
      setNewTask('');
    }
  };

  const toggleTask = (id) => {
    setTasks(tasks.map(task =>
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
  };

  const deleteTask = (id) => {
    setTasks(tasks.filter(task => task.id !== id));
  };

  // 格式化時間
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 計算進度
  const progress = ((settings[mode] * 60 - timeLeft) / (settings[mode] * 60)) * 100;

  return (
    <div className={`min-h-screen transition-colors duration-1000 ${
      mode === 'work' ? 'bg-gradient-to-br from-red-400 to-pink-500' :
      mode === 'shortBreak' ? 'bg-gradient-to-br from-green-400 to-teal-500' :
      'bg-gradient-to-br from-blue-400 to-indigo-500'
    }`}>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2 animate-bounce-slow">🍅 番茄鐘</h1>
          <p className="text-white text-lg opacity-90">{quote}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Timer Section */}
          <div className="md:col-span-2 space-y-6">
            {/* Mode Switcher */}
            <div className="bg-white bg-opacity-20 backdrop-blur-lg rounded-2xl p-4">
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => switchMode('work')}
                  className={`px-6 py-3 rounded-xl font-semibold transition ${
                    mode === 'work'
                      ? 'bg-white text-red-500 shadow-lg'
                      : 'bg-white bg-opacity-30 text-white hover:bg-opacity-40'
                  }`}
                >
                  工作
                </button>
                <button
                  onClick={() => switchMode('shortBreak')}
                  className={`px-6 py-3 rounded-xl font-semibold transition ${
                    mode === 'shortBreak'
                      ? 'bg-white text-green-500 shadow-lg'
                      : 'bg-white bg-opacity-30 text-white hover:bg-opacity-40'
                  }`}
                >
                  短休息
                </button>
                <button
                  onClick={() => switchMode('longBreak')}
                  className={`px-6 py-3 rounded-xl font-semibold transition ${
                    mode === 'longBreak'
                      ? 'bg-white text-blue-500 shadow-lg'
                      : 'bg-white bg-opacity-30 text-white hover:bg-opacity-40'
                  }`}
                >
                  長休息
                </button>
              </div>
            </div>

            {/* Timer Display */}
            <div className="bg-white bg-opacity-20 backdrop-blur-lg rounded-2xl p-12 text-center">
              <div className="relative inline-block">
                {/* Progress Ring */}
                <svg className="transform -rotate-90" width="300" height="300">
                  <circle
                    cx="150"
                    cy="150"
                    r="140"
                    stroke="rgba(255, 255, 255, 0.2)"
                    strokeWidth="12"
                    fill="none"
                  />
                  <circle
                    cx="150"
                    cy="150"
                    r="140"
                    stroke="white"
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 140}`}
                    strokeDashoffset={`${2 * Math.PI * 140 * (1 - progress / 100)}`}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                </svg>

                {/* Time Display */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className={isRunning ? 'animate-pulse-slow' : ''}>
                    <div className="text-7xl font-bold text-white mb-2">
                      {formatTime(timeLeft)}
                    </div>
                    <div className="text-xl text-white opacity-80">
                      第 {currentRound} / {settings.rounds} 輪
                    </div>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex gap-4 justify-center mt-8">
                <button
                  onClick={toggleTimer}
                  className="bg-white text-gray-800 px-8 py-4 rounded-xl font-bold text-lg hover:scale-105 transition shadow-lg"
                >
                  {isRunning ? '⏸️ 暫停' : '▶️ 開始'}
                </button>
                <button
                  onClick={resetTimer}
                  className="bg-white bg-opacity-30 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-opacity-40 transition"
                >
                  🔄 重置
                </button>
                <button
                  onClick={() => setShowSettings(true)}
                  className="bg-white bg-opacity-30 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-opacity-40 transition"
                >
                  ⚙️ 設定
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="bg-white bg-opacity-20 backdrop-blur-lg rounded-2xl p-6">
              <h3 className="text-white font-bold text-xl mb-4">📊 統計</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">{stats.completedPomodoros}</div>
                  <div className="text-white opacity-80 text-sm">總完成數</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">{stats.todayPomodoros}</div>
                  <div className="text-white opacity-80 text-sm">今日完成</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">{stats.totalWorkTime}</div>
                  <div className="text-white opacity-80 text-sm">工作分鐘</div>
                </div>
              </div>
            </div>
          </div>

          {/* Tasks Section */}
          <div className="md:col-span-1">
            <div className="bg-white bg-opacity-20 backdrop-blur-lg rounded-2xl p-6 sticky top-4">
              <h3 className="text-white font-bold text-xl mb-4">📝 任務清單</h3>
              
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addTask()}
                  placeholder="新增任務..."
                  className="flex-1 px-4 py-2 rounded-lg bg-white bg-opacity-30 text-white placeholder-white placeholder-opacity-60 focus:outline-none focus:ring-2 focus:ring-white"
                />
                <button
                  onClick={addTask}
                  className="bg-white text-gray-800 px-4 py-2 rounded-lg font-semibold hover:scale-105 transition"
                >
                  ➕
                </button>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {tasks.length === 0 ? (
                  <p className="text-white opacity-60 text-center py-8">尚無任務</p>
                ) : (
                  tasks.map(task => (
                    <div
                      key={task.id}
                      className="bg-white bg-opacity-20 p-3 rounded-lg flex items-center gap-3 hover:bg-opacity-30 transition"
                    >
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => toggleTask(task.id)}
                        className="w-5 h-5 cursor-pointer"
                      />
                      <span
                        className={`flex-1 text-white ${
                          task.completed ? 'line-through opacity-60' : ''
                        }`}
                      >
                        {task.text}
                      </span>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="text-white hover:text-red-300 transition"
                      >
                        🗑️
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-6">⚙️ 設定</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block font-semibold mb-2">工作時間（分鐘）</label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={settings.work}
                  onChange={(e) => setSettings({ ...settings, work: parseInt(e.target.value) || 25 })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold mb-2">短休息（分鐘）</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={settings.shortBreak}
                  onChange={(e) => setSettings({ ...settings, shortBreak: parseInt(e.target.value) || 5 })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold mb-2">長休息（分鐘）</label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={settings.longBreak}
                  onChange={(e) => setSettings({ ...settings, longBreak: parseInt(e.target.value) || 15 })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold mb-2">番茄鐘輪數</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={settings.rounds}
                  onChange={(e) => setSettings({ ...settings, rounds: parseInt(e.target.value) || 4 })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
              >
                取消
              </button>
              <button
                onClick={() => saveSettings(settings)}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
