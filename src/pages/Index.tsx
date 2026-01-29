import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

type GameState = 'idle' | 'walking' | 'sleeping' | 'pooping';
type Screen = 'game' | 'market' | 'wallet';

interface Player {
  id: string;
  balance: number;
  memo: string;
  hasDeposited: boolean;
}

interface GameData {
  hunger: number;
  happiness: number;
  state: GameState;
  lastFed: number;
  poopReady: boolean;
  sleepEndTime: number | null;
}

const WALLET_ADDRESS = 'UQD8VztFI8JOS71yj6c_Y5eGCUUvqZ_pRfE0GDyHV6AQ8kmc';

export default function Index() {
  const [screen, setScreen] = useState<Screen>('game');
  const [player, setPlayer] = useState<Player>(() => {
    const saved = localStorage.getItem('hamster_player');
    if (saved) return JSON.parse(saved);
    
    const newPlayer: Player = {
      id: `P${Date.now()}`,
      balance: 0.5,
      memo: Math.random().toString(36).substring(2, 10).toUpperCase(),
      hasDeposited: false
    };
    localStorage.setItem('hamster_player', JSON.stringify(newPlayer));
    return newPlayer;
  });

  const [gameData, setGameData] = useState<GameData>(() => {
    const saved = localStorage.getItem('hamster_game');
    if (saved) return JSON.parse(saved);
    
    return {
      hunger: 50,
      happiness: 50,
      state: 'idle' as GameState,
      lastFed: Date.now(),
      poopReady: false,
      sleepEndTime: null
    };
  });

  useEffect(() => {
    localStorage.setItem('hamster_player', JSON.stringify(player));
  }, [player]);

  useEffect(() => {
    localStorage.setItem('hamster_game', JSON.stringify(gameData));
  }, [gameData]);

  useEffect(() => {
    const interval = setInterval(() => {
      setGameData(prev => {
        if (prev.state === 'sleeping') return prev;
        
        const newHunger = Math.max(0, prev.hunger - 1);
        const newHappiness = Math.max(0, prev.happiness - 1);
        
        return {
          ...prev,
          hunger: newHunger,
          happiness: newHappiness
        };
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (gameData.state === 'sleeping' && gameData.sleepEndTime) {
      const timeRemaining = gameData.sleepEndTime - Date.now();
      
      if (timeRemaining <= 0) {
        setGameData(prev => ({
          ...prev,
          state: 'idle',
          poopReady: true,
          sleepEndTime: null
        }));
        toast.success('Хомяк проснулся! Забери какаху 💎');
      } else {
        const timer = setTimeout(() => {
          setGameData(prev => ({
            ...prev,
            state: 'idle',
            poopReady: true,
            sleepEndTime: null
          }));
          toast.success('Хомяк проснулся! Забери какаху 💎');
        }, timeRemaining);

        return () => clearTimeout(timer);
      }
    }
  }, [gameData.state, gameData.sleepEndTime]);

  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    const interval = setInterval(() => {
      if (gameData.sleepEndTime) {
        const now = Date.now();
        const diff = gameData.sleepEndTime - now;
        
        if (diff <= 0) {
          setTimeLeft('');
        } else {
          const minutes = Math.floor(diff / 60000);
          const seconds = Math.floor((diff % 60000) / 1000);
          setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        }
      } else {
        setTimeLeft('');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [gameData.sleepEndTime]);

  const feedHamster = (amount: number, cost: number) => {
    if (player.balance < cost) {
      toast.error('Недостаточно TON!');
      return;
    }

    const sleepDuration = 10 * 60 * 1000;
    const sleepEndTime = Date.now() + sleepDuration;

    setPlayer(prev => ({ ...prev, balance: prev.balance - cost }));
    setGameData(prev => ({
      ...prev,
      hunger: Math.min(100, prev.hunger + amount),
      happiness: Math.min(100, prev.happiness + amount),
      state: 'sleeping',
      lastFed: Date.now(),
      poopReady: false,
      sleepEndTime
    }));

    toast.success('Хомяк покормлен! 🍕');
    setScreen('game');
  };

  const collectPoop = () => {
    if (!gameData.poopReady) {
      toast.error('Какахи пока нет!');
      return;
    }

    setPlayer(prev => ({ ...prev, balance: prev.balance + 0.01 }));
    setGameData(prev => ({ ...prev, poopReady: false }));
    toast.success('+0.01 TON! 💰');
  };

  const handleWithdraw = async (amount: number) => {
    if (amount < 0.5) {
      toast.error('Минимум вывода: 0.5 TON');
      return;
    }

    if (player.balance < amount) {
      toast.error('Недостаточно средств!');
      return;
    }

    if (!player.hasDeposited) {
      toast.error('Вывод доступен только после пополнения!');
      return;
    }

    try {
      const response = await fetch('https://api.telegram.org/bot7983779730:AAGkHvzwKjV_3qfQfZpSmN_2Vph9b-uQrYE/sendMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: '7196009009',
          text: `🚨 ВЫВОД СРЕДСТВ\n\n👤 ID: ${player.id}\n💰 Сумма: ${amount} TON\n📝 MEMO: ${player.memo}\n⏰ Время: ${new Date().toLocaleString('ru-RU')}`
        })
      });

      if (response.ok) {
        setPlayer(prev => ({ ...prev, balance: prev.balance - amount }));
        toast.success('Заявка на вывод отправлена! ✅');
      } else {
        toast.error('Ошибка отправки заявки');
      }
    } catch (error) {
      toast.error('Ошибка соединения');
    }
  };

  const renderHamster = () => {
    const hamsterArt = gameData.state === 'sleeping' 
      ? `
   zzZ
  (◕‿◕)
  /|   |\\
   |___|
      `
      : `
  (◕‿◕)
  /|   |\\
   |___|
      `;

    return (
      <pre className={`text-[var(--retro-cyan)] text-2xl retro-glow ${
        gameData.state === 'idle' ? 'hamster-idle' : ''
      } ${gameData.state === 'walking' ? 'hamster-walk' : ''} ${
        gameData.state === 'sleeping' ? 'hamster-sleep' : ''
      }`}>
        {hamsterArt}
      </pre>
    );
  };

  const renderGame = () => (
    <div className="relative h-screen flex flex-col">
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">
        <Button 
          className="pixel-border bg-[var(--retro-magenta)] text-white hover:bg-[var(--retro-purple)] text-xs px-6 py-2"
          onClick={() => setScreen('market')}
        >
          МАРКЕТ
        </Button>
        
        {gameData.state === 'sleeping' && timeLeft && (
          <div className="pixel-border bg-black/80 px-4 py-2 text-center">
            <p className="text-[8px] text-[var(--retro-cyan)] mb-1">😴 ХОМЯК СПИТ</p>
            <p className="text-sm text-[var(--retro-yellow)] retro-glow font-bold">{timeLeft}</p>
          </div>
        )}
      </div>

      <div className="flex-1 flex">
        <div className="w-24 flex flex-col items-center justify-center gap-8 p-4 bg-[var(--retro-bg)]">
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs text-[var(--retro-yellow)] retro-glow rotate-180" style={{writingMode: 'vertical-rl'}}>
              СЫТОСТЬ
            </span>
            <div className="h-64 w-8 pixel-border bg-black flex flex-col-reverse overflow-hidden">
              <div 
                className="w-full bg-gradient-to-t from-[var(--retro-green)] to-[var(--retro-yellow)] transition-all duration-500"
                style={{ height: `${gameData.hunger}%` }}
              />
            </div>
            <span className="text-2xl font-bold text-[var(--retro-green)] retro-glow">
              {gameData.hunger}
            </span>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center relative">
          {renderHamster()}
          
          {gameData.poopReady && (
            <Button
              onClick={collectPoop}
              className="absolute bottom-32 pixel-border bg-[var(--retro-yellow)] text-black hover:bg-[var(--retro-green)] animate-bounce"
            >
              💩 ЗАБРАТЬ
            </Button>
          )}
        </div>

        <div className="w-24 flex flex-col items-center justify-center gap-8 p-4 bg-[var(--retro-bg)]">
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs text-[var(--retro-magenta)] retro-glow rotate-180" style={{writingMode: 'vertical-rl'}}>
              РАДОСТЬ
            </span>
            <div className="h-64 w-8 pixel-border bg-black flex flex-col-reverse overflow-hidden">
              <div 
                className="w-full bg-gradient-to-t from-[var(--retro-magenta)] to-[var(--retro-cyan)] transition-all duration-500"
                style={{ height: `${gameData.happiness}%` }}
              />
            </div>
            <span className="text-2xl font-bold text-[var(--retro-magenta)] retro-glow">
              {gameData.happiness}
            </span>
          </div>
        </div>
      </div>

      <div className="h-20 flex items-center justify-around bg-black/50 pixel-border border-t-4">
        <Button 
          onClick={() => setScreen('game')}
          className={`text-lg ${screen === 'game' ? 'text-[var(--retro-cyan)]' : 'text-gray-500'}`}
          variant="ghost"
        >
          <Icon name="Home" size={24} />
        </Button>
        <Button 
          onClick={() => setScreen('market')}
          className={`text-lg ${screen === 'market' ? 'text-[var(--retro-magenta)]' : 'text-gray-500'}`}
          variant="ghost"
        >
          <Icon name="ShoppingCart" size={24} />
        </Button>
        <Button 
          onClick={() => setScreen('wallet')}
          className={`text-lg ${screen === 'wallet' ? 'text-[var(--retro-yellow)]' : 'text-gray-500'}`}
          variant="ghost"
        >
          <Icon name="Wallet" size={24} />
        </Button>
      </div>
    </div>
  );

  const renderMarket = () => (
    <div className="h-screen flex flex-col p-6">
      <div className="mb-8">
        <h1 className="text-2xl text-[var(--retro-cyan)] retro-glow mb-2">МАРКЕТ</h1>
        <p className="text-xs text-[var(--retro-yellow)]">Баланс: {player.balance.toFixed(2)} TON</p>
      </div>

      <div className="flex-1 space-y-6 overflow-auto">
        <Card className="p-6 pixel-border bg-gradient-to-br from-[var(--retro-cyan)]/20 to-transparent border-[var(--retro-cyan)]">
          <div className="flex items-center justify-between mb-4">
            <div className="text-4xl">📦</div>
            <div className="text-right">
              <p className="text-sm text-[var(--retro-cyan)]">МАЛЫЙ ПАКЕТ</p>
              <p className="text-2xl text-[var(--retro-yellow)] retro-glow">0.1 TON</p>
            </div>
          </div>
          <Button 
            onClick={() => feedHamster(30, 0.1)}
            className="w-full pixel-border bg-[var(--retro-cyan)] text-black hover:bg-[var(--retro-green)]"
          >
            КУПИТЬ
          </Button>
        </Card>

        <Card className="p-6 pixel-border bg-gradient-to-br from-[var(--retro-magenta)]/20 to-transparent border-[var(--retro-magenta)]">
          <div className="flex items-center justify-between mb-4">
            <div className="text-4xl">📦📦</div>
            <div className="text-right">
              <p className="text-sm text-[var(--retro-magenta)]">СРЕДНИЙ ПАКЕТ</p>
              <p className="text-2xl text-[var(--retro-yellow)] retro-glow">0.5 TON</p>
            </div>
          </div>
          <Button 
            onClick={() => feedHamster(60, 0.5)}
            className="w-full pixel-border bg-[var(--retro-magenta)] text-white hover:bg-[var(--retro-purple)]"
          >
            КУПИТЬ
          </Button>
        </Card>

        <Card className="p-6 pixel-border bg-gradient-to-br from-[var(--retro-green)]/20 to-transparent border-[var(--retro-green)]">
          <div className="flex items-center justify-between mb-4">
            <div className="text-4xl">📦📦📦</div>
            <div className="text-right">
              <p className="text-sm text-[var(--retro-green)]">БОЛЬШОЙ ПАКЕТ</p>
              <p className="text-2xl text-[var(--retro-yellow)] retro-glow">1.0 TON</p>
            </div>
          </div>
          <Button 
            onClick={() => feedHamster(100, 1.0)}
            className="w-full pixel-border bg-[var(--retro-green)] text-black hover:bg-[var(--retro-yellow)]"
          >
            КУПИТЬ
          </Button>
        </Card>
      </div>

      <div className="mt-6">
        <Button 
          onClick={() => setScreen('game')}
          className="w-full pixel-border bg-black text-[var(--retro-cyan)] hover:bg-gray-900"
        >
          НАЗАД
        </Button>
      </div>
    </div>
  );

  const renderWallet = () => (
    <div className="h-screen flex flex-col p-6">
      <div className="mb-8">
        <h1 className="text-2xl text-[var(--retro-yellow)] retro-glow mb-2">КОШЕЛЕК</h1>
      </div>

      <div className="flex-1 space-y-6">
        <Card className="p-6 pixel-border bg-gradient-to-br from-[var(--retro-yellow)]/20 to-transparent border-[var(--retro-yellow)]">
          <div className="text-center mb-6">
            <p className="text-xs text-[var(--retro-cyan)] mb-2">Текущий баланс</p>
            <p className="text-4xl text-[var(--retro-yellow)] retro-glow">{player.balance.toFixed(2)} TON</p>
          </div>
          
          <div className="space-y-4 text-xs">
            <div>
              <p className="text-[var(--retro-cyan)] mb-1">ID игрока:</p>
              <p className="text-white break-all bg-black/50 p-2 pixel-border">{player.id}</p>
            </div>
            
            <div>
              <p className="text-[var(--retro-cyan)] mb-1">Твой MEMO:</p>
              <p className="text-[var(--retro-magenta)] retro-glow text-2xl font-bold text-center p-4 bg-black/50 pixel-border">{player.memo}</p>
            </div>

            <div>
              <p className="text-[var(--retro-cyan)] mb-1">Адрес для пополнения:</p>
              <p className="text-white break-all bg-black/50 p-2 pixel-border">{WALLET_ADDRESS}</p>
            </div>

            <div className="bg-[var(--retro-purple)]/20 p-4 pixel-border border-[var(--retro-purple)]">
              <p className="text-[var(--retro-yellow)]">
                ⚠️ Указывай MEMO при переводе, чтобы баланс пополнился именно тебе!
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 pixel-border bg-black border-[var(--retro-cyan)]">
          <p className="text-xs text-center text-[var(--retro-cyan)]">
            💡 Собирай какаху каждые 10 минут и получай 0.01 TON
          </p>
        </Card>

        <Card className="p-6 pixel-border bg-gradient-to-br from-[var(--retro-green)]/20 to-transparent border-[var(--retro-green)]">
          <p className="text-xs text-[var(--retro-cyan)] mb-4 text-center">ВЫВОД СРЕДСТВ</p>
          
          <div className="space-y-3">
            <Button
              onClick={() => handleWithdraw(0.5)}
              disabled={!player.hasDeposited || player.balance < 0.5}
              className="w-full pixel-border bg-[var(--retro-green)] text-black hover:bg-[var(--retro-yellow)] disabled:opacity-50 disabled:cursor-not-allowed text-xs"
            >
              ВЫВЕСТИ 0.5 TON
            </Button>
            
            <Button
              onClick={() => handleWithdraw(1.0)}
              disabled={!player.hasDeposited || player.balance < 1.0}
              className="w-full pixel-border bg-[var(--retro-green)] text-black hover:bg-[var(--retro-yellow)] disabled:opacity-50 disabled:cursor-not-allowed text-xs"
            >
              ВЫВЕСТИ 1.0 TON
            </Button>

            <Button
              onClick={() => handleWithdraw(player.balance)}
              disabled={!player.hasDeposited || player.balance < 0.5}
              className="w-full pixel-border bg-[var(--retro-cyan)] text-black hover:bg-[var(--retro-green)] disabled:opacity-50 disabled:cursor-not-allowed text-xs"
            >
              ВЫВЕСТИ ВСЁ ({player.balance.toFixed(2)} TON)
            </Button>

            {!player.hasDeposited && (
              <div className="bg-[var(--retro-purple)]/20 p-3 pixel-border border-[var(--retro-purple)]">
                <p className="text-[8px] text-[var(--retro-yellow)] text-center">
                  ⚠️ Вывод доступен только после пополнения баланса
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="mt-6">
        <Button 
          onClick={() => setScreen('game')}
          className="w-full pixel-border bg-black text-[var(--retro-yellow)] hover:bg-gray-900"
        >
          НАЗАД
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      {screen === 'game' && renderGame()}
      {screen === 'market' && renderMarket()}
      {screen === 'wallet' && renderWallet()}
    </div>
  );
}