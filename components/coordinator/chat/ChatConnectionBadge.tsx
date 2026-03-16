import { cn } from "@/lib/utils";
import { WifiHigh, WifiSlash } from "@phosphor-icons/react";
import { CoordinatorChatConnectionState } from "@/services/chat/type";

interface ChatConnectionBadgeProps {
  state: CoordinatorChatConnectionState;
}

const LABEL_BY_STATE: Record<CoordinatorChatConnectionState, string> = {
  connected: "Connected",
  connecting: "Connecting",
  reconnecting: "Reconnecting",
  disconnected: "Disconnected",
};

export default function ChatConnectionBadge({
  state,
}: ChatConnectionBadgeProps) {
  const isConnected = state === "connected";

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium",
        isConnected
          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
          : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      )}
    >
      {isConnected ? (
        <WifiHigh className="h-3 w-3" weight="bold" />
      ) : (
        <WifiSlash className="h-3 w-3" weight="bold" />
      )}
      <span>{LABEL_BY_STATE[state]}</span>
    </div>
  );
}
