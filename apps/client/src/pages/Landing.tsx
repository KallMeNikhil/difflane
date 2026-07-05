import { Link } from "react-router-dom";
import { getButtonClasses, Icon } from "../components/common";
import { ROUTES } from "../constants/routes";

interface FeatureCardData {
  icon: string;
  title: string;
  description: string;
}

const FEATURES: FeatureCardData[] = [
  {
    icon: "sync",
    title: "Real-Time Collaboration",
    description: "Review code together with synchronized editing, scrolling, selections and shared workspace awareness.",
  },
  {
    icon: "group",
    title: "Live Presence",
    description: "See collaborators' live cursors, active selections and review focus in real time.",
  },
  {
    icon: "chat_bubble",
    title: "Inline Review Threads",
    description: "Create contextual discussions attached directly to specific code sections without breaking review flow.",
  },
  {
    icon: "difference",
    title: "Intelligent Diff Comparison",
    description: "Visualize meaningful code changes through clean, readable structural diffs designed for collaborative reviews.",
  },
  {
    icon: "check_circle",
    title: "Comment Resolution",
    description: "Resolve discussions, revisit decisions and maintain an organized review workflow throughout the session.",
  },
  {
    icon: "share",
    title: "Instant Room Sharing",
    description: "Generate secure room codes or shareable links to invite collaborators into a live review session within seconds.",
  },
];

function FeatureCard({ icon, title, description }: FeatureCardData) {
  return (
    <div className="col-span-1 rounded-xl border border-outline-variant/30 bg-surface-container-low/80 backdrop-blur-sm p-xl transition-all duration-300 ease-out hover:-translate-y-2 hover:border-primary/50 hover:bg-surface-container-highest/60 hover:shadow-[0_10px_30px_-10px_rgba(37,99,235,0.4)] group">
      <div className="w-12 h-12 rounded-lg bg-surface-container-highest flex items-center justify-center mb-md border border-outline-variant/50 group-hover:border-primary/40 group-hover:bg-primary/10 transition-all duration-300 ease-out group-hover:-translate-y-0.5 relative overflow-hidden">
        <Icon
          name={icon}
          className="text-primary/80 group-hover:text-primary group-hover:brightness-125 transition-colors duration-300 ease-out relative z-10 drop-shadow-[0_0_8px_rgba(37,99,235,0.5)]"
        />
      </div>
      <h3 className="font-headline-md text-headline-md mb-xs text-on-surface group-hover:text-primary transition-colors duration-300 ease-out">
        {title}
      </h3>
      <p className="font-body-md text-body-md text-on-surface-variant">{description}</p>
    </div>
  );
}

export default function Landing() {
  return (
    <>
      <section className="relative max-w-7xl mx-auto px-lg pt-xl pb-md md:pt-[100px] md:pb-[40px] flex flex-col items-center text-center z-10">
        <div className="absolute top-[30%] left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[#00174b]/60 blur-[140px] rounded-full pointer-events-none -z-10" />

        <h1 className="font-display text-display md:text-[64px] md:leading-[72px] font-bold tracking-tight text-on-surface max-w-4xl mb-margin drop-shadow-md">
          Shared Code Review,
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
            Engineered for Real-time Flow.
          </span>
        </h1>

        <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mb-xl">
          A high-performance workspace for live collaborative sessions. Review code together with synced cursors,
          instant navigation, and unified context.
        </p>

        <div className="flex flex-col sm:flex-row gap-md">
          <Link to={ROUTES.createRoom} className={getButtonClasses("primary", "lg")}>
            <Icon name="add_box" size={20} />
            Create Review Room
          </Link>
          <Link to={ROUTES.joinRoom} className={getButtonClasses("secondary", "lg")}>
            <Icon name="group" size={20} />
            Join Existing Room
          </Link>
        </div>

        <div className="mt-3xl w-full max-w-[500px] rounded-xl border border-outline-variant/30 bg-[#060d20]/90 backdrop-blur-md overflow-hidden font-code text-code text-on-surface-variant text-left shadow-[0_20px_50px_-10px_rgba(0,0,0,0.7),0_0_30px_-5px_rgba(37,99,235,0.15)] transition-transform hover:scale-[1.01] duration-500 ease-out">
          <div className="flex border-b border-outline-variant/20 px-md py-sm bg-[#060d20]/50 gap-2 items-center">
            <div className="w-2.5 h-2.5 rounded-full bg-outline-variant/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-outline-variant/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-outline-variant/60" />
          </div>
          <div className="p-lg text-[13px] leading-relaxed relative">
            <div className="flex">
              <span className="text-primary mr-sm">$</span>
              <span className="text-on-surface">difflane room create --workspace ./project-alpha</span>
            </div>
            <div className="text-outline mt-sm">Initializing collaborative session...</div>
            <div className="text-outline">Synchronizing workspace...</div>
            <div className="text-outline">Loading repository context...</div>
            <div className="text-outline">Review environment ready.</div>
            <div className="text-success-mint mt-sm flex items-center gap-2">
              <Icon name="check" size={14} />
              Shared workspace initialized
            </div>
            <div className="text-success-mint flex items-center gap-2">
              <Icon name="check" size={14} />
              Live collaboration active
            </div>
            <div className="text-success-mint flex items-center gap-2 mb-sm">
              <Icon name="check" size={14} />
              Semantic index synchronized
              <span className="inline-block w-[7px] h-[14px] bg-primary/70 ml-1.5 align-middle animate-smooth-blink" />
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-lg py-2xl relative z-10 mt-[20px]" id="features">
        <div className="text-center mb-xl">
          <h2 className="font-headline-lg text-headline-lg font-bold tracking-tight text-on-surface mb-sm">
            Built for Synchronous Precision
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Experience zero-latency collaboration with tools designed for deep technical understanding.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
          {FEATURES.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </section>
    </>
  );
}
