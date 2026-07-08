import { Link } from "react-router-dom";
import { Icon } from "../components/common";
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
    title: "Discussion Threads",
    description: "Create contextual discussions attached directly to specific code sections without breaking review flow.",
  },
  {
    icon: "difference",
    title: "Code Comparison",
    description: "Visualize meaningful code changes through clean, readable structural diffs designed for collaborative reviews.",
  },
  {
    icon: "check_circle",
    title: "Session Tracking",
    description: "Resolve discussions, revisit decisions and maintain an organized review workflow throughout the session.",
  },
  {
    icon: "share",
    title: "Workspace Sharing",
    description: "Generate secure room codes or shareable links to invite collaborators into a live review session within seconds.",
  },
];

function FeatureCard({ icon, title, description }: FeatureCardData) {
  return (
    <div className="col-span-1 rounded-xl border border-white/5 bg-[#0E1117] p-xl transition-all duration-300 ease-out hover:-translate-y-1 hover:border-white/10 hover:bg-[#161b22] hover:shadow-xl hover:shadow-black/50 group">
      <div className="w-12 h-12 rounded-lg bg-[#161b22] flex items-center justify-center mb-md border border-white/5 group-hover:border-white/10 transition-all duration-300 ease-out relative overflow-hidden">
        <Icon
          name={icon}
          className="text-gray-400 group-hover:text-gray-200 transition-colors duration-300 ease-out relative z-10"
        />
      </div>
      <h3 className="font-headline-md text-headline-md mb-xs text-gray-100 group-hover:text-white transition-colors duration-300 ease-out">
        {title}
      </h3>
      <p className="font-body-md text-body-md text-gray-400">{description}</p>
    </div>
  );
}

export default function Landing() {
  return (
    <>
      <section className="relative max-w-7xl mx-auto px-lg pt-xl pb-md md:pt-[16px] md:pb-[40px] flex flex-col items-center text-center z-10">
        <h1 className="font-display text-[40px] md:text-[56px] leading-tight md:leading-[1.1] font-bold tracking-normal text-white max-w-4xl mb-margin drop-shadow-sm">
          Built for Engineering in Sync.
        </h1>

        <p className="font-body-lg text-xl text-gray-400 max-w-2xl mb-xl">
          A high-performance workspace for live collaborative sessions. Review code together with synced cursors,
          instant navigation, and unified context.
        </p>

        <div className="flex flex-col sm:flex-row gap-md">
          <Link
            to={ROUTES.createRoom}
            className="font-label-md text-label-md px-xl py-md rounded-lg bg-primary-container text-white hover:brightness-110 shadow-md shadow-primary-container/20 hover:-translate-y-0.5 transition-all duration-300 ease-out"
          >
            Create Workspace
          </Link>
          <Link
            to={ROUTES.joinRoom}
            className="font-label-md text-label-md px-xl py-md rounded-lg border border-white/10 text-gray-300 hover:bg-white/5 hover:text-white hover:-translate-y-0.5 transition-all duration-300 ease-out flex items-center justify-center gap-sm"
          >
            <Icon name="group" size={20} />
            Join Workspace
          </Link>
        </div>

        {}
        <div className="mt-xl translate-y-6 z-20 max-w-[440px] rounded-xl border border-white/10 bg-[#0E1117] overflow-hidden font-code text-code text-gray-400 text-left shadow-2xl shadow-black/80 transition-transform hover:scale-[1.01] duration-500 ease-out">
          <div className="flex border-b border-white/5 px-md py-sm bg-[#161b22] gap-2 items-center">
            <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
            <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
            <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
          </div>
          <div className="p-lg text-[13px] leading-relaxed relative">
            <div className="flex">
              <span className="text-primary mr-sm">$</span>
              <span className="text-gray-200">difflane create --workspace ./project</span>
            </div>
            <div className="text-gray-500 mt-sm">Initializing Collaborative Session...</div>
            <div className="text-gray-500">Synchronizing Workspace...</div>
            <div className="text-gray-500">Loading Repository Context...</div>
            <div className="text-gray-500">Code Environment Ready</div>
            <div className="text-success-mint mt-sm flex items-center gap-2">
              <Icon name="check" size={14} />
              Shared Workspace Initialized
            </div>
            <div className="text-success-mint flex items-center gap-2">
              <Icon name="check" size={14} />
              Live Collaboration Active
            </div>
            <div className="text-success-mint flex items-center gap-2 mb-sm">
              <Icon name="check" size={14} />
              Semantic Index Synchronized
              <span className="inline-block w-[7px] h-[14px] bg-primary/70 ml-1.5 align-middle animate-smooth-blink" />
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-lg py-2xl relative z-10" id="features">
        <div className="text-center mb-xl">
          <h2 className="font-headline-lg text-headline-lg font-bold tracking-tight text-white mb-sm">
            Built for Synchronous Precision
          </h2>
          <p className="font-body-md text-body-md text-gray-400">
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
