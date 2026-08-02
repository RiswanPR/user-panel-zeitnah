import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, UserCheck, UserPlus, Search } from 'lucide-react';
import { useFollowers } from '../../../hooks/useFollowers';

export default function FollowersCard({
  userId,
  initialTab = 'followers',
  isOpen,
  onClose,
}) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const { getFollowersList, getFollowingList, toggleFollow, loading } =
    useFollowers();

  useEffect(() => {
    if (!isOpen || !userId) return;

    const loadData = async () => {
      if (activeTab === 'followers') {
        const res = await getFollowersList(userId);
        setList(res.followers || []);
        setTotal(res.total || 0);
      } else {
        const res = await getFollowingList(userId);
        setList(res.following || []);
        setTotal(res.total || 0);
      }
    };

    loadData();
  }, [isOpen, userId, activeTab, getFollowersList, getFollowingList]);

  if (!isOpen) return null;

  const filteredList = list.filter(
    (u) =>
      u.username?.toLowerCase().includes(search.toLowerCase()) ||
      u.headline?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setActiveTab('followers')}
                className={`text-base font-bold transition-colors ${
                  activeTab === 'followers'
                    ? 'text-white border-b-2 border-indigo-500 pb-1'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Followers
              </button>
              <button
                onClick={() => setActiveTab('following')}
                className={`text-base font-bold transition-colors ${
                  activeTab === 'following'
                    ? 'text-white border-b-2 border-indigo-500 pb-1'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Following
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto space-y-3 pr-1">
            {loading ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Loading...
              </div>
            ) : filteredList.length > 0 ? (
              filteredList.map((user) => (
                <div
                  key={user._id || user.userId}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        user.profilePicture ||
                        'https://api.dicebear.com/7.x/bottts/svg?seed=' +
                          user.username
                      }
                      alt={user.username}
                      className="w-10 h-10 rounded-full object-cover border border-slate-800"
                    />
                    <div>
                      <div className="text-xs font-bold text-white">
                        @{user.username}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                        {user.headline || 'Community Member'}
                      </div>
                    </div>
                  </div>

                  <a
                    href={`/community/profile/${user.username}`}
                    className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 px-3 py-1.5 rounded-xl border border-indigo-500/20 transition-all"
                  >
                    View
                  </a>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-slate-500 text-xs">
                No {activeTab} found.
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
