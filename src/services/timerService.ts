/**
 * Serviço de cronômetro para modo tempo
 * Gerencia contagem, pausa e callbacks
 */
export class TimerService {
  private intervalId: number | null = null;
  private timeLeft: number = 0;
  private onTick: ((timeLeft: number) => void) | null = null;
  private onExpire: (() => void) | null = null;

  /**
   * Inicia o cronômetro
   * @param seconds Duração em segundos
   * @param onTick Callback a cada tick (recebe tempo restante)
   * @param onExpire Callback ao chegar a zero
   */
  start(seconds: number, onTick?: (timeLeft: number) => void, onExpire?: () => void): void {
    if (this.intervalId) {
      this.stop();
    }

    this.timeLeft = seconds;
    this.onTick = onTick || null;
    this.onExpire = onExpire || null;

    this.intervalId = setInterval(() => {
      this.timeLeft -= 0.1; // 100ms de precisão

      if (this.onTick) {
        this.onTick(this.timeLeft);
      }

      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.stop();

        if (this.onExpire) {
          this.onExpire();
        }
      }
    }, 100);
  }

  /**
   * Pausa o cronômetro
   */
  pause(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Retoma o cronômetro
   */
  resume(onTick?: (timeLeft: number) => void, onExpire?: () => void): void {
    if (!this.intervalId && this.timeLeft > 0) {
      this.start(this.timeLeft, onTick, onExpire);
    }
  }

  /**
   * Para o cronômetro
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.timeLeft = 0;
  }

  /**
   * Retorna tempo restante
   */
  getTimeLeft(): number {
    return this.timeLeft;
  }

  /**
   * Verifica se cronômetro está rodando
   */
  isRunning(): boolean {
    return this.intervalId !== null;
  }

  /**
   * Reseta para um novo tempo
   */
  reset(seconds: number): void {
    this.stop();
    this.timeLeft = seconds;
  }
}
