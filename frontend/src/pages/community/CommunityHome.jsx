import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Composer from '../../components/community/Composer';
import PostCard from '../../components/community/PostCard';
import StoryViewer from '../../components/community/StoryViewer';

const MOCK_STORIES = [
  { id: 1, author: { name: 'Sarah Designer', avatar: 'https://i.pravatar.cc/150?img=5' }, text: 'Finished the UI design course! The Glassmorphism chapter was incredible. 🎨', bg: 'bg-gradient-to-br from-purple-900 to-indigo-600' },
  { id: 2, author: { name: 'Alex Developer', avatar: 'https://i.pravatar.cc/150?img=12' }, text: 'Anyone want to pair program on the advanced React assignment tonight?', bg: 'bg-gradient-to-br from-brand-navy to-brand-mint/40' },
  { id: 3, author: { name: 'Instructor John', avatar: 'https://i.pravatar.cc/150?img=68' }, text: 'New Office Hours scheduled for Friday 2 PM. Bring your questions!', bg: 'bg-gradient-to-br from-gray-900 to-gray-700' },
];

export default function CommunityHome() {
  const [activeStoryIndex, setActiveStoryIndex] = useState(null);

  // Fetch feed (mocked for now)
  const { data: posts, isLoading } = useQuery({
    queryKey: ['community', 'feed'],
    queryFn: async () => {
      // Mock data representing the Feed
      return [
        {
          id: 1,
          author: { name: 'Alex Developer', role: 'Mentor', avatar: 'https://i.pravatar.cc/150?img=12' },
          content: 'Just released a new lecture on Server Actions in Next.js 14! This completely changes how we handle data mutations without needing dedicated API routes. Check it out in the course module. 🚀',
          createdAt: new Date(),
          stats: { likes: 24, comments: 8, shares: 2 },
          tags: ['NextJS', 'Course Update'],
        },
        {
          id: 2,
          author: { name: 'Sarah Designer', role: 'Student', avatar: 'https://i.pravatar.cc/150?img=5' },
          content: 'Finally finished my capstone project! The Framer Motion animations took a while to get right, but it feels so smooth now. Any feedback is welcome!',
          createdAt: new Date(Date.now() - 3600000),
          stats: { likes: 15, comments: 3, shares: 0 },
          tags: ['FramerMotion', 'Design'],
          hasMedia: true,
        }
      ];
    }
  });

  return (
    <div className="space-y-6">
      
      {activeStoryIndex !== null && (
        <StoryViewer 
          stories={MOCK_STORIES} 
          initialIndex={activeStoryIndex} 
          onClose={() => setActiveStoryIndex(null)} 
        />
      )}

      {/* ── Learning Highlights (Stories) Strip ── */}
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide px-1 snap-x">
        <div className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group snap-start">
          <div className="w-16 h-16 rounded-full border-2 border-dashed border-text-faint flex items-center justify-center bg-white/[0.02] group-hover:bg-white/[0.04] transition-colors shadow-sm">
            <span className="text-2xl text-text-muted font-light group-hover:text-brand-mint transition-colors">+</span>
          </div>
          <span className="text-[10px] font-semibold text-text-muted group-hover:text-white transition-colors">Create</span>
        </div>
        {MOCK_STORIES.map((story, idx) => (
          <div 
            key={story.id} 
            onClick={() => setActiveStoryIndex(idx)}
            className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group snap-start"
          >
            <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-brand-yellow to-brand-mint group-hover:scale-105 transition-transform">
              <div className="w-full h-full rounded-full bg-bg-surface border-2 border-bg-base overflow-hidden">
                <img src={story.author.avatar} alt="Avatar" className="w-full h-full object-cover" />
              </div>
            </div>
            <span className="text-[10px] font-semibold text-white">{story.author.name.split(' ')[0]}</span>
          </div>
        ))}
      </div>

      {/* ── Composer ── */}
      <Composer />

      {/* ── Feed ── */}
      <div className="space-y-4">
        {isLoading ? (
          // Skeleton loading
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-card p-5 h-48 shimmer" />
          ))
        ) : (
          posts?.map((post) => (
            <PostCard key={post.id} post={post} />
          ))
        )}
      </div>
      
    </div>
  );
}

