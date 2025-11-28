export interface Alarm {
  type: 'HH' | 'H' | 'L' | 'LL';
  level: number;
  message: string;
  severity: 'warning' | 'critical';
  timestamp: Date;
  active: boolean;
}
