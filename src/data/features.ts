import {
  UserCheck,
  Hand,
  Globe,
  Cog,
  Briefcase,
  Award,
  Users,
  type LucideIcon,
} from 'lucide-react';

export interface Feature {
  Icon: LucideIcon;
  title: string;
  description: string;
}

/**
 * "Why choose us" — seven reasons, each written as a specific claim rather than
 * a category label. "Professional Trainers" means nothing on its own; who they
 * are and what they've done is the actual reason.
 */
export const features: readonly Feature[] = [
  {
    Icon: UserCheck,
    title: 'Trainers From The Trade',
    description:
      'Every trainer has run a bar commercially — through real rushes, real complaints and real margins. You learn how it is actually done, not how a manual says it should be.',
  },
  {
    Icon: Hand,
    title: 'Hands On The Machine, Daily',
    description:
      'You are on live equipment from day one. No lecture theatres, no waiting your turn behind a crowd. Skill in this trade is built by repetition, so we build in the repetitions.',
  },
  {
    Icon: Globe,
    title: 'International Standards',
    description:
      'Our syllabus follows the extraction science, milk technique and hygiene protocols used in specialty cafés worldwide — so your skills travel as far as your ambition does.',
  },
  {
    Icon: Cog,
    title: 'Commercial Equipment',
    description:
      'Multi-group espresso machines, on-demand grinders, precision scales and full brew-bar kit. The equipment you train on is the equipment you will be hired to operate.',
  },
  {
    Icon: Briefcase,
    title: 'Job-Ready On Day One',
    description:
      'We train for employability: speed, consistency, workflow and composure under pressure. Graduates walk into trials able to hold a station, not just make one nice drink.',
  },
  {
    Icon: Award,
    title: 'Certification That Counts',
    description:
      'Every programme ends in a practical assessment — not an attendance sheet. Your certificate says you were tested, which is the only reason an employer should care about it.',
  },
  {
    Icon: Users,
    title: 'Small Classes, Always',
    description:
      'Intakes are capped so every student gets machine time and direct correction. You cannot learn this craft from the back of a room, so we do not build rooms with a back.',
  },
] as const;
