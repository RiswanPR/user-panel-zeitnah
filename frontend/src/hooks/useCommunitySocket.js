import { useContext } from 'react';
import { CommunitySocketContext } from '../context/CommunitySocketContext';

export const useCommunitySocket = () => {
  const context = useContext(CommunitySocketContext);
  if (context === undefined) {
    throw new Error('useCommunitySocket must be used within a CommunitySocketProvider');
  }
  return context;
};
