import type { DiscussionFeedItem } from "../types/workspace";

export const MOCK_DISCUSSION_FEED: DiscussionFeedItem[] = [
  {
    kind: "thread",
    thread: {
      id: "thread-import-path",
      status: "resolved",
      comments: [
        {
          id: "comment-import-path",
          authorInitials: "FE",
          authorName: "Backend Engineer",
          timestampLabel: "1hr ago",
          body: "The import path for the new header component seems incorrect, should it be absolute?",
          tone: "default",
        },
      ],
    },
  },
  {
    kind: "thread",
    thread: {
      id: "thread-error-handling",
      status: "pending",
      anchor: {
        fileName: "MainEditor.tsx",
        lineNumber: 51,
        snippet: "const data = ...",
      },
      comments: [
        {
          id: "comment-error-handling",
          authorInitials: "BE",
          authorName: "Backend Engineer",
          timestampLabel: "2 mins ago",
          body: "We need to add error handling here. What happens if api.getFile() throws a 404 or a network error?",
          tone: "blocking",
        },
      ],
    },
  },
  {
    kind: "event",
    event: {
      id: "event-joined",
      actorName: "Backend Engineer",
      description: "joined the room",
      timestampLabel: "2 minutes ago",
    },
  },
];

export const DISCUSSION_STATUS_BAR_TYPING_LABEL = "Team Member typing...";
