/**
 * FAQ content. Also the source for FAQPage JSON-LD, which is what earns the
 * expandable answers directly in Google results — so every answer here is
 * written to be genuinely self-contained rather than a teaser.
 *
 * Answers are plain strings (not JSX) precisely so they can be reused in
 * structured data without stripping markup.
 */

export interface FaqItem {
  question: string;
  answer: string;
  category: 'Enrolment' | 'Training' | 'Careers' | 'Practical';
}

export const faqs: readonly FaqItem[] = [
  {
    question: 'Do I need any experience to start?',
    answer:
      'No. The Full Barista Course and the Barista Course both assume you have never touched a commercial machine — we start at coffee fundamentals and machine anatomy. If you already work behind a bar and want to add to your range, the Mixology and Boba courses stand on their own. Tell us your level when you enquire and we will place you correctly.',
    category: 'Enrolment',
  },
  {
    question: 'What is the difference between the Full Barista Course and the others?',
    answer:
      'ISLII teaches three disciplines: Barista, Mixology and Boba. You can take any one of them on its own. The Full Barista Course combines all three into a single programme, which is the route most of our students choose — it means you finish able to run an entire drinks menu rather than just the espresso machine.',
    category: 'Enrolment',
  },
  {
    question: 'How much do the courses cost?',
    answer:
      'Fees vary by programme length and intake, and we quote them directly so you get an accurate figure alongside the current schedule rather than an out-of-date number on a page. Call or WhatsApp us on +254 746 487878 and we will send you full fees the same day.',
    category: 'Enrolment',
  },
  {
    question: 'How do I enrol, and how far ahead should I book?',
    answer:
      'Send us an enquiry through the form, WhatsApp or a phone call. We will confirm your level, the next intake date and the fee, then hold your place on deposit. Because classes are capped for machine access, popular intakes fill several weeks ahead — book early rather than close to the start date.',
    category: 'Enrolment',
  },
  {
    question: 'How many students are in a class?',
    answer:
      'Intakes are capped between six and ten depending on the programme. That limit exists for one reason: every student needs sustained hands-on time and direct correction. A class of thirty around one machine is a lecture, not training.',
    category: 'Training',
  },
  {
    question: 'What equipment will I train on?',
    answer:
      'Commercial multi-group espresso machines, on-demand grinders, precision scales, steam pitchers, and a full brew bar covering pour-over and French press. The Mixology and Boba courses add blenders, juicers, shakers and sealing equipment. We deliberately train on the same class of equipment you will meet in a working café.',
    category: 'Training',
  },
  {
    question: 'Do I get a certificate, and is it recognised?',
    answer:
      'Yes. Every programme ends with a practical assessment, and your certificate is awarded on demonstrated competence rather than attendance. Employers in Kenya recognise ISLII graduates because the assessment is practical — it tells a hiring manager what you can actually do on a bar.',
    category: 'Careers',
  },
  {
    question: 'Will this help me get a job?',
    answer:
      'That is what the training is built around. We drill speed, consistency, workflow and composure under pressure, because those are what trials actually test. We also support graduates with CV guidance, interview preparation and introductions to cafés and hotels hiring in Nairobi.',
    category: 'Careers',
  },
  {
    question: 'Can this help me open my own café?',
    answer:
      'Yes — and for that we would strongly recommend the Full Barista Course rather than a single discipline. Opening a café means owning the whole menu, so knowing coffee but not the cold drinks or boba side leaves a real gap. Menu costing and margin are built into the programme, and our trainers are happy to talk through your plans directly.',
    category: 'Careers',
  },
  {
    question: 'What are the class times, and are weekends available?',
    answer:
      'We run weekday intakes from 8:00 AM to 6:00 PM and Saturday sessions from 9:00 AM to 4:00 PM. If you are working full-time, ask about our part-time and weekend schedules when you enquire — we can usually build a route that fits around a job.',
    category: 'Practical',
  },
  {
    question: 'Where exactly are you located?',
    answer:
      'We are based in Nairobi and easily reachable by matatu or ride-hailing. Full directions and a map are on our Contact page, and we are happy to walk you through the route on WhatsApp before your first day.',
    category: 'Practical',
  },
  {
    question: 'Do you offer training for existing café teams?',
    answer:
      'Yes. We run bespoke on-site and in-school training for café, restaurant and hotel teams — covering standardising drink recipes, retraining on new equipment, or lifting service consistency across a group. Get in touch with your team size and goals and we will design the programme around them.',
    category: 'Training',
  },
  {
    question: 'What should I bring on the first day?',
    answer:
      'Closed-toe non-slip shoes, comfortable clothes you do not mind getting coffee on, and a notebook. We supply aprons, cloths, all coffee, milk and ingredients, and every piece of equipment. Come ready to stand up all day — this is a practical trade.',
    category: 'Practical',
  },
] as const;
