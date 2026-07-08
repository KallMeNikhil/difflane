import { useContext } from "react";
import { RoomContext, type RoomContextValue } from "../contexts/RoomContext";

export function useRoom(): RoomContextValue {
  const context = useContext(RoomContext);
  if (!context) {
    throw new Error("useRoom must be used within a RoomProvider");
  }
  return context;
}
