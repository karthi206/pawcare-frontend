import ErrorState from "@/components/ErrorState";

export default function NotFound() {
  return (
    <ErrorState
      code="404 Error"
      title="Page Not Found"
      message="We couldn't find the page you're looking for. It might have been moved, deleted, or the URL might be mistyped."
    />
  );
}
