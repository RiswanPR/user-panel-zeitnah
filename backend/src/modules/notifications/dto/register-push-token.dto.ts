export class RegisterPushTokenDto {
  deviceId!: string;
  platform?: string; // 'android' | 'ios' | 'web'
  pushToken!: string;
}
