import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IndexedDbService } from '../../data/services/IndexedDbService';
import { Tag } from '../../core/domain/types/Tag';
import { findSimilarTags, ClusterSuggestion } from '../../data/services/TaxonomyClusterService';

const TaxonomyCleaner = () => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [clusters, setClusters] = useState<ClusterSuggestion[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    const loadTags = async () => {
      const db = new IndexedDbService();
      await db.openDatabase();
      const fetched = await db.getTags();
      setTags(fetched);
      setClusters(findSimilarTags(fetched));
    };
    void loadTags();
  }, []);

  const mergeCluster = async (cluster: ClusterSuggestion) => {
    setBusy(cluster.master.Nicename);
    const db = new IndexedDbService();
    await db.openDatabase();

    const posts = await db.getPosts();
    const tagSlug = cluster.master.Nicename || cluster.master.Name;
    const candidateSlugs = cluster.candidates.map((tag) => tag.Nicename || tag.Name);

    const updatedPosts = posts.map((post) => {
      if (!post.TagSlugs) return post;
      const merged = post.TagSlugs.map((slug) =>
        candidateSlugs.includes(slug) ? tagSlug : slug
      );
      const unique = Array.from(new Set(merged));
      return { ...post, TagSlugs: unique };
    });

    await Promise.all(updatedPosts.map((post) => db.updateData('posts', post)));

    const newCounts = new Map<string, number>();
    updatedPosts.forEach((post) => {
      (post.TagSlugs || []).forEach((slug) => {
        newCounts.set(slug, (newCounts.get(slug) || 0) + 1);
      });
    });

    const updatedTags = tags
      .filter((tag) => !candidateSlugs.includes(tag.Nicename || tag.Name))
      .map((tag) => ({
        ...tag,
        PostCount: newCounts.get(tag.Nicename || tag.Name) || 0,
      }));

    await Promise.all(updatedTags.map((tag) => db.updateData('tags', tag)));
    await Promise.all(
      cluster.candidates.map((tag) =>
        db.deleteData('tags', tag.TermId)
      )
    );

    setTags(updatedTags);
    setClusters(findSimilarTags(updatedTags));
    setBusy(null);
  };

  return (
    <div className="taxonomy-cleaner">
      <h2>Smart Taxonomy Merger</h2>
      <p>Detect and merge similar tags with a single click.</p>

      <div className="taxonomy-grid">
        <AnimatePresence>
          {clusters.map((cluster) => (
            <motion.div
              key={cluster.master.TermId}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="taxonomy-card"
            >
              <div>
                <h3>{cluster.master.Name}</h3>
                <p>Master tag • {cluster.master.PostCount || 0} posts</p>
                <p>Similarity ≥ {(cluster.similarity * 100).toFixed(0)}%</p>
              </div>
              <div>
                <strong>Merge candidates</strong>
                <ul>
                  {cluster.candidates.map((tag) => (
                    <li key={tag.TermId}>
                      {tag.Name} ({tag.PostCount || 0})
                    </li>
                  ))}
                </ul>
              </div>
              <button
                className="btn-primary"
                disabled={busy === cluster.master.Nicename}
                onClick={() => mergeCluster(cluster)}
              >
                {busy === cluster.master.Nicename ? 'Merging...' : 'Merge Tags'}
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TaxonomyCleaner;
