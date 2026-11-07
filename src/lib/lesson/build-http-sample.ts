import type { LessonBrief, LessonDraft, LessonSection } from "@/lib/lesson/types";
import { HTTP_SAMPLE_SOURCES } from "@/lib/research/providers/curated-http";

const sections: LessonSection[] = [
  {
    id: "request-response",
    heading: "The request–response exchange",
    purpose: "Trace how a browser asks for a resource and reads a server response.",
    durationMinutes: 5,
    sourceIds: ["mdn-how-web-works", "rfc-9110", "oreilly-http-guide", "traversy-http-crash-course"],
    claims: [
      { id: "http-client-server", text: "HTTP lets clients communicate with servers through requests and responses.", sourceIds: ["mdn-how-web-works", "oreilly-http-guide"] },
      { id: "http-status-result", text: "A response status code describes the outcome of the request.", sourceIds: ["rfc-9110"] },
    ],
    content:
      "HTTP is a message-based protocol that lets a client, such as a browser, communicate with a server. The client sends a request with a method and a target. The server returns a response with a status code and, often, a representation in the response body.\n\nExample: a browser requests /courses with GET. A server might respond with 200 OK and a representation of the course list. The status describes the result; the response body carries the returned content.\n\nQuick prompt: In that exchange, which side sends the request, and which side chooses the response status?",
  },
  {
    id: "get-and-post",
    heading: "GET and POST do different jobs",
    purpose: "Choose GET to retrieve a representation and POST to ask a resource to process submitted content.",
    durationMinutes: 12,
    sourceIds: ["mdn-http-methods", "rfc-9110", "oreilly-http-guide"],
    claims: [
      { id: "http-get-semantics", text: "GET requests a representation and is defined as safe and idempotent.", sourceIds: ["mdn-http-methods", "rfc-9110"] },
      { id: "http-post-semantics", text: "POST asks the target resource to process the submitted representation according to its own semantics.", sourceIds: ["rfc-9110"] },
    ],
    content:
      "GET asks for a representation of the target resource. It is defined as a safe method, meaning its intended effect is read-only, and idempotent, meaning repeating the same request has the same intended effect as making it once. A typical GET request has no request body; use the target URI and query parameters to identify what is being requested.\n\nPOST asks the target resource to process the representation enclosed in the request according to that resource’s own semantics. It often changes server state or causes another side effect, but POST does not simply mean “create”: the resource defines what processing means.\n\nExample: GET /courses?level=beginner requests a course list. POST /enrollments with a course identifier asks the enrollment resource to process a new enrollment.\n\nPair activity: For “show my current profile” and “submit a new enrollment,” choose a method and explain what the server is being asked to do.",
  },
  {
    id: "status-classes",
    heading: "Read the status class first",
    purpose: "Use the first digit to distinguish successful, client-error, and server-error responses.",
    durationMinutes: 10,
    sourceIds: ["rfc-9110", "mdn-status-codes"],
    claims: [
      { id: "http-status-classes", text: "2xx indicate success, 4xx indicate a client error, and 5xx indicate a server error.", sourceIds: ["rfc-9110", "mdn-status-codes"] },
      { id: "http-202-meaning", text: "202 Accepted means processing was accepted but may not be complete.", sourceIds: ["rfc-9110"] },
    ],
    content:
      "The first digit groups HTTP status codes into classes. A 2xx response means the request was successfully received, understood, and accepted; the specific code adds detail. For example, 201 Created indicates that a resource was created, while 204 No Content indicates success with no response content. A 202 Accepted response means processing was accepted but may not be complete.\n\nA 4xx response indicates that the request seems to have a client-side problem or cannot be fulfilled as sent. Examples include 400 Bad Request and 404 Not Found. A 5xx response indicates that the server failed to fulfill an apparently valid request; examples include 500 Internal Server Error and 503 Service Unavailable.\n\nThere is also a 3xx redirection class. The first digit is a useful category, not a complete diagnosis: read the exact code and response details before deciding what to fix.",
  },
  {
    id: "guided-practice",
    heading: "Practice: choose the method and interpret the response",
    purpose: "Apply the method and status-code distinctions to short scenarios.",
    durationMinutes: 8,
    sourceIds: ["mdn-http-methods", "rfc-9110", "mdn-status-codes"],
    claims: [
      { id: "http-scenario-status", text: "A 503 response is a server-error response indicating the server is currently unable to fulfill the request.", sourceIds: ["rfc-9110", "mdn-status-codes"] },
    ],
    content:
      "Work through each scenario and say what the method asks for and what the status class tells you.\n\n1. A browser asks for /courses and receives 200 OK. GET requests a representation, and 2xx reports success.\n2. A client submits an incomplete enrollment request and receives 400 Bad Request. POST submits content for processing; 4xx indicates the request needs attention.\n3. A client submits a valid enrollment and receives 201 Created. POST processing succeeded and a resource was created.\n4. A server is temporarily overloaded and responds with 503 Service Unavailable. 5xx indicates a server-side failure to fulfill the request at that time.\n\nDebrief: status classes help locate the kind of outcome, while the exact code and response content explain more.",
  },
  {
    id: "knowledge-check",
    heading: "Knowledge check and recap",
    purpose: "Check whether learners can explain both methods and classify response outcomes.",
    durationMinutes: 10,
    sourceIds: ["mdn-http-methods", "rfc-9110", "mdn-status-codes"],
    claims: [
      { id: "http-post-not-create", text: "POST does not always create a resource; the target resource defines how it processes the request.", sourceIds: ["rfc-9110"] },
      { id: "http-202-not-finished", text: "202 Accepted does not guarantee that processing is complete.", sourceIds: ["rfc-9110"] },
    ],
    content:
      "Ask learners to answer individually, then compare with a partner.\n\n1. What does GET ask the server to do? Answer: return a representation of the target resource.\n2. Does POST always mean “create a resource”? Answer: no. It asks the target resource to process the submitted representation according to that resource’s semantics; it often causes a state change, but creation is not guaranteed.\n3. What do 2xx, 4xx, and 5xx tell you? Answer: successful response; client-error response; server-error response.\n4. A client receives 202 Accepted. Does that guarantee processing is finished? Answer: no. It indicates acceptance for processing, not necessarily completion.\n\nExit ticket: Write one GET example, one POST example, and one sentence explaining how you would interpret a 4xx response.",
  },
];

export function buildHttpSampleDraft(brief: LessonBrief): LessonDraft {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    generationMethod: "curated",
    brief: { title: brief.title.trim(), learningObjective: brief.learningObjective.trim() },
    targetDurationMinutes: 45,
    sections,
    sources: HTTP_SAMPLE_SOURCES,
    qualityReports: {
      "factual-accuracy": {
        layer: "factual-accuracy",
        status: "pending",
        summary: "Run the factual-accuracy review after the lesson is drafted.",
        findings: [],
      },
      "instructional-quality": {
        layer: "instructional-quality",
        status: "pending",
        summary: "Run the instructional-quality review after the lesson is drafted.",
        findings: [],
      },
    },
    createdAt: now,
    updatedAt: now,
  };
}
