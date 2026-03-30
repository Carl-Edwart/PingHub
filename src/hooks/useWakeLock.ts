import { useEffect } from 'react';
import * as KeepAwake from 'expo-keep-awake';

/**
 * Hook para manter a tela ligada durante partida ativa
 * Ativa ao montar, desativa ao desmontar
 */
export function useWakeLock(enabled: boolean = true): void {
  useEffect(() => {
    if (!enabled) return;

    let tagName = 'PingProMatch';

    const activate = async () => {
      try {
        await KeepAwake.activateKeepAwakeAsync(tagName);
        console.log('✅ Wake lock activated');
      } catch (error) {
        console.error('❌ Failed to activate wake lock:', error);
      }
    };

    const deactivate = async () => {
      try {
        await KeepAwake.deactivateKeepAwake(tagName);
        console.log('✅ Wake lock deactivated');
      } catch (error) {
        console.error('❌ Failed to deactivate wake lock:', error);
      }
    };

    activate();

    return () => {
      deactivate();
    };
  }, [enabled]);
}
