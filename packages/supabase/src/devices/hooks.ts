import { useMutation } from '@tanstack/react-query';
import { getSupabaseClient } from '../client/createClient';
import { registerDevice, type Device, type RegisterDeviceInput } from './queries';

export function useRegisterDevice() {
  const client = getSupabaseClient();
  return useMutation<Device, Error, RegisterDeviceInput>({
    mutationFn: (input: RegisterDeviceInput) => registerDevice(client, input),
  });
}
