import type { LessonBrief, LessonSource } from "@/lib/lesson/types";

export const HTTP_SAMPLE_SOURCES: LessonSource[] = [
  {
    id: "mdn-how-web-works",
    kind: "website",
    title: "How the web works",
    url: "https://developer.mozilla.org/en-US/docs/Learn_web_development/Getting_started/Web_standards/How_the_web_works",
    publisher: "MDN Web Docs",
    relevanceNote:
      "Beginner-friendly explanation of browsers, servers, requests, and responses.",
  },
  {
    id: "mdn-http-methods",
    kind: "website",
    title: "HTTP request methods",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Methods",
    publisher: "MDN Web Docs",
    relevanceNote:
      "Practical reference for GET and POST semantics and their common properties.",
  },
  {
    id: "rfc-9110",
    kind: "website",
    title: "RFC 9110: HTTP Semantics",
    url: "https://www.rfc-editor.org/rfc/rfc9110.html",
    publisher: "RFC Editor / IETF",
    relevanceNote:
      "Primary standards source for method semantics and the meaning of status-code classes.",
  },
  {
    id: "mdn-status-codes",
    kind: "website",
    title: "HTTP response status codes",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status",
    publisher: "MDN Web Docs",
    relevanceNote:
      "Accessible index of status codes with common examples and links to their specifications.",
  },
  {
    id: "oreilly-http-guide",
    kind: "book",
    title: "HTTP: The Definitive Guide",
    url: "https://www.oreilly.com/library/view/http-the-definitive/1565925092/",
    publisher: "David Gourley et al., O’Reilly Media",
    relevanceNote:
      "Foundational background on HTTP messages, methods, and status-code families. Published in 2002, so current protocol details are checked against RFC 9110.",
  },
  {
    id: "traversy-http-crash-course",
    kind: "youtube",
    title: "HTTP Crash Course & Exploration",
    url: "https://www.youtube.com/watch?v=iYM2zFP3Zn0",
    publisher: "Traversy Media",
    relevanceNote:
      "Supplementary visual walkthrough of the request/response cycle, methods, headers, and status codes; use the standards sources for exact definitions.",
  },
];

export function supportsHttpSample(brief: LessonBrief): boolean {
  const normalize = (value: string) =>
    value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const title = normalize(brief.title);
  const objective = normalize(brief.learningObjective);

  return (
    title === "http requests and responses" &&
    ["get", "post", "2xx", "4xx", "5xx"].every((term) =>
      objective.includes(term),
    )
  );
}
