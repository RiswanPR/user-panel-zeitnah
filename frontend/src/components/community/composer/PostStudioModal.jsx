import CreatePostModal from './CreatePostModal';

/**
 * PostStudioModal — Dedicated Post Studio shell for Zeitnah Community:
 * Wraps the full multi-step publishing experience for text, images, carousels, and polls.
 * Establishes the clean foundation for Post Studio Phase 2 improvements while preserving
 * existing production-tested post creation capabilities.
 */
export default function PostStudioModal(props) {
  return <CreatePostModal {...props} />;
}
