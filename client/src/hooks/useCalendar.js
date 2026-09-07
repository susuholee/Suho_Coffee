import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

export default function useCalendar() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['calendarEvents'],
    queryFn: async () => (await axios.get('/api/calendar/events')).data,
    staleTime: 10000,
    refetchInterval: 15000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });
  const syncMutation = useMutation({
    mutationFn: async () => (await axios.post('/api/calendar/sync')).data,
    onSuccess: data => queryClient.setQueryData(['calendarEvents'], data),
    onError: error => {
      if (error.response?.data?.sync) queryClient.setQueryData(['calendarEvents'], error.response.data);
    },
  });
  return { ...query, syncMutation };
}
