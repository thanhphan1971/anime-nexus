export function getNextFriday(fromDate: Date = new Date()): Date {
  const result = new Date(fromDate);
  const dayOfWeek = result.getDay();
  const daysUntilFriday = dayOfWeek <= 5 ? (5 - dayOfWeek) : (5 + 7 - dayOfWeek);
  
  if (daysUntilFriday === 0) {
    const currentHour = result.getHours();
    if (currentHour >= 19) {
      result.setDate(result.getDate() + 7);
    }
  } else {
    result.setDate(result.getDate() + daysUntilFriday);
  }
  
  result.setHours(19, 0, 0, 0);
  return result;
}

export function getLastFridayOfMonth(year: number, month: number): Date {
  const lastDay = new Date(year, month + 1, 0);
  const dayOfWeek = lastDay.getDay();
  const daysToSubtract = dayOfWeek >= 5 ? dayOfWeek - 5 : dayOfWeek + 2;
  const lastFriday = new Date(lastDay);
  lastFriday.setDate(lastDay.getDate() - daysToSubtract);
  lastFriday.setHours(19, 0, 0, 0);
  return lastFriday;
}

export function getNextMonthlyDrawDate(fromDate: Date = new Date()): Date {
  const year = fromDate.getFullYear();
  const month = fromDate.getMonth();
  
  let lastFriday = getLastFridayOfMonth(year, month);
  
  if (fromDate >= lastFriday) {
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    lastFriday = getLastFridayOfMonth(nextYear, nextMonth);
  }
  
  return lastFriday;
}

export function generateWeeklyCycleId(drawDate: Date): string {
  const year = drawDate.getFullYear();
  const month = String(drawDate.getMonth() + 1).padStart(2, '0');
  const day = String(drawDate.getDate()).padStart(2, '0');
  return `weekly-${year}-${month}-${day}`;
}

export function generateMonthlyCycleId(drawDate: Date): string {
  const year = drawDate.getFullYear();
  const month = String(drawDate.getMonth() + 1).padStart(2, '0');
  return `monthly-${year}-${month}`;
}

export function getDrawOpenTime(drawTime: Date): Date {
  const openTime = new Date(drawTime);
  openTime.setDate(openTime.getDate() - 7);
  openTime.setHours(19, 0, 0, 0);
  return openTime;
}

export function getDrawLockTime(drawTime: Date): Date {
  const lockTime = new Date(drawTime);
  lockTime.setMinutes(lockTime.getMinutes() - 1);
  return lockTime;
}

export function getCooldownEndTime(executedAt: Date): Date {
  const cooldownEnd = new Date(executedAt);
  cooldownEnd.setHours(cooldownEnd.getHours() + 24);
  return cooldownEnd;
}

export type DrawButtonState = 
  | 'cooldown'
  | 'open'
  | 'entered'
  | 'max_entries'
  | 'locked'
  | 'next_cycle';

export interface DrawCycleStatus {
  buttonState: DrawButtonState;
  cooldownEndTime?: Date;
  lockTime: Date;
  drawTime: Date;
  nextCycleOpenTime?: Date;
  isLocked: boolean;
  isExecuted: boolean;
}

export function getDrawCycleStatus(
  draw: {
    status: string;
    drawAt: Date;
    executedAt?: Date | null;
  },
  userEntryCount: number,
  maxEntries: number,
  previousDrawExecutedAt?: Date | null
): DrawCycleStatus {
  const now = new Date();
  const drawTime = new Date(draw.drawAt);
  const lockTime = getDrawLockTime(drawTime);
  
  const isLocked = draw.status === 'locked' || now >= lockTime;
  const isExecuted = draw.status === 'executed' || draw.status === 'completed';
  
  let buttonState: DrawButtonState;
  let cooldownEndTime: Date | undefined;
  let nextCycleOpenTime: Date | undefined;
  
  if (isExecuted) {
    const executedTime = draw.executedAt ? new Date(draw.executedAt) : drawTime;
    cooldownEndTime = getCooldownEndTime(executedTime);
    
    if (now < cooldownEndTime) {
      buttonState = 'cooldown';
    } else {
      buttonState = 'next_cycle';
      nextCycleOpenTime = cooldownEndTime;
    }
  } else if (isLocked) {
    buttonState = 'locked';
  } else if (previousDrawExecutedAt) {
    cooldownEndTime = getCooldownEndTime(new Date(previousDrawExecutedAt));
    if (now < cooldownEndTime) {
      buttonState = 'cooldown';
    } else if (userEntryCount > 0) {
      if (userEntryCount >= maxEntries) {
        buttonState = 'max_entries';
      } else {
        buttonState = 'entered';
      }
    } else {
      buttonState = 'open';
    }
  } else if (userEntryCount > 0) {
    if (userEntryCount >= maxEntries) {
      buttonState = 'max_entries';
    } else {
      buttonState = 'entered';
    }
  } else {
    buttonState = 'open';
  }
  
  return {
    buttonState,
    cooldownEndTime,
    lockTime,
    drawTime,
    nextCycleOpenTime,
    isLocked,
    isExecuted,
  };
}
