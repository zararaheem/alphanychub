// Printable one-pagers. Emergency is built from the live procedures and
// contacts; the others are written here from the Emergency Action Plan (EAP)
// and the Session 2 workshops deck. "todo" items are gaps to fill in.

export type GuideSection = {
  heading: string;
  steps?: string[];
  bullets?: string[];
  text?: string;
  todo?: string;
  tone?: "warn";
};

export type Guide = { slug: string; title: string; kicker: string; intro: string; sections: GuideSection[]; source: string };

export const GUIDE_LIST = [
  { slug: "emergency", title: "Emergency procedures", blurb: "First 60 seconds, every emergency's steps, assembly points and key numbers." },
  { slug: "off-campus", title: "Off campus", blurb: "Before you leave, while you're out, and what to do if something goes wrong." },
  { slug: "workshops", title: "Workshop procedures", blurb: "Running a Session 2 workshop block, on campus or off." },
  { slug: "vendors", title: "Vendors & visitors", blurb: "Access cards, check-in, escorts and deliveries." },
];

export const GUIDES: Record<string, Guide> = {
  "off-campus": {
    slug: "off-campus",
    title: "Off campus",
    kicker: "One-pager",
    intro: "Every trip off campus, from a walk to CrossFit to a shuttle to MoMA.",
    source: "EAP §8 Security Protocol: Off Campus & Other Floors · Session 2 workshops deck",
    sections: [
      {
        heading: "Before you leave",
        bullets: [
          "A designated activity lead (Guide or staff) plus a second adult, minimum",
          "The trip is on the Off-Campus board with lead, security and headcount",
          "Lead carries the student roster and the emergency contact list for every student on the trip",
          "Lead carries a charged phone and a two-way radio (or confirms cell reception)",
          "Agree the off-campus assembly point (nearest safe public space) with all staff before leaving",
          "Take attendance as you leave",
        ],
      },
      {
        heading: "Other floors in the building",
        bullets: [
          "At least one Guide/Alpha staff member and one Guard present",
          "Students move as a group, never unsupervised",
          "If the 6th floor is inaccessible in an emergency, shelter on the nearest floor and radio the Coordinator",
        ],
      },
      {
        heading: "If something goes wrong",
        steps: [
          "Call 911 first if there is immediate danger.",
          "Account for every student using the roster.",
          "Notify the Coordinator by radio or phone as soon as it is safe.",
          "Coordinator notifies parents via ParentSquare.",
          "Don't return to campus until the Coordinator confirms it is safe.",
        ],
        tone: "warn",
      },
      {
        heading: "Session 2 off-campus week",
        bullets: [
          "Mon · L1 (William's) Tennis at HRTC, shuttle 12:30–3:00 · MS halves CrossFit / The Squadron, walk 1:00–3:00",
          "Tue · L1 (Verena's) Tennis at HRTC, shuttle 12:30–3:00 · MS + L2 MoMA (select dates), shuttle 12:00–3:00",
          "Wed · MS halves CrossFit / The Squadron, walk 1:00–3:00 · LL Rock Climbing (Group A) 1:00–3:00",
          "Thu · L2 (all) Tennis at HRTC, shuttle 12:30–3:00 · LL Rock Climbing (Group B) 1:00–3:00",
          "MoMA dates: Oct 27 · Nov 3 · Nov 6 · Nov 17 · Nov 20 · Dec 1 · Dec 8 · Dec 15",
        ],
      },
      {
        heading: "Locations",
        bullets: [
          "HRTC (Hudson River Tennis Club), 300 Vesey St",
          "CrossFit Wall Street, 60 New St",
          "The Squadron, 7 WTC, 10th Floor",
          "MoMA, 11 W 53rd St",
          "LL climbing gym: location TBD",
        ],
      },
    ],
  },

  workshops: {
    slug: "workshops",
    title: "Workshop procedures",
    kicker: "One-pager",
    intro: "Running a Session 2 workshop block (Oct 19 – Dec 18), on campus or off.",
    source: "Session 2 workshops deck · EAP §8 and Appendix A (Ed Law §807 1-a) · Off-Campus board",
    sections: [
      {
        heading: "Every block",
        bullets: [
          "Workshop blocks run 1:00–3:00 (LL 12:30–3:00); check your level's weekly schedule on the Workshops tab",
          "Take attendance at the start of the block",
          "Track progress toward the workshop's AlphaTest (attempts, streaks, scores) from week one",
          "Radio on, Guides on Channel 1, Guards on Channel 2",
        ],
      },
      {
        heading: "Off-campus blocks",
        bullets: [
          "Trip is on the Off-Campus board with a lead, security and kids/adults headcount",
          "The trip shows as cleared before the week starts; fix anything missing that's safety-critical",
          "Follow the Off campus one-pager: roster, emergency contacts, phone, radio, assembly point",
          "Shuttle trips leave at the listed time; MoMA leaves at lunch",
        ],
      },
      {
        heading: "Guests, partners and showcases",
        bullets: [
          "Outside guests on campus are pre-registered, met in the lobby and escorted (see Vendors & visitors)",
          "At any hosted event or showcase with outside guests, the person in charge briefs attendees on emergency procedures at the start (NY Ed Law §807 1-a)",
          "Showcases: MS Dec 9 · L2 + L1 Dec 10 · WL Dec 11 · LL Dinner Theater Night, week of Dec 14",
        ],
      },
      {
        heading: "Your workshop procedures",
        todo: "Add the steps your team agreed at the Mon 10/26 planning workshop (\"Session 2 workshops by procedure\").",
      },
    ],
  },

  vendors: {
    slug: "vendors",
    title: "Vendors & visitors",
    kicker: "One-pager",
    intro: "Anyone who isn't Alpha staff or a student coming onto the 6th floor.",
    source: "EAP §5.3, §6 Door Security & Access Control, §8.3 Building Lobby",
    sections: [
      {
        heading: "Visitors and guests",
        steps: [
          "Pre-register the visit; no unexpected visitors are admitted until identity and purpose are clear.",
          "Meet the guest in the lobby (staff member or guard). No one rides to the 6th floor alone.",
          "Verify identity through the door viewer or intercom before opening.",
          "Issue a visitor badge at check-in and collect it at departure.",
          "Escort the visitor at all times. No unaccompanied floor access.",
          "Report any suspicious visitor or refused entry to the Coordinator immediately.",
        ],
      },
      {
        heading: "Vendor access cards",
        bullets: [
          "Vendors get digital access cards with entry/exit notifications turned on",
          "Every vendor entry and exit notifies the Security Liaison",
          "Card issuance and deactivation is logged by the Security Liaison",
          "Deactivate the card the day the vendor relationship ends",
          "Check vendor card notifications are active each semester",
        ],
      },
      {
        heading: "Deliveries",
        bullets: [
          "Freight elevator deliveries must be pre-authorized with Building Operations",
          "Visitor log is kept daily by the Security Liaison and reviewed weekly by the Coordinator",
        ],
      },
      {
        heading: "Approvals: vendors, waivers, space design",
        todo: "Add the approval steps from the Thu 10/29 planning workshop: who signs off on a new vendor, which waivers are needed, and who to ask.",
      },
    ],
  },
};
