import { useState } from 'react';
import { IndexedDbService } from '../../data/services/IndexedDbService';
import { useToastV2 as useToast } from '../../ui/toast/useToastV2';
import { Post } from '../../core/domain/types/Post';

const CleanupToolsScreenV2 = () => {
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);

  const handleClearAll = async () => {
    setBusy(true);
    try {
      const dbService = new IndexedDbService();
      await dbService.openDatabase();
      await dbService.clearAllData();
      showToast('All data cleared from IndexedDB.', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showToast(`Cleanup failed: ${message}`, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteEmptyPosts = async () => {
    setBusy(true);
    try {
      const dbService = new IndexedDbService();
      await dbService.openDatabase();
      const posts = await dbService.getPosts();
      const emptyPosts = posts.filter(
        (post) => !(post.ContentEncoded || post.CleanedHtmlSource || '').trim()
      );
      await Promise.all(emptyPosts.map((post: Post) => dbService.deleteData('posts', post.PostId)));
      showToast(`Removed ${emptyPosts.length} empty posts/pages.`, 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showToast(`Cleanup failed: ${message}`, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="cleanup-tools">
      <h2>Cleanup Tools</h2>
      <p>Quick actions to keep your local dataset clean and performant.</p>
      <div className="cleanup-actions">
        <button className="btn-secondary" onClick={handleDeleteEmptyPosts} disabled={busy}>
          Remove empty posts/pages
        </button>
        <button className="btn-primary" onClick={handleClearAll} disabled={busy}>
          Clear all data
        </button>
      </div>
    </div>
  );
};

export default CleanupToolsScreenV2;
