import { DiscussionContribution } from '../types';
import { mockUsers, currentUser } from './mockData';

const userAanya = mockUsers.find((u) => u.handle === 'aanyarao') || mockUsers[1];
const userElena = mockUsers.find((u) => u.handle === 'elenapark') || mockUsers[3];
const userPhd = mockUsers.find((u) => u.handle === 'phddiaries') || mockUsers[2];
const userArjun = mockUsers.find((u) => u.handle === 'arjunmehta') || mockUsers[4];

export const mockPaperDiscussions: Record<string, DiscussionContribution[]> = {
  paper_1: [
    {
      id: 'disc_1_1',
      paperId: 'paper_1',
      author: userAanya,
      type: 'insight',
      title: 'Dendritic clustering provides the missing link for localized memory consolidation',
      content:
        'The finding in Figure 2 that spine stabilization requires localized retrograde endocannabinoid signaling is pivotal. It finally bridges the biophysical gap between single-spine LTP and branch-specific dendritic computation. If we cross-reference this with @elenapark recent optogenetic organoid work, it appears that spine clustering serves as the fundamental physical engram unit in mammalian neocortex.',
      mentions: ['elenapark'],
      likesCount: 38,
      isLiked: true,
      repliesCount: 2,
      createdAt: '2h ago',
      replies: [
        {
          id: 'rep_1_1_1',
          discussionId: 'disc_1_1',
          author: userElena,
          content:
            '@aanyarao Exactly! We observed identical localized branch depolarization in our 3D organoid models when stimulating within a 5-micron dendritic segment. Retrograde CB1 receptor blockade completely abolished cluster stability.',
          mentions: ['aanyarao'],
          likesCount: 14,
          isLiked: false,
          createdAt: '1h ago',
        },
        {
          id: 'rep_1_1_2',
          discussionId: 'disc_1_1',
          author: currentUser,
          content:
            'Do you think this localized branch stabilization is conserved during adult visual recovery, or is it strictly confined to the initial critical period closure?',
          mentions: [],
          likesCount: 6,
          isLiked: false,
          createdAt: '30m ago',
        },
      ],
    },
    {
      id: 'disc_1_2',
      paperId: 'paper_1',
      author: userPhd,
      type: 'question',
      title: 'Two-photon motion artifact correction & sample size in deep layer 2/3?',
      content:
        'Looking closely at the Supplementary Methods for the chronic 2-photon imaging: how did the authors account for non-rigid axial brain motion across the 14-day imaging window? Specifically in awake behaving mice during running bouts, z-drift can easily be mistaken for spine retraction if the imaging volume depth is <= 1.5 um. Was volumetric Piezo z-stacking employed for all FOVs?',
      mentions: [],
      likesCount: 24,
      isLiked: false,
      repliesCount: 1,
      createdAt: '5h ago',
      replies: [
        {
          id: 'rep_1_2_1',
          discussionId: 'disc_1_2',
          author: userAanya,
          content:
            '@phddiaries Great question. They mention using resonance scanning with rapid 15-plane piezo stacks (0.75 um step) and an automated 3D Lucas-Kanade affine registration algorithm prior to spine head volumetric segmentation.',
          mentions: ['phddiaries'],
          likesCount: 19,
          isLiked: true,
          createdAt: '3h ago',
        },
      ],
    },
    {
      id: 'disc_1_3',
      paperId: 'paper_1',
      author: userArjun,
      type: 'discussion',
      title: 'Implications for structural plasticity under epigenetic modifiers',
      content:
        'The localized dendritic protein synthesis mechanism identified here suggests that chromatin accessibility at Arc and c-Fos loci must remain permissive well into adulthood. In our lab, HDAC inhibitors significantly enhanced the spine turnover window reported in this paper. It would be valuable to see RNA-seq profiling of these specific stabilized spine micro-domains.',
      mentions: ['sidhantmishra'],
      likesCount: 29,
      isLiked: false,
      repliesCount: 0,
      createdAt: '1d ago',
      replies: [],
    },
    {
      id: 'disc_1_4',
      paperId: 'paper_1',
      author: userElena,
      type: 'methodology',
      title: 'Considerations for pharmacological CB1 antagonist delivery in vivo',
      content:
        'When replicating the retrograde signaling blockade experiments: note that systemic AM251 injection introduces behavioral confounding effects on locomotor exploration. Local micro-infusion via cannula directly above V1 is essential to isolate synaptic remodeling from general visual arousal differences.',
      mentions: [],
      likesCount: 17,
      isLiked: false,
      repliesCount: 0,
      createdAt: '2d ago',
      replies: [],
    },
  ],
  paper_2: [
    {
      id: 'disc_2_1',
      paperId: 'paper_2',
      author: userElena,
      type: 'insight',
      title: 'Unprecedented resolution of non-neuronal diversity in deep subcortical nuclei',
      content:
        'The resolution of 5,322 distinct cell clusters in this mammalian brain atlas is a monumental technical achievement. The identification of regionally distinct oligodendrocyte lineage states in the thalamic reticular nucleus opens up exciting new directions for remyelination therapy.',
      mentions: [],
      likesCount: 45,
      isLiked: true,
      repliesCount: 1,
      createdAt: '3d ago',
      replies: [
        {
          id: 'rep_2_1_1',
          discussionId: 'disc_2_1',
          author: userArjun,
          content:
            '@elenapark Absolutely, and the spatial transcriptomics validation confirms these aren’t just dissociation artifacts.',
          mentions: ['elenapark'],
          likesCount: 12,
          isLiked: false,
          createdAt: '2d ago',
        },
      ],
    },
    {
      id: 'disc_2_2',
      paperId: 'paper_2',
      author: userPhd,
      type: 'question',
      title: 'Doublet filtering thresholding in high-throughput MERFISH sections?',
      content:
        'What cutoff was utilized to distinguish genuine dual-neurotransmitter co-expression from overlapping optical segmentation boundaries in high-density cortical layers?',
      mentions: [],
      likesCount: 15,
      isLiked: false,
      repliesCount: 0,
      createdAt: '4d ago',
      replies: [],
    },
  ],
};
