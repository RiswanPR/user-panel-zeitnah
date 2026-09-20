import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, UserPlus, Check, X, Search, UserCheck } from 'lucide-react';
import { networkApi } from '../../services/networkApi';

export default function NetworkConnections() {
  const queryClient = useQueryClient();
  const [subTab, setSubTab] = useState('people'); // 'people' | 'connections' | 'requests'
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Queries
  const peopleQuery = useQuery({
    queryKey: ['network-people', { q: searchQuery, role: roleFilter }],
    queryFn: () => networkApi.getPeople({ q: searchQuery, role: roleFilter }),
    enabled: subTab === 'people',
  });

  const connectionsQuery = useQuery({
    queryKey: ['network-connections'],
    queryFn: () => networkApi.getConnections(),
    enabled: subTab === 'connections',
  });

  const requestsQuery = useQuery({
    queryKey: ['network-requests'],
    queryFn: () => networkApi.getPendingRequests(),
    enabled: subTab === 'requests',
  });

  // Mutations
  const sendRequestMutation = useMutation({
    mutationFn: (recipientId) => networkApi.sendConnectionRequest(recipientId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['network-people'] });
      queryClient.invalidateQueries({ queryKey: ['network-requests'] });
    },
  });

  const acceptRequestMutation = useMutation({
    mutationFn: (requestId) => networkApi.acceptConnectionRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['network-requests'] });
      queryClient.invalidateQueries({ queryKey: ['network-connections'] });
      queryClient.invalidateQueries({ queryKey: ['network-people'] });
    },
  });

  const removeConnectionMutation = useMutation({
    mutationFn: (connectionId) => networkApi.removeConnection(connectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['network-connections'] });
      queryClient.invalidateQueries({ queryKey: ['network-requests'] });
      queryClient.invalidateQueries({ queryKey: ['network-people'] });
    },
  });

  const people = peopleQuery.data?.people || [];
  const connections = connectionsQuery.data?.connections || [];
  const incomingRequests = requestsQuery.data?.incoming || [];
  const outgoingRequests = requestsQuery.data?.outgoing || [];

  return (
    <div className="space-y-6">
      {/* Sub-tab Navigation */}
      <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          {[
            { id: 'people', label: 'Find People', icon: Search },
            { id: 'connections', label: `Connections (${connectionsQuery.data?.total || 0})`, icon: UserCheck },
            { id: 'requests', label: `Requests (${incomingRequests.length})`, icon: UserPlus },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setSubTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  subTab === tab.id
                    ? 'bg-brand-mint text-black shadow-lg shadow-brand-mint/15'
                    : 'bg-white/[0.03] text-text-muted hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {subTab === 'people' && (
          <div className="flex items-center gap-2">
            {['all', 'student', 'teacher'].map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-colors cursor-pointer ${
                  roleFilter === r
                    ? 'bg-white/10 text-white'
                    : 'text-text-muted hover:text-white'
                }`}
              >
                {r === 'all' ? 'All Roles' : `${r}s`}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── TAB 1: FIND PEOPLE ── */}
      {subTab === 'people' && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search people by name or email..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] focus:border-brand-mint/40 text-xs text-white placeholder-text-muted focus:outline-none transition-colors"
            />
          </div>

          {peopleQuery.isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-28 rounded-2xl bg-white/[0.02] border border-white/[0.04] animate-pulse" />
              ))}
            </div>
          ) : people.length === 0 ? (
            <div className="p-12 rounded-2xl bg-[#111115]/60 border border-white/[0.06] text-center">
              <p className="text-xs text-text-muted">No people found matching your search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {people.map((person) => (
                <div
                  key={person._id}
                  className="p-4 rounded-2xl bg-[#111115]/80 border border-white/[0.06] flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-brand-mint font-bold text-xs shrink-0 overflow-hidden">
                      {person.avatar ? (
                        <img src={person.avatar} alt={person.name} className="w-full h-full object-cover" />
                      ) : (
                        <span>{(person.name || 'U')[0]}</span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-white truncate">{person.name}</h4>
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-white/[0.04] text-text-muted">
                        {person.role}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {person.connectionStatus === 'connected' ? (
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 text-[10px] font-semibold flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        <span>Connected</span>
                      </span>
                    ) : person.connectionStatus === 'pending_sent' ? (
                      <span className="px-2.5 py-1 rounded-lg bg-white/[0.04] text-text-muted text-[10px] font-semibold">
                        Pending
                      </span>
                    ) : person.connectionStatus === 'pending_received' ? (
                      <button
                        onClick={() => acceptRequestMutation.mutate(person.connectionId)}
                        disabled={acceptRequestMutation.isPending}
                        className="px-2.5 py-1 rounded-lg bg-brand-mint text-black font-semibold text-[10px] cursor-pointer"
                      >
                        Accept
                      </button>
                    ) : (
                      <button
                        onClick={() => sendRequestMutation.mutate(person._id)}
                        disabled={sendRequestMutation.isPending}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-brand-mint/15 hover:bg-brand-mint text-brand-mint hover:text-black font-semibold text-xs transition-colors cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Connect</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: MY CONNECTIONS ── */}
      {subTab === 'connections' && (
        <div>
          {connectionsQuery.isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 rounded-2xl bg-white/[0.02] border border-white/[0.04] animate-pulse" />
              ))}
            </div>
          ) : connections.length === 0 ? (
            <div className="p-12 rounded-2xl bg-[#111115]/60 border border-white/[0.06] text-center">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-3 text-text-faint">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-bold text-base text-white">No connections yet</h3>
              <p className="text-xs text-text-muted mt-1">Discover classmates and faculty to build your network.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {connections.map((conn) => {
                const peer = conn.peer;
                return (
                  <div
                    key={conn._id}
                    className="p-4 rounded-2xl bg-[#111115]/80 border border-white/[0.06] flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-brand-mint font-bold text-xs shrink-0 overflow-hidden">
                        {peer.avatar || peer.profileImage ? (
                          <img src={peer.avatar || peer.profileImage} alt={peer.name} className="w-full h-full object-cover" />
                        ) : (
                          <span>{(peer.name || 'U')[0]}</span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white truncate">{peer.name}</h4>
                        <p className="text-[10px] text-text-muted truncate">{peer.email}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => removeConnectionMutation.mutate(conn._id)}
                      className="text-[11px] text-text-muted hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
                      title="Remove connection"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: REQUESTS ── */}
      {subTab === 'requests' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-faint mb-3">
              Incoming Requests ({incomingRequests.length})
            </h3>
            {incomingRequests.length === 0 ? (
              <p className="text-xs text-text-muted">No pending incoming requests.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {incomingRequests.map((req) => (
                  <div
                    key={req._id}
                    className="p-4 rounded-2xl bg-[#111115]/80 border border-white/[0.06] flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-brand-mint/15 text-brand-mint font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden">
                        {req.requesterId?.avatar ? (
                          <img src={req.requesterId.avatar} alt={req.requesterId.name} className="w-full h-full object-cover" />
                        ) : (
                          <span>{(req.requesterId?.name || 'U')[0]}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white truncate">{req.requesterId?.name || 'User'}</h4>
                        <p className="text-[10px] text-text-muted truncate">{req.requesterId?.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => acceptRequestMutation.mutate(req._id)}
                        className="px-3 py-1.5 rounded-xl bg-brand-mint text-black font-bold text-xs cursor-pointer"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => removeConnectionMutation.mutate(req._id)}
                        className="p-1.5 rounded-xl text-text-muted hover:text-red-400 hover:bg-red-500/10 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-faint mb-3">
              Sent Requests ({outgoingRequests.length})
            </h3>
            {outgoingRequests.length === 0 ? (
              <p className="text-xs text-text-muted">No pending outgoing requests.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {outgoingRequests.map((req) => (
                  <div
                    key={req._id}
                    className="p-4 rounded-2xl bg-[#111115]/80 border border-white/[0.06] flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-white/[0.03] text-text-muted font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden">
                        {req.recipientId?.avatar ? (
                          <img src={req.recipientId.avatar} alt={req.recipientId.name} className="w-full h-full object-cover" />
                        ) : (
                          <span>{(req.recipientId?.name || 'U')[0]}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white truncate">{req.recipientId?.name || 'User'}</h4>
                        <p className="text-[10px] text-text-muted truncate">{req.recipientId?.email}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => removeConnectionMutation.mutate(req._id)}
                      className="text-xs text-text-muted hover:text-red-400 px-3 py-1 rounded-lg hover:bg-white/[0.04] cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
