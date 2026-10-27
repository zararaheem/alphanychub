// Printable one-pagers. Emergency is built from the live procedures and
// contacts; the others are written here from the Emergency Action Plan (EAP)
// and the Session 2 workshops deck. "todo" items are gaps to fill in.

import { SHOWCASES } from "@/lib/session2";

export type GuideSection = {
  heading: string;
  steps?: string[];
  bullets?: string[];
  text?: string;
  table?: { head: string[]; rows: string[][] };
  todo?: string;
  tone?: "warn";
};

export type Guide = { slug: string; title: string; kicker: string; intro: string; sections: GuideSection[]; source: string };

export const GUIDE_LIST = [
  { slug: "emergency", title: "Emergency procedures", blurb: "First 60 seconds, every emergency's steps, assembly points and key numbers." },
  { slug: "off-campus", title: "Off campus", blurb: "Before you leave, while you're out, and what to do if something goes wrong." },
  { slug: "workshops", title: "Workshop procedures", blurb: "Running a Session 2 workshop block, on campus or off." },
  { slug: "vendors", title: "Vendors & visitors", blurb: "Approvals for money and contracts, access cards, check-in, escorts and deliveries." },
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
          "Transport (shuttle, bus, car) is requested in the Transport request tool, for Maiden Ln and Early Years",
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
        table: {
          head: ["Day", "Group", "Where", "Time", "Travel"],
          rows: [
            ["Mon", "L1 (William's)", "Tennis, HRTC", "12:30–3:00", "Shuttle"],
            ["Mon", "MS (halves)", "CrossFit / The Squadron", "1:00–3:00", "Walk"],
            ["Tue", "L1 (Verena's)", "Tennis, HRTC", "12:30–3:00", "Shuttle"],
            ["Tue", "MS + L2", "MoMA (select dates)", "12:00–3:00", "Shuttle"],
            ["Wed", "MS (halves)", "CrossFit / The Squadron", "1:00–3:00", "Walk"],
            ["Wed", "LL Group A", "Rock climbing", "1:00–3:00", "TBD"],
            ["Thu", "L2 (all)", "Tennis, HRTC", "12:30–3:00", "Shuttle"],
            ["Thu", "LL Group B", "Rock climbing", "1:00–3:00", "TBD"],
          ],
        },
        text: "MoMA dates: Oct 27, Nov 3, Nov 6, Nov 17, Nov 20, Dec 1, Dec 8, Dec 15",
      },
      {
        heading: "Locations",
        table: {
          head: ["Place", "Address"],
          rows: [
            ["Hudson River Tennis Club (HRTC)", "300 Vesey St"],
            ["CrossFit Wall Street", "60 New St"],
            ["The Squadron", "7 WTC, 10th Floor"],
            ["MoMA", "11 W 53rd St"],
            ["LL climbing gym", "TBD"],
          ],
        },
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
          "Programmed radio on and with you (alt: Zello)",
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
        ],
      },
      {
        heading: "Showcases",
        text: "* Proposed time",
        table: {
          head: ["Date", "Level", "Time"],
          rows: SHOWCASES.map((s) => [s.date, s.levels, s.time.replace(" (proposed)", "*")]),
        },
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
        heading: "Approvals: money and contracts",
        tone: "warn",
        steps: [
          "Anything that involves money changing hands or a contract to sign: run it by the team first.",
          "Zara coordinates with Legal so everything is squared away before anyone signs or pays.",
          "Don't sign, commit or pay a vendor until you have the go-ahead.",
        ],
      },
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
    ],
  },
};
